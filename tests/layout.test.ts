import { describe, expect, it } from "vitest";

import layoutSource from "../src/layouts/Layout.astro?raw";

describe("shared layout wrapper", () => {
  it("uses Seo component and agent discovery helper", () => {
    expect(layoutSource).toContain("@jdevalk/astro-seo-graph/Seo.astro");
    expect(layoutSource).toContain("AGENT DISCOVERY HINT");
    expect(layoutSource).toContain("jsonld?: unknown");
    expect(layoutSource).toContain("agentHint?: string | readonly string[]");
  });
});
