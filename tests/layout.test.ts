import { describe, expect, it } from "vitest";

import layoutSource from "../src/layouts/Layout.astro?raw";

describe("shared layout wrapper", () => {
  it("uses Snurble discovery and structured-data helpers", () => {
    expect(layoutSource).toContain("AgentDiscoveryHint");
    expect(layoutSource).toContain("JsonLd");
    expect(layoutSource).toContain("jsonld?: unknown");
    expect(layoutSource).toContain("agentHint?: string | readonly string[]");
  });
});
