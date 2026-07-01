import { describe, expect, it } from "vitest";
import { formatSeoDescription, formatSeoTitle } from "../src/utils/seo";

describe("formatSeoTitle", () => {
  it("combines the item name and domain label", () => {
    expect(formatSeoTitle("agit", "Homebrew Tool")).toBe("agit Homebrew Tool");
  });

  it("keeps the formatted title short enough for the layout suffix", () => {
    const result = formatSeoTitle("circleci-to-github-actions-migration", "Agent Skill");

    expect(result.length).toBeLessThanOrEqual(46);
    expect(result).toContain("Agent Skill");
  });
});

describe("formatSeoDescription", () => {
  it("returns the tagline when no raw description exists", () => {
    expect(formatSeoDescription(undefined, "fallback text")).toBe("fallback text");
  });

  it("truncates descriptions over 200 characters", () => {
    const long = "a".repeat(250);

    expect(formatSeoDescription(long, "tagline")).toBe(`${"a".repeat(197)}...`);
  });

  it("pads descriptions under 70 characters with a suffix", () => {
    const result = formatSeoDescription("Short.", "Tagline text.");

    expect(result).toContain("— from mattriley.tools");
    expect(result.length).toBeGreaterThan(
      formatSeoDescription("Short.", "Tagline text.").indexOf("Short."),
    );
  });

  it("leaves descriptions in the 70–200 character band unchanged", () => {
    const raw = "This description is intentionally long enough to land inside the valid band.";
    const result = formatSeoDescription(raw, "tagline");

    expect(result).toBe(`${raw}. tagline`);
    expect(result.length).toBeGreaterThanOrEqual(70);
    expect(result.length).toBeLessThanOrEqual(200);
  });
});
