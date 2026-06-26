import { describe, expect, it } from "vitest";

import pluginDetailPageSource from "../src/pages/plugins/[slug].astro?raw";
import skillDetailPageSource from "../src/pages/skills/[slug].astro?raw";
import templateDetailPageSource from "../src/pages/templates/[slug].astro?raw";
import toolDetailPageSource from "../src/pages/tools/[slug].astro?raw";

const detailPages = [
  {
    name: "tool",
    source: toolDetailPageSource,
    title: "README",
    fallback: "This tool does not currently have synced README content to display.",
  },
  {
    name: "plugin",
    source: pluginDetailPageSource,
    title: "README",
    fallback: "This plugin does not currently have synced README content to display.",
  },
  {
    name: "template",
    source: templateDetailPageSource,
    title: "README",
    fallback: "This template does not currently have synced README content to display.",
  },
  {
    name: "skill",
    source: skillDetailPageSource,
    title: "SKILL.md",
    fallback: "This skill does not currently have synced instruction content to display.",
  },
];

describe("detail pages", () => {
  it("uses the site Layout wrapper on all detail pages", () => {
    for (const { name, source } of detailPages) {
      expect(source).toContain('import Layout from "../../layouts/Layout.astro"');
      expect(source).toContain(`<h1>{${name}.name}</h1>`);
    }
  });

  it("renders a README or SKILL.md section on every detail page", () => {
    for (const { source, title, fallback } of detailPages) {
      expect(source).toContain(`<h2>${title}</h2>`);
      expect(source).toContain(fallback);
    }
  });

  it("renders install snippets for lazy.nvim and vim.pack on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain("Install (lazy.nvim):");
    expect(pluginDetailPageSource).toContain("Install (vim.pack):");
    expect(pluginDetailPageSource).toContain("{plugin.lazyInstallSnippet}");
    expect(pluginDetailPageSource).toContain("{plugin.vimPackInstallSnippet}");
  });

  it("renders a main content landmark on detail pages", () => {
    for (const { source } of detailPages) {
      expect(source).toContain("<main>");
    }
  });
});
