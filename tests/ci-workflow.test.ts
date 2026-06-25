import { describe, expect, it } from "vitest";

import ciWorkflowSource from "../.github/workflows/ci.yml?raw";
import miseSource from "../mise.toml?raw";
import pnpmWorkspaceSource from "../pnpm-workspace.yaml?raw";

describe("CI workflow", () => {
  it("keeps package read permission on the shared workflow job", () => {
    expect(ciWorkflowSource).toContain("packages: read");
    expect(ciWorkflowSource).not.toContain("task-env: |");
    expect(ciWorkflowSource).not.toContain("NODE_AUTH_TOKEN=${{ github.token }}");
  });

  it("writes the package token into user npm config before pnpm install", () => {
    expect(miseSource).toContain('auth_token="${NODE_AUTH_TOKEN:-${MISE_GITHUB_TOKEN:-}}"');
    expect(miseSource).toContain('touch "$HOME/.npmrc"');
    expect(miseSource).toContain("//npm.pkg.github.com/:_authToken=${auth_token}");
    expect(miseSource).toContain("pnpm install");
  });

  it("approves the install-time builds required by pnpm", () => {
    expect(pnpmWorkspaceSource).toContain("allowBuilds:");
    expect(pnpmWorkspaceSource).toContain("esbuild: true");
    expect(pnpmWorkspaceSource).toContain("sharp: true");
  });
});
