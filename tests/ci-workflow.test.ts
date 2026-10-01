import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import ciWorkflowSource from "../.github/workflows/ci.yml?raw";
import syncWorkflowSource from "../.github/workflows/sync-tools-data.yml?raw";
import miseSource from "../mise.toml?raw";
import pnpmWorkspaceSource from "../pnpm-workspace.yaml?raw";

describe("CI workflow", () => {
  it("explicitly runs full CI after bot-authored data syncs", () => {
    const ci = parse(ciWorkflowSource);
    const sync = parse(syncWorkflowSource).jobs.sync;
    expect(ci.on).toHaveProperty("workflow_dispatch");
    expect(ci.jobs.deploy.needs).toEqual(["ci", "generated-data"]);
    expect(ci.jobs.deploy.if).toBe(
      "(github.event_name == 'push' || github.event_name == 'workflow_dispatch') && github.ref == 'refs/heads/main'",
    );
    expect(sync.permissions.actions).toBe("write");
    const steps = sync.steps;
    const commit = steps.findIndex(
      (step: { name: string }) => step.name === "Commit updated site data",
    );
    const dispatch = steps.findIndex(
      (step: { name: string }) => step.name === "Test and deploy synced main",
    );
    expect(dispatch).toBeGreaterThan(commit);
    expect(steps[dispatch].if).toBeUndefined();
    expect(steps[dispatch].env.GH_TOKEN).toBe("${{ github.token }}");
    expect(steps[dispatch].run).toBe(
      'gh workflow run ci.yml --repo "$GITHUB_REPOSITORY" --ref main',
    );
  });
  it("separates deployment dispatch and private tool reading credentials", () => {
    expect(ciWorkflowSource).toContain(
      "matt-riley/matt-riley-ci/.github/workflows/request-app-deploy.yml@5ba0a5d81682fec26e6089c7ce2bab6505a85923",
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
