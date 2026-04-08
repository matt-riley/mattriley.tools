# mattriley.tools

> A static Astro site that lists Matt Riley's Homebrew tools and Neovim plugins.

## Stack

- [Astro](https://astro.build/) — static site generation
- [pnpm](https://pnpm.io/) — package management
- [oxlint](https://oxc.rs/) — linting
- [oxfmt](https://oxc.rs/) — formatting
- [Vitest](https://vitest.dev/) — tests

## Data flow

The site renders from generated data files:

- Source of truth for Homebrew tools: `homebrew-tools/Formula/*.rb`
- Source of truth for Neovim plugins: public `matt-riley/*` GitHub repositories whose names contain `.nvim`
- Generator: `scripts/generate-tools-data.mjs`
- Generated artifacts:
  - `src/data/tools.generated.ts`
  - `src/data/plugins.generated.ts`

The generated Homebrew tool data currently focuses on:

- formula name
- packaged version in the tap
- description
- homepage
- license
- platform support
- install command
- installed binary name

The generated plugin data currently focuses on:

- repository name and slug
- description
- homepage URL
- last updated timestamp
- language and topics
- `lazy.nvim` install snippet
- `vim.pack` install snippet

This repo assumes the tap's duplicate cask/formula issue is resolved elsewhere and that the site consumes the formula-only end state for the Homebrew catalog.

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
pnpm run generate:data  # Regenerate both generated data files from the tap and GitHub
pnpm dev                # Start local dev server
pnpm build              # Run astro check and build static output
pnpm preview            # Preview the production build locally
pnpm lint               # Run oxlint across src/, scripts/, and tests/
pnpm test               # Run the Vitest suite
pnpm format             # Format the repository with oxfmt
pnpm format:check       # Verify formatting
```

## Automatic updates

`.github/workflows/sync-tools-data.yml` syncs site data on a schedule (every 6 hours) and can also be triggered manually via `workflow_dispatch`. It checks out the public `homebrew-tools` tap, regenerates both generated data files, and commits if either one changed.

No additional secrets or tokens are required — the tap is public, the plugin metadata comes from the public GitHub API, and the workflow uses the built-in `GITHUB_TOKEN` for pushing to this repo.

Deployment remains intentionally undecided; the site output is plain static Astro so hosting can be chosen later.

## License

[MIT](LICENSE)
