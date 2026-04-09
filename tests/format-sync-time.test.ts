import { describe, expect, it } from "vitest";

import { formatUtcTimestamp } from "../src/utils/date";

describe("formatUtcTimestamp", () => {
  it("renders an ISO timestamp as a friendly UTC label", () => {
    expect(formatUtcTimestamp("2026-04-08T21:55:40.881Z")).toBe("8 Apr, 2026, 9:55 PM UTC");
  });
});
