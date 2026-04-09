import { describe, expect, it } from "vitest";

import { renderReadme } from "../src/utils/readme";

describe("renderReadme", () => {
  it("rewrites relative links and images using GitHub README urls", () => {
    const html = renderReadme({
      markdown: "[Guide](docs/guide.md)\n\n![Logo](images/logo.png)",
      htmlUrl: "https://github.com/matt-riley/slides.nvim/blob/main/README.md",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      images: [
        {
          source: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
          mirroredPath: null,
        },
      ],
    });

    expect(html).toContain(
      'href="https://github.com/matt-riley/slides.nvim/blob/main/docs/guide.md"',
    );
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png"',
    );
  });

  it("sanitizes unsafe html", () => {
    const html = renderReadme({
      markdown: 'Hello <script>alert("x")</script>\n\n[bad](javascript:alert(1))',
      htmlUrl: null,
      downloadUrl: null,
      images: [],
    });

    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:alert");
  });

  it("drops non-GitHub images so synced readmes cannot auto-load third-party trackers", () => {
    const html = renderReadme({
      markdown:
        "![Tracker](https://evil.example/pixel.png)\n\n![Protocol Relative](//evil.example/pixel.png)\n\n![Repo Asset](images/logo.png)",
      htmlUrl: "https://github.com/matt-riley/slides.nvim/blob/main/README.md",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      images: [
        {
          source: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
          mirroredPath: null,
        },
      ],
    });

    expect(html).not.toContain("evil.example");
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png"',
    );
  });

  it("prefers mirrored local image paths over remote sources", () => {
    const html = renderReadme({
      markdown: "![Logo](images/logo.png)",
      htmlUrl: "https://github.com/matt-riley/slides.nvim/blob/main/README.md",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      images: [
        {
          source: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
          mirroredPath: "/generated/readme-images/matt-riley/slides.nvim/logo.png",
        },
      ],
    });

    expect(html).toContain(
      'src="/generated/readme-images/matt-riley/slides.nvim/logo.png"',
    );
  });

  it("keeps the synced remote fallback url when mirroring failed", () => {
    const html = renderReadme({
      markdown: "![Logo](images/logo.png)",
      htmlUrl: "https://github.com/matt-riley/slides.nvim/blob/main/README.md",
      downloadUrl: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/README.md",
      images: [
        {
          source: "https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png",
          mirroredPath: null,
        },
      ],
    });

    expect(html).toContain(
      'src="https://raw.githubusercontent.com/matt-riley/slides.nvim/main/images/logo.png"',
    );
  });
});
