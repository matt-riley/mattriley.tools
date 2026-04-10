import { describe, expect, it } from "vitest";

import {
  buildGitHubHeaders,
  extractGitHubRepository,
  filterPublicToolsByRepository,
  fetchGitHubReadme,
  formatGitHubApiError,
} from "../scripts/generate-tools-data.mjs";

describe("generate tools data GitHub helpers", () => {
  it("adds the configured GitHub API version header", () => {
    expect(buildGitHubHeaders()).toMatchObject({
      Accept: "application/vnd.github+json",
      "User-Agent": "mattriley.tools data generator",
      "X-GitHub-Api-Version": "2022-11-28",
    });
  });

  it("includes an authorization header when a token is provided", () => {
    expect(buildGitHubHeaders("test-token")).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });

  it("includes the response body message in GitHub API errors", () => {
    expect(
      formatGitHubApiError(403, "Forbidden", {
        message: "API rate limit exceeded",
      }),
    ).toBe(
      "GitHub repo fetch failed: 403 Forbidden - API rate limit exceeded. Set GITHUB_TOKEN or GH_TOKEN to avoid low unauthenticated rate limits.",
    );
  });

  it("extracts owner and repo from a GitHub repository url", () => {
    expect(extractGitHubRepository("https://github.com/matt-riley/newbrew")).toEqual({
      owner: "matt-riley",
      repo: "newbrew",
    });
    expect(extractGitHubRepository("https://github.com/matt-riley/newbrew/issues")).toBeNull();
    expect(extractGitHubRepository("https://example.com/matt-riley/newbrew")).toBeNull();
  });

  it("filters out tools backed by private GitHub repositories", async () => {
    const tools = [
      {
        slug: "public-tool",
        homepage: "https://github.com/matt-riley/newbrew",
      },
      {
        slug: "private-tool",
        homepage: "https://github.com/matt-riley/workv2",
      },
      {
        slug: "external-tool",
        homepage: "https://example.com/tools/external-tool",
      },
    ];

    await expect(
      filterPublicToolsByRepository(tools, {
        fetchRepositoryVisibility: async (_owner: string, repo: string) => ({
          isPublic: repo !== "workv2",
        }),
      }),
    ).resolves.toEqual([
      {
        slug: "public-tool",
        homepage: "https://github.com/matt-riley/newbrew",
      },
      {
        slug: "external-tool",
        homepage: "https://example.com/tools/external-tool",
      },
    ]);
  });

  it("filters out tools backed by archived GitHub repositories", async () => {
    const tools = [
      {
        slug: "active-tool",
        homepage: "https://github.com/matt-riley/newbrew",
      },
      {
        slug: "archived-tool",
        homepage: "https://github.com/matt-riley/gql_boilerplate",
      },
    ];

    await expect(
      filterPublicToolsByRepository(tools, {
        fetchRepositoryVisibility: async (_owner: string, repo: string) => ({
          isPublic: true,
          isArchived: repo === "gql_boilerplate",
        }),
      }),
    ).resolves.toEqual([
      {
        slug: "active-tool",
        homepage: "https://github.com/matt-riley/newbrew",
      },
    ]);
  });

  it("decodes README metadata from the GitHub readme endpoint", async () => {
    const originalFetch = globalThis.fetch;
    const seenHeaders: unknown[] = [];

    globalThis.fetch = async (_input, init) => {
      seenHeaders.push(init?.headers);

      return new Response(
        JSON.stringify({
          content: "IyBIZWxsbyBmcm9tIFJFQURNRQo=",
          encoding: "base64",
          html_url: "https://github.com/matt-riley/newbrew/blob/main/README.md",
          download_url:
            "https://raw.githubusercontent.com/matt-riley/newbrew/main/README.md?token=secret",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };

    await expect(fetchGitHubReadme("matt-riley", "newbrew", "tool-token")).resolves.toEqual({
      markdown: "# Hello from README\n",
      htmlUrl: "https://github.com/matt-riley/newbrew/blob/main/README.md",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/newbrew/main/README.md",
      images: [],
    });
    expect(seenHeaders).toContainEqual(
      expect.objectContaining({
        Authorization: "Bearer tool-token",
      }),
    );

    globalThis.fetch = originalFetch;
  });

  it("mirrors README images and returns their metadata", async () => {
    const originalFetch = globalThis.fetch;
    const outputDir = "test-artifacts/generator-readme-images";
    const writes: Array<{ outputPath: string; bytes: Uint8Array }> = [];

    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.endsWith("/readme")) {
        return new Response(
          JSON.stringify({
            content: "IVtMb2dvXShpbWFnZXMvbG9nby5wbmcpCg==",
            encoding: "base64",
            html_url: "https://github.com/matt-riley/newbrew/blob/main/README.md",
            download_url: "https://raw.githubusercontent.com/matt-riley/newbrew/main/README.md",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url === "https://raw.githubusercontent.com/matt-riley/newbrew/main/images/logo.png") {
        return new Response("image-bytes", { status: 200 });
      }

      return new Response("not found", { status: 404 });
    };

    const readme = await fetchGitHubReadme("matt-riley", "newbrew", "tool-token", {
      outputDir,
      writeAssetImpl: async (outputPath: string, bytes: Uint8Array) => {
        writes.push({ outputPath, bytes });
      },
    });

    expect(readme.images).toEqual([
      {
        source: "https://raw.githubusercontent.com/matt-riley/newbrew/main/images/logo.png",
        mirroredPath: expect.stringMatching(
          /^\/generated\/readme-images\/matt-riley\/newbrew\/[a-f0-9]{64}\.png$/,
        ),
      },
    ]);
    expect(writes).toEqual([
      {
        outputPath: expect.stringMatching(
          /^test-artifacts\/generator-readme-images\/matt-riley\/newbrew\/[a-f0-9]{64}\.png$/,
        ),
        bytes: expect.any(Uint8Array),
      },
    ]);
    globalThis.fetch = originalFetch;
  });

  it("keeps the README payload when mirroring an image throws", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input) => {
      const url = String(input);

      if (url.endsWith("/readme")) {
        return new Response(
          JSON.stringify({
            content: "IVtMb2dvXShpbWFnZXMvbG9nby5wbmcpCg==",
            encoding: "base64",
            html_url: "https://github.com/matt-riley/newbrew/blob/main/README.md",
            download_url: "https://raw.githubusercontent.com/matt-riley/newbrew/main/README.md",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      throw new Error("network reset");
    };

    await expect(fetchGitHubReadme("matt-riley", "newbrew", "tool-token")).resolves.toEqual({
      markdown: "![Logo](images/logo.png)\n",
      htmlUrl: "https://github.com/matt-riley/newbrew/blob/main/README.md",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/newbrew/main/README.md",
      images: [
        {
          source: "https://raw.githubusercontent.com/matt-riley/newbrew/main/images/logo.png",
          mirroredPath: null,
        },
      ],
    });

    globalThis.fetch = originalFetch;
  });

  it("returns an unavailable README payload when GitHub reports no readme", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Not Found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    await expect(fetchGitHubReadme("matt-riley", "newbrew")).resolves.toEqual({
      markdown: null,
      htmlUrl: null,
      downloadUrl: null,
      images: [],
    });

    globalThis.fetch = originalFetch;
  });
});
