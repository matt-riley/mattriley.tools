import { describe, expect, it } from "vitest";

import {
  buildGitHubHeaders,
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
});
