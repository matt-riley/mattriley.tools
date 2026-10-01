import { describe, expect, it } from "vitest";

import ciWorkflowSource from "../.github/workflows/ci.yml?raw";
import syncWorkflowSource from "../.github/workflows/sync-tools-data.yml?raw";
import miseSource from "../mise.toml?raw";
import pnpmWorkspaceSource from "../pnpm-workspace.yaml?raw";

describe("CI workflow", () => {
  it("separates deployment dispatch and private tool reading credentials", () => {
    expect(ciWorkflowSource).toContain(
      "matt-riley/matt-riley-ci/.github/workflows/request-app-deploy.yml@88566328ddaec1ac3f2384dfbd48e844ad35af92",
    );
    expect(ciWorkflowSource).toContain("dispatch-app-id: ${{ vars.INFRA_DISPATCH_APP_ID }}");
    expect(ciWorkflowSource).toContain("secrets.INFRA_DISPATCH_PRIVATE_KEY");
    expect(syncWorkflowSource).toContain("vars.TOOLS_READER_APP_ID");
    expect(syncWorkflowSource).toContain("secrets.TOOLS_READER_PRIVATE_KEY");
    expect(syncWorkflowSource).toContain("permission-contents: read");
    for (const source of [ciWorkflowSource, syncWorkflowSource]) {
      expect(source).not.toContain("vars.APP_ID");
      expect(source).not.toContain("secrets.PRIVATE_KEY");
    }
  });

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
