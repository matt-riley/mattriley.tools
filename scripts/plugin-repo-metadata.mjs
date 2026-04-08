/**
 * @typedef {{
 *   name: string;
 *   full_name: string;
 *   html_url: string;
 *   description: string | null;
 *   pushed_at: string;
 *   language: string | null;
 *   topics: string[];
 * }} GitHubRepo
 */

/**
 * @typedef {{
 *   slug: string;
 *   name: string;
 *   description: string;
 *   repository: string;
 *   homepage: string;
 *   updatedAt: string;
 *   language: string | null;
 *   topics: string[];
 *   lazyInstallSnippet: string;
 *   vimPackInstallSnippet: string;
 * }} PluginRecord
 */

/**
 * @param {{ name: string }[]} repos
 * @returns {{ name: string }[]}
 */
export function filterPluginRepos(repos) {
  return repos
    .filter((repo) => repo.name.includes(".nvim"))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * @param {GitHubRepo} repo
 * @returns {PluginRecord}
 */
export function toPluginRecord(repo) {
  return {
    slug: repo.name,
    name: repo.name,
    description: repo.description ?? "No description provided.",
    repository: repo.full_name,
    homepage: repo.html_url,
    updatedAt: repo.pushed_at,
    language: repo.language,
    topics: repo.topics ?? [],
    lazyInstallSnippet: `{ "matt-riley/${repo.name}" }`,
    vimPackInstallSnippet: `vim.pack.add({ '${repo.html_url}' })`,
  };
}
