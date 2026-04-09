import { describe, expect, it } from "vitest";

import { resolveReadmeImageRefs } from "../scripts/readme-image-assets.mjs";

describe("resolveReadmeImageRefs", () => {
  it("collects absolute image urls from markdown", () => {
    expect(
      resolveReadmeImageRefs({
        markdown: "![Logo](images/logo.png)\n\n![Remote](https://cdn.example/logo.png)",
        downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      }),
    ).toEqual([
      "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
      "https://cdn.example/logo.png",
    ]);
  });
});
