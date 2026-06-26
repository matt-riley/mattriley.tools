import { describe, expect, it } from "vitest";

import catalogDetailSource from "../src/components/CatalogDetail.astro?raw";
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
    footerLinkLabel: "Open source repository",
  },
  {
    name: "plugin",
    source: pluginDetailPageSource,
    title: "README",
    fallback: "This plugin does not currently have synced README content to display.",
    footerLinkLabel: "Open GitHub repository",
  },
  {
    name: "template",
    source: templateDetailPageSource,
    title: "README",
    fallback: "This template does not currently have synced README content to display.",
    footerLinkLabel: "Open on GitHub",
  },
  {
    name: "skill",
    source: skillDetailPageSource,
    title: "SKILL.md",
    fallback: "This skill does not currently have synced instruction content to display.",
    footerLinkLabel: "Open SKILL.md on GitHub",
  },
];

describe("detail pages", () => {
  it("uses the shared CatalogDetail component on all detail pages", () => {
    for (const { name, source } of detailPages) {
      expect(source).toContain('import CatalogDetail from "../../components/CatalogDetail.astro"');
      expect(source).toContain("<CatalogDetail");
      expect(source).toContain(`{${name}.name}`);
      expect(source).toContain(`readme={${name}.readme}`);
    }
  });

  it("renders a README or SKILL.md section via the shared component", () => {
    expect(catalogDetailSource).toContain("<h2>{sectionTitle}</h2>");
    for (const { source, title, fallback } of detailPages) {
      expect(source).toContain(`sectionTitle="${title}"`);
      expect(source).toContain(`fallbackText="${fallback}"`);
    }
  });

  it("renders install snippets for lazy.nvim and vim.pack on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain("Install (lazy.nvim):");
    expect(pluginDetailPageSource).toContain("Install (vim.pack):");
    expect(pluginDetailPageSource).toContain("{plugin.lazyInstallSnippet}");
    expect(pluginDetailPageSource).toContain("{plugin.vimPackInstallSnippet}");
  });

  it("renders a main content landmark via the shared component", () => {
    expect(catalogDetailSource).toContain("<main>");
  });

  it("uses noopener noreferrer on footer external links", () => {
    expect(catalogDetailSource).toContain('rel="noopener noreferrer">{sourceLabel}</a>');
    for (const { source, footerLinkLabel } of detailPages) {
      expect(source).toContain(`sourceLabel="${footerLinkLabel}"`);
    }
  });
});
