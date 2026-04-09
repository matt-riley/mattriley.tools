import { describe, expect, it } from "vitest";

import ciWorkflowSource from "../.github/workflows/ci.yml?raw";

describe("CI workflow", () => {
  it("lets the shared node workflow use github.token for package installs instead of embedding auth in inputs", () => {
    expect(ciWorkflowSource).toContain("packages: read");
    expect(ciWorkflowSource).not.toContain("package-read-token:");
    expect(ciWorkflowSource).not.toContain("Create GitHub App token for Snurble packages");
    expect(ciWorkflowSource).not.toContain("node_auth_token:");
    expect(ciWorkflowSource).not.toContain(
      'install-command: NODE_AUTH_TOKEN="${{ github.token }}" pnpm install --frozen-lockfile',
    );
  });
});
