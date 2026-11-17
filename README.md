# mattriley.tools

> Under Pressure is a print exhibition of Matt Riley’s Homebrew tools, Neovim plugins and public templates. Its interactive proofs and searchable index are built with Astro.

## Stack

- [Astro](https://astro.build/) — static site generation
- [pnpm](https://pnpm.io/) — package management
- [oxlint](https://oxc.rs/) — linting
- [oxfmt](https://oxc.rs/) — formatting
- [Vitest](https://vitest.dev/) — tests

## Data flow

The site renders from generated data files:

- Homebrew tool source: `homebrew-tools/Formula/*.rb`
- Template source: public, non-archived `matt-riley/*` GitHub repositories marked as templates
- Neovim plugin source: public, non-archived `matt-riley/*` GitHub repositories whose names contain `.nvim`
- Generator: `scripts/generate-tools-data.mjs`
- Generated artifacts:
  - `src/data/tools.generated.ts`
  - `src/data/templates.generated.ts`
  - `src/data/plugins.generated.ts`
  - `public/generated/readme-images/`

`pnpm run generate:data` writes all of these outputs. It syncs README Markdown into the
generated data modules and mirrors allowed README images into
`public/generated/readme-images/` so the site can serve them locally.

The generated Homebrew tool data includes:

- formula name
- packaged version in the tap
- description
- homepage
- synced repository README content when the homepage points at a GitHub repository
- license
- platform support
- install command
- installed binary name

The generated plugin data includes:

- repository name and slug
- description
- homepage URL
- synced repository README content
- latest Git tag version
- last updated timestamp
- language and topics
- `lazy.nvim` install snippet
- `vim.pack` install snippet

The generated template data includes:

- repository name and slug
- description
- homepage URL
- synced repository README content
- last updated timestamp
- language and topics

This repo assumes the tap's duplicate cask/formula issue is resolved elsewhere and that the Homebrew catalog uses formulas only.

## Local development

From the repository root:

```bash
export NODE_AUTH_TOKEN=<github-token-with-package-read-access>
pnpm install
pnpm run generate:data -- --tap-path ../homebrew-tools
pnpm dev
```

If your tap includes formulas whose homepages point at private GitHub repositories, set
`TOOL_REPOS_GITHUB_TOKEN` to a token that can read those repos before running
`pnpm run generate:data`. The generator uses that access to identify and exclude private
repositories from the published site, then refreshes mirrored README image assets under
`public/generated/readme-images/` for the remaining public entries.

If your tap checkout is elsewhere, pass its path:

```bash
pnpm run generate:data -- --tap-path /absolute/path/to/homebrew-tools
```

The repo uses Snurble design-system packages from GitHub Packages, so set `NODE_AUTH_TOKEN`
before `pnpm install` for fresh installs. The committed `.npmrc` points only the
`@matt-riley` scope at `https://npm.pkg.github.com`. The `mise install` task writes the
auth token to `~/.npmrc` at runtime. It prefers `NODE_AUTH_TOKEN` and falls back to
`MISE_GITHUB_TOKEN`, which CI gets from `mise-action`.

## Commands

```bash
pnpm run generate:data  # Regenerate generated catalog data from the tap and GitHub
pnpm dev                # Start local dev server
pnpm build              # Run astro check and build static output
pnpm preview            # Preview the production build locally
pnpm lint               # Run oxlint across src/, scripts/, and tests/
pnpm test               # Run the Vitest suite
pnpm format             # Format the repository with oxfmt
pnpm format:check       # Verify formatting
```

## Automatic updates

`.github/workflows/sync-tools-data.yml` syncs site data:

- When `homebrew-tools` changes a formula. The tap dispatches the workflow with a dedicated
  site-dispatch App that has Actions write access to this repository only.
- Every 6 hours to pick up upstream README, plugin and template changes.
- Manually via `workflow_dispatch`.

The workflow checks out the public `homebrew-tools` tap and uses dedicated read-only tool-reader
credentials (`vars.TOOLS_READER_APP_ID` and `secrets.TOOLS_READER_PRIVATE_KEY`) to identify private
tap-backed repositories and exclude them from the published site. It regenerates and formats the
catalog outputs and uses this repository’s own `GITHUB_TOKEN` to commit them if any changed.
The tool-reader App cannot push generated data or dispatch deployments.

Successful production CI requests deployment through the shared workflow using separate `INFRA_DISPATCH_APP_ID` / `INFRA_DISPATCH_PRIVATE_KEY` credentials. See [the migration checklist](docs/deploy-credential-migration.md) before changing the configured Apps or removing legacy secrets.

## License

[MIT](LICENSE)
