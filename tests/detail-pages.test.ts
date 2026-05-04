import { describe, expect, it } from "vitest";

import pluginDetailPageSource from "../src/pages/plugins/[slug].astro?raw";
import templateDetailPageSource from "../src/pages/templates/[slug].astro?raw";
import toolDetailPageSource from "../src/pages/tools/[slug].astro?raw";

describe("detail pages", () => {
  it("uses the richer shared Snurble Astro primitives on all detail pages", () => {
    expect(toolDetailPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(toolDetailPageSource).toContain("<Breadcrumbs");
    expect(toolDetailPageSource).toContain("<Hero");
    expect(toolDetailPageSource).toContain("<Badge");
    expect(toolDetailPageSource).toContain("<MetaList>");
    expect(toolDetailPageSource).toContain("<Panel");
    expect(toolDetailPageSource).toContain("<TableOfContents");
    expect(toolDetailPageSource).toContain("<EmptyState");
    expect(toolDetailPageSource).toContain("<CodeSnippet");

    expect(pluginDetailPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(pluginDetailPageSource).toContain("<Breadcrumbs");
    expect(pluginDetailPageSource).toContain("<Hero");
    expect(pluginDetailPageSource).toContain("<Badge");
    expect(pluginDetailPageSource).toContain("<MetaList>");
    expect(pluginDetailPageSource).toContain("<Panel");
    expect(pluginDetailPageSource).toContain("<TableOfContents");
    expect(pluginDetailPageSource).toContain("<Tabs");
    expect(pluginDetailPageSource).toContain("<CodeSnippet");
    expect(pluginDetailPageSource).toContain("<EmptyState");

    expect(templateDetailPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(templateDetailPageSource).toContain("<Breadcrumbs");
    expect(templateDetailPageSource).toContain("<Hero");
    expect(templateDetailPageSource).toContain("<Badge");
    expect(templateDetailPageSource).toContain("<MetaList>");
    expect(templateDetailPageSource).toContain("<Panel");
    expect(templateDetailPageSource).toContain("<TableOfContents");
    expect(templateDetailPageSource).toContain("<EmptyState");
  });

  it("renders a README section on tool detail pages", () => {
    expect(toolDetailPageSource).toContain(
      '<Section title="README" headingId="tool-readme" decorated>',
    );
    expect(toolDetailPageSource).toContain("README unavailable");
  });

  it("renders a README section on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain(
      '<Section title="README" headingId="plugin-readme" decorated>',
    );
    expect(pluginDetailPageSource).toContain("README unavailable");
  });

  it("renders a README section on template detail pages", () => {
    expect(templateDetailPageSource).toContain(
      '<Section title="README" headingId="template-readme" decorated>',
    );
    expect(templateDetailPageSource).toContain("README unavailable");
  });

  it("keeps plugin install snippets inside metadata instead of a separate install section", () => {
    expect(pluginDetailPageSource).not.toContain('aria-labelledby="plugin-install"');
    expect(pluginDetailPageSource).not.toContain('<Section title="Install"');
    expect(pluginDetailPageSource).toContain('id="plugin-install-snippets"');
    expect(pluginDetailPageSource).toContain('label="lazy.nvim"');
    expect(pluginDetailPageSource).toContain('label="vim.pack"');
  });

  it("relies on the shared layout for the main landmark on detail pages", () => {
    expect(toolDetailPageSource).not.toContain("<main>");
    expect(pluginDetailPageSource).not.toContain("<main>");
    expect(templateDetailPageSource).not.toContain("<main>");
  });
});
