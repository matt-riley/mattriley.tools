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
  - `public/generated/readme-images/`

`pnpm run generate:data` owns all three generated outputs. It syncs README markdown into the
generated data modules and mirrors any allowed README image assets into
`public/generated/readme-images/` so the site can serve them locally.

The generated Homebrew tool data currently focuses on:

- formula name
- packaged version in the tap
- description
- homepage
- synced repository README content when the homepage points at a GitHub repository
- license
- platform support
- install command
- installed binary name

The generated plugin data currently focuses on:

- repository name and slug
- description
- homepage URL
- synced repository README content
- latest Git tag version
- last updated timestamp
- language and topics
- `lazy.nvim` install snippet
- `vim.pack` install snippet

This repo assumes the tap's duplicate cask/formula issue is resolved elsewhere and that the site consumes the formula-only end state for the Homebrew catalog.

## Local development

From the repository root:

```bash
export NODE_AUTH_TOKEN=<github-token-with-package-read-access>
pnpm install
pnpm run generate:data -- --tap-path ../homebrew-tools
pnpm dev
```

If you want local generated data to include README content from private tool repositories, set
`TOOL_REPOS_GITHUB_TOKEN` to a token that can read those repos before running
`pnpm run generate:data`. That generation step also refreshes mirrored README image assets under
`public/generated/readme-images/`.

If your tap checkout is somewhere else, point the generator at it explicitly:

```bash
pnpm run generate:data -- --tap-path /absolute/path/to/homebrew-tools
```

The repo now consumes the published Snurble design-system packages from GitHub Packages, so
fresh installs need `NODE_AUTH_TOKEN` set before `pnpm install`. The committed `.npmrc` keeps the
`@matt-riley` scope pointed at `https://npm.pkg.github.com`, and CI injects `github.token` for the
same install path.

## Commands

```bash
pnpm run generate:data  # Regenerate all three generated outputs from the tap and GitHub
pnpm dev                # Start local dev server
pnpm build              # Run astro check and build static output
pnpm preview            # Preview the production build locally
pnpm lint               # Run oxlint across src/, scripts/, and tests/
pnpm test               # Run the Vitest suite
pnpm format             # Format the repository with oxfmt
pnpm format:check       # Verify formatting
```

## Automatic updates

`.github/workflows/sync-tools-data.yml` syncs site data on a schedule (every 6 hours) and can also be triggered manually via `workflow_dispatch`. It checks out the public `homebrew-tools` tap, uses the repo's existing GitHub App credentials (`vars.APP_ID` and `secrets.PRIVATE_KEY`) to read private tool READMEs, regenerates all three generated outputs, and commits if any of those generated outputs changed.

Deployment remains intentionally undecided; the site output is plain static Astro so hosting can be chosen later.

## License

[MIT](LICENSE)
