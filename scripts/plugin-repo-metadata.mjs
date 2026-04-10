/**
 * @typedef {{
 *   name: string;
 *   full_name: string;
 *   html_url: string;
 *   description: string | null;
 *   pushed_at: string;
 *   language: string | null;
 *   private?: boolean;
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
 * @param {{ name: string; private?: boolean }[]} repos
 * @returns {{ name: string; private?: boolean }[]}
 */
export function filterPluginRepos(repos) {
  return repos
    .filter((repo) => repo.name.includes(".nvim") && repo.private !== true)
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * @param {GitHubRepo} repo
 * @param {string} version
 * @returns {PluginRecord}
 */
export function toPluginRecord(repo, version) {
  return {
    slug: repo.name,
    name: repo.name,
    description: repo.description ?? "No description provided.",
    repository: repo.full_name,
    homepage: repo.html_url,
    version,
    updatedAt: repo.pushed_at,
    language: repo.language,
    topics: repo.topics ?? [],
    lazyInstallSnippet: `{ "${repo.full_name}" }`,
    vimPackInstallSnippet: `vim.pack.add({ '${repo.html_url}' })`,
  };
}
