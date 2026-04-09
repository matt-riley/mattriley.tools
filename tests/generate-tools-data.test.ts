import { describe, expect, it } from "vitest";

import {
  buildGitHubHeaders,
  extractGitHubRepository,
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
    });
    expect(seenHeaders).toContainEqual(
      expect.objectContaining({
        Authorization: "Bearer tool-token",
      }),
    );

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
    });

    globalThis.fetch = originalFetch;
  });
});
