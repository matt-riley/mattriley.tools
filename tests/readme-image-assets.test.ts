import { describe, expect, it } from "vitest";

import { resolveReadmeImageRefs, syncReadmeImages } from "../scripts/readme-image-assets.mjs";

describe("resolveReadmeImageRefs", () => {
  it("collects absolute image urls from markdown", () => {
    expect(
      resolveReadmeImageRefs({
        markdown:
          '![Logo](images/logo.png)\n\n<img src="images/banner.png" alt="Banner">\n\n![Remote](https://cdn.example/logo.png)',
        downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      }),
    ).toEqual([
      "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
      "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/banner.png",
      "https://cdn.example/logo.png",
    ]);
  });
});

describe("syncReadmeImages", () => {
  it("records a null mirrored path when a download fails", async () => {
    const imageRecords = await syncReadmeImages({
      owner: "matt-riley",
      repo: "slides.nvim",
      markdown: "![Logo](images/logo.png)",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      outputDir: "test-artifacts/readme-images",
      fetchImpl: async () => new Response("blocked", { status: 403 }),
    });

    expect(imageRecords).toEqual([
      {
        source: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
        mirroredPath: null,
      },
    ]);
  });

  it("records a null mirrored path when an image download throws", async () => {
    const imageRecords = await syncReadmeImages({
      owner: "matt-riley",
      repo: "slides.nvim",
      markdown: "![Logo](images/logo.png)",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      outputDir: "test-artifacts/readme-images",
      fetchImpl: async () => {
        throw new Error("socket hang up");
      },
    });

    expect(imageRecords).toEqual([
      {
        source: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
        mirroredPath: null,
      },
    ]);
  });
});
