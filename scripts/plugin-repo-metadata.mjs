/**
 * @typedef {{
 *   name: string;
 *   full_name: string;
 *   html_url: string;
 *   description: string | null;
 *   pushed_at: string;
 *   language: string | null;
 *   private?: boolean;
 *   archived?: boolean;
 *   topics?: string[];
 * }} GitHubRepo
 */

/**
 * @typedef {{
 *   slug: string;
 *   name: string;
 *   description: string;
 *   repository: string;
 *   homepage: string;
 *   version: string;
 *   updatedAt: string;
 *   language: string | null;
 *   topics: string[];
 *   lazyInstallSnippet: string;
 *   vimPackInstallSnippet: string;
 * }} PluginRecord
 */

/**
 * @param {{ name: string; private?: boolean; archived?: boolean }[]} repos
 * @returns {{ name: string; private?: boolean; archived?: boolean }[]}
 */
export function filterPluginRepos(repos) {
  return repos
    .filter(
      (repo) => repo.name.includes(".nvim") && repo.private !== true && repo.archived !== true,
    )
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * @param {GitHubRepo} repo
 * @param {string} version
 * @returns {PluginRecord}
 */
export function toPluginRecord(repo, version) {
  // ponytail: GitHub tag names carry a leading "v" (e.g. "v0.1.2"). The card
  // template prepends its own "v", so strip it here to keep versions bare
  // and consistent with tools/skills data.
  const bareVersion = version.replace(/^v+/, "");
  return {
    slug: repo.name,
    name: repo.name,
    description: repo.description ?? "No description provided.",
    repository: repo.full_name,
    homepage: repo.homepage || repo.html_url,
    version: bareVersion,
    updatedAt: repo.pushed_at,
    language: repo.language,
    topics: repo.topics ?? [],
    lazyInstallSnippet: `{ "${repo.full_name}" }`,
    vimPackInstallSnippet: `vim.pack.add({ '${repo.html_url}' })`,
  };
}
