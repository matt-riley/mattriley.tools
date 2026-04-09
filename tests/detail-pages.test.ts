import { describe, expect, it } from "vitest";

import pluginDetailPageSource from "../src/pages/plugins/[slug].astro?raw";
import toolDetailPageSource from "../src/pages/tools/[slug].astro?raw";

describe("detail pages", () => {
  it("renders a README section on tool detail pages", () => {
    expect(toolDetailPageSource).toContain('aria-labelledby="tool-readme"');
    expect(toolDetailPageSource).toContain("README unavailable.");
  });

  it("renders a README section on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain('aria-labelledby="plugin-readme"');
    expect(pluginDetailPageSource).toContain("README unavailable.");
  });

  it("does not render a separate install section on plugin detail pages", () => {
    expect(pluginDetailPageSource).not.toContain('aria-labelledby="plugin-install"');
    expect(pluginDetailPageSource).not.toContain('<h2 id="plugin-install">Install</h2>');
  });
});
