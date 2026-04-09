# Copilot Instructions

## Commands

- Install dependencies: `pnpm install`
- Generate site data from the sibling tap checkout: `pnpm run generate:data -- --tap-path ../homebrew-tools`
- Start local dev server: `pnpm dev`
- Lint: `pnpm run lint`
- Run all tests: `pnpm test`
- Run one test file: `pnpm exec vitest run tests/index.test.ts`
- Build production output: `pnpm run build`
- Check formatting: `pnpm run format:check`

## Architecture

- This is a static Astro site. Pages render from committed generated data modules, not from live tap or GitHub API calls at request time.
- `scripts/generate-tools-data.mjs` is the central data pipeline. It reads Homebrew formulas from a `homebrew-tools` checkout plus public `matt-riley/*` GitHub repositories whose names contain `.nvim`, then writes:
  - `src/data/tools.generated.ts`
  - `src/data/plugins.generated.ts`
- `src/pages/index.astro` renders two separate catalogs on the homepage: Homebrew tools and Neovim plugins.
- `src/pages/tools/[slug].astro` and `src/pages/plugins/[slug].astro` build static detail pages with `getStaticPaths()` from the generated modules.
- `.github/workflows/sync-tools-data.yml` is the repo-owned refresh path. It runs on a schedule or manual dispatch, checks out the public `matt-riley/homebrew-tools` repo into a temporary path, regenerates both data files, and commits them if they changed.
- `.github/workflows/ci.yml` uses the shared `matt-riley/matt-riley-ci` Node CI workflow for lint/test/build, then calls the local `.github/workflows/request-infra-deploy.yml` reusable workflow for deploy requests on `main` pushes.

## Conventions

- Treat this repository as the implementation target. `homebrew-tools` is a read-only source input for formula data unless Matt explicitly asks for cross-repo edits.
- Preserve the current self-sync design for `.github/workflows/sync-tools-data.yml`: scheduled/manual sync from the public tap. Do not reintroduce PAT-based or dispatch-based cross-repo sync unless explicitly requested.
- Treat `pnpm run generate:data` as a two-artifact contract. Generator changes must keep both generated modules in sync and should update the related tests and README when the data shape or sourcing changes.
- Do not hand-edit `src/data/tools.generated.ts` or `src/data/plugins.generated.ts`; regenerate them through `pnpm run generate:data`.
- When changing generator behavior, check the matching tests in `tests/generate-tools-data.test.ts`, `tests/plugin-repo-metadata.test.ts`, and `tests/index.test.ts`.
- Be explicit about delivery state in handoffs: say whether changes are local-only, pushed to `main`, or on a feature branch/PR. When asked to finish branch work, push it and open the PR.
