# mattriley.tools

> A static Astro site that lists the tools packaged in the [`matt-riley/tools`](https://github.com/matt-riley/homebrew-tools) Homebrew tap.

## Stack

- [Astro](https://astro.build/) — static site generation
- [pnpm](https://pnpm.io/) — package management
- [oxlint](https://oxc.rs/) — linting
- [oxfmt](https://oxc.rs/) — formatting
- [Vitest](https://vitest.dev/) — tests

## Data flow

The site renders from a generated data file:

- Source of truth: `homebrew-tools/Formula/*.rb`
- Generator: `scripts/generate-tools-data.mjs`
- Generated artifact: `src/data/tools.generated.ts`

The generated data currently focuses on:

- formula name
- packaged version in the tap
- description
- homepage
- license
- platform support
- install command
- installed binary name

This repo assumes the tap's duplicate cask/formula issue is resolved elsewhere and that the site consumes the formula-only end state.

## Local development

From the repository root:

```bash
pnpm install
pnpm run generate:data -- --tap-path ../homebrew-tools
pnpm dev
```

If your tap checkout is somewhere else, point the generator at it explicitly:

```bash
pnpm run generate:data -- --tap-path /absolute/path/to/homebrew-tools
```

## Commands

```bash
pnpm run generate:data  # Regenerate src/data/tools.generated.ts from the tap
pnpm dev                # Start local dev server
pnpm build              # Run astro check and build static output
pnpm preview            # Preview the production build locally
pnpm lint               # Run oxlint across src/, scripts/, and tests/
pnpm test               # Run the Vitest suite
pnpm format             # Format the repository with oxfmt
pnpm format:check       # Verify formatting
```

## Automatic updates

`.github/workflows/sync-tools-data.yml` refreshes the generated tool data when it is manually dispatched or when the tap repo tells it to sync. The intended event-driven path is:

1. `homebrew-tools` receives a push that changes `Formula/**`
2. `homebrew-tools/.github/workflows/trigger-mattriley-tools-sync.yml` dispatches `mattriley.tools/.github/workflows/sync-tools-data.yml`
3. the site repo checks out the tap at the pushed commit SHA, regenerates `src/data/tools.generated.ts`, and commits the updated generated data if anything changed

For this to work in GitHub, configure both secrets:

- In `homebrew-tools`: `MATTRILEY_TOOLS_WORKFLOW_DISPATCH_TOKEN`
  - needs permission to dispatch workflows in `matt-riley/mattriley.tools`
- In `mattriley.tools`: `HOMEBREW_TOOLS_READ_TOKEN`
  - needs read access to `matt-riley/homebrew-tools` so the sync workflow can check out the private tap repo

You can use two separate fine-grained tokens, or reuse the same token value in both repos if that token has both capabilities.

Deployment remains intentionally undecided; the site output is plain static Astro so hosting can be chosen later.

## License

[MIT](LICENSE)
