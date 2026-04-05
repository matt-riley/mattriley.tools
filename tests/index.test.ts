import { describe, expect, it } from "vitest";

import { generatedAt, tools } from "../src/data/tools.generated";

describe("generated tool data", () => {
  it("includes at least one tool", () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it("uses unique slugs", () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("stores install commands for the matt-riley/tools tap", () => {
    expect(
      tools.every((tool) => tool.installCommand.startsWith("brew install matt-riley/tools/")),
    ).toBe(true);
  });

  it("records the last generation timestamp", () => {
    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
  });
});
