import { describe, expect, it } from "vitest";

import ciWorkflowSource from "../.github/workflows/ci.yml?raw";
import miseSource from "../mise.toml?raw";

describe("CI workflow", () => {
  it("passes github.token to the shared workflow through task-env for private package installs", () => {
    expect(ciWorkflowSource).toContain("packages: read");
    expect(ciWorkflowSource).toContain("task-env: |");
    expect(ciWorkflowSource).toContain("NODE_AUTH_TOKEN=${{ github.token }}");
  });

  it("writes the package token into user npm config before pnpm install", () => {
    expect(miseSource).toContain('touch "$HOME/.npmrc"');
    expect(miseSource).toContain("//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}");
    expect(miseSource).toContain("pnpm install");
  });
});
