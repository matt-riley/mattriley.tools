import { describe, expect, it } from "vitest";

import pluginDetailPageSource from "../src/pages/plugins/[slug].astro?raw";
import toolDetailPageSource from "../src/pages/tools/[slug].astro?raw";

describe("detail pages", () => {
  it("uses the shared Snurble Astro primitives on both detail pages", () => {
    expect(toolDetailPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(toolDetailPageSource).toContain("<Hero");
    expect(toolDetailPageSource).toContain("<MetaList>");
    expect(toolDetailPageSource).toContain("<Panel>");
    expect(toolDetailPageSource).toContain("<CodeSnippet");

    expect(pluginDetailPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(pluginDetailPageSource).toContain("<Hero");
    expect(pluginDetailPageSource).toContain("<MetaList>");
    expect(pluginDetailPageSource).toContain("<Panel>");
  });

  it("renders a README section on tool detail pages", () => {
    expect(toolDetailPageSource).toContain('<Section title="README" headingId="tool-readme">');
    expect(toolDetailPageSource).toContain("README unavailable.");
  });

  it("renders a README section on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain('<Section title="README" headingId="plugin-readme">');
    expect(pluginDetailPageSource).toContain("README unavailable.");
  });

  it("does not render a separate install section on plugin detail pages", () => {
    expect(pluginDetailPageSource).not.toContain('aria-labelledby="plugin-install"');
    expect(pluginDetailPageSource).not.toContain('<h2 id="plugin-install">Install</h2>');
  });
});
