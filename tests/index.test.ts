import { describe, expect, it } from "vitest";

import { generatedAt, tools } from "../src/data/tools.generated";
import { plugins, pluginsGeneratedAt } from "../src/data/plugins.generated";

describe("generated site data", () => {
  it("includes at least one tool", () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it("includes at least one plugin", () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  it("uses unique slugs", () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses unique plugin slugs", () => {
    const slugs = plugins.map((plugin) => plugin.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("stores install commands for the matt-riley/tools tap", () => {
    expect(
      tools.every((tool) => tool.installCommand.startsWith("brew install matt-riley/tools/")),
    ).toBe(true);
  });

  it("stores install snippets for every plugin", () => {
    expect(
      plugins.every(
        (plugin) =>
          plugin.lazyInstallSnippet.includes(plugin.repository) &&
          plugin.vimPackInstallSnippet.includes(plugin.homepage),
      ),
    ).toBe(true);
  });

  it("records the last generation timestamps", () => {
    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(pluginsGeneratedAt))).toBe(false);
  });
});
