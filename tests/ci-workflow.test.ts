import { describe, expect, it } from "vitest";

import ciWorkflowSource from "../.github/workflows/ci.yml?raw";

describe("CI workflow", () => {
  it("creates a GitHub App package-read token and passes it to the shared node workflow as a secret", () => {
    expect(ciWorkflowSource).toContain("package-read-token:");
    expect(ciWorkflowSource).toContain("Create GitHub App token for Snurble packages");
    expect(ciWorkflowSource).toContain("uses: actions/create-github-app-token");
    expect(ciWorkflowSource).toContain("repositories: snurble");
    expect(ciWorkflowSource).toContain("needs: package-read-token");
    expect(ciWorkflowSource).toContain("node_auth_token: ${{ needs.package-read-token.outputs.token }}");
    expect(ciWorkflowSource).not.toContain(
      'install-command: NODE_AUTH_TOKEN="${{ github.token }}" pnpm install --frozen-lockfile',
    );
  });
});
