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
});
