# Copilot Instructions

## Commands

- Install dependencies: `pnpm install`
- Generate site data from the sibling tap checkout:
  `pnpm run generate:data -- --tap-path ../homebrew-tools`
- Start local dev server: `pnpm dev`
- Lint: `pnpm run lint`
- Run all tests: `pnpm test`
- Run one test file: `pnpm exec vitest run tests/index.test.ts`
- Build production output: `pnpm run build`
- Check formatting: `pnpm run format:check`

## Architecture

- This is a static Astro site. Pages render from committed generated data
  modules, not from live tap or GitHub API calls at request time.
- `scripts/generate-tools-data.mjs` reads Homebrew formulas from a
  `homebrew-tools` checkout and data from public `matt-riley/*` GitHub repositories
  (plugins whose names contain `.nvim` and repositories marked as templates). It writes:
  - `src/data/tools.generated.ts`
  - `src/data/plugins.generated.ts`
  - `src/data/templates.generated.ts`
- `src/pages/index.astro` renders a searchable index of three collections on the homepage:
  Homebrew tools, Neovim plugins, and public templates.
- `src/pages/tools/[slug].astro`, `src/pages/plugins/[slug].astro`,
  and `src/pages/templates/[slug].astro` build
  static detail pages with `getStaticPaths()` from the generated modules.
- `.github/workflows/sync-tools-data.yml` refreshes the data in this repository.
  It runs on a schedule or manual dispatch, checks out the public
  `matt-riley/homebrew-tools` repository to a temporary location, regenerates all
  three data files, and commits them if they changed.
- `.github/workflows/ci.yml` uses the shared `matt-riley/matt-riley-ci` Node CI
  workflow, runs a generated-data freshness check, and calls the shared public
  `matt-riley/matt-riley-ci/.github/workflows/request-app-deploy.yml` workflow
  with dedicated dispatch credentials on `main` pushes.

## Conventions

- Make changes in this repository. Treat `homebrew-tools` as read-only unless
  Matt explicitly asks for cross-repo edits.
- Keep scheduled and manual sync from the public tap in
  `.github/workflows/sync-tools-data.yml`. Do not reintroduce PAT-based or
  dispatch-based cross-repo sync unless explicitly requested.
- Changes to the generator for `pnpm run generate:data` must keep all three
  generated modules in sync and should update the related tests and README when
  the data shape or sourcing changes.
- Do not hand-edit `src/data/tools.generated.ts`,
  `src/data/plugins.generated.ts`, or `src/data/templates.generated.ts`; regenerate them through
  `pnpm run generate:data`.
- When changing generator behavior, check the matching tests in
  `tests/generate-tools-data.test.ts`, `tests/plugin-repo-metadata.test.ts`,
  `tests/readme-image-assets.test.ts`, and `tests/index.test.ts`.
- In handoffs, say whether changes are local-only, pushed to `main`, or on a
  feature branch/PR. When asked to finish branch work, push it and open the PR.
