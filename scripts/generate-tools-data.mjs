import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseFormula } from "./formula-parser.mjs";
import { filterPluginRepos, toPluginRecord } from "./plugin-repo-metadata.mjs";
import { syncReadmeImages } from "./readme-image-assets.mjs";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_OWNER = "matt-riley";
const GITHUB_API_VERSION = "2022-11-28";
const TOOL_README_TOKEN =
  process.env.TOOL_REPOS_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

function createUnavailableReadme() {
  return {
    markdown: null,
    htmlUrl: null,
    downloadUrl: null,
    images: [],
  };
}

export function buildGitHubHeaders(token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "mattriley.tools data generator",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function formatGitHubApiError(status, statusText, body) {
  const message = typeof body?.message === "string" ? ` - ${body.message}` : "";
  const authHint =
    status === 401 || status === 403
      ? ". Set GITHUB_TOKEN or GH_TOKEN to avoid low unauthenticated rate limits."
      : "";

  return `GitHub repo fetch failed: ${status} ${statusText}${message}${authHint}`;
}

export function extractGitHubRepository(urlString) {
  try {
    const url = new URL(urlString);

    if (url.hostname !== "github.com") {
      return null;
    }

    const pathSegments = url.pathname
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean);

    if (pathSegments.length !== 2) {
      return null;
    }

    return {
      owner: pathSegments[0],
      repo: pathSegments[1],
    };
  } catch {
    return null;
  }
}

function stripUrlSearchAndHash(urlString) {
  if (typeof urlString !== "string") {
    return null;
  }

  const url = new URL(urlString);
  url.search = "";
  url.hash = "";

  return url.toString();
}

function readTapPathFromArgs(argv) {
  const tapPathIndex = argv.indexOf("--tap-path");

  if (tapPathIndex === -1) {
    return null;
  }

  return argv[tapPathIndex + 1] ?? null;
}

async function readFormulas(formulaDir) {
  const entries = await readdir(formulaDir, { withFileTypes: true });
  const formulaFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".rb"))
    .map((entry) => entry.name)
    .sort();

  const tools = await Promise.all(
    formulaFiles.map(async (formulaFile) => {
      const formulaPath = join(formulaDir, formulaFile);
      const content = await readFile(formulaPath, "utf8");

      return parseFormula(content, formulaPath);
    }),
  );

  return tools;
}

async function fetchGitHubRepos(owner) {
  const repos = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${GITHUB_API_BASE_URL}/users/${owner}/repos?per_page=100&page=${page}&type=owner&sort=updated`,
      { headers: buildGitHubHeaders() },
    );

    if (!response.ok) {
      const errorBody = response.headers.get("content-type")?.includes("application/json")
        ? await response.json()
        : null;

      throw new Error(formatGitHubApiError(response.status, response.statusText, errorBody));
    }

    const pageRepos = await response.json();

    if (!Array.isArray(pageRepos)) {
      throw new TypeError("GitHub repo fetch returned a non-array response");
    }

    if (pageRepos.length === 0) {
      break;
    }

    repos.push(...pageRepos);
    page += 1;
  }

  return repos;
}

export async function fetchGitHubReadme(owner, repoName, token, options = {}) {
  const {
    fetchImpl = fetch,
    outputDir = resolve(process.cwd(), "public/generated/readme-images"),
  } = options;
  const headers = buildGitHubHeaders(token);
  const response = await fetchImpl(`${GITHUB_API_BASE_URL}/repos/${owner}/${repoName}/readme`, {
    headers,
  });

  if (response.status === 404) {
    return createUnavailableReadme();
  }

  if (!response.ok) {
    const errorBody = response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : null;
    const message = typeof errorBody?.message === "string" ? ` - ${errorBody.message}` : "";

    throw new Error(
      `GitHub README fetch failed for ${owner}/${repoName}: ${response.status} ${response.statusText}${message}`,
    );
  }

  const readme = await response.json();

  if (typeof readme?.content !== "string") {
    throw new TypeError(`GitHub README fetch for ${owner}/${repoName} returned no content`);
  }

  const markdown = Buffer.from(readme.content.replace(/\n/g, ""), "base64").toString("utf8");
  const downloadUrl = stripUrlSearchAndHash(readme.download_url);

  return {
    markdown,
    htmlUrl: typeof readme.html_url === "string" ? readme.html_url : null,
    downloadUrl,
    images: await syncReadmeImages({
      owner,
      repo: repoName,
      markdown,
      downloadUrl,
      outputDir,
      fetchImpl,
      headers,
    }),
  };
}

async function fetchLatestGitHubTag(owner, repoName) {
  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${owner}/${repoName}/tags?per_page=1`,
    {
      headers: buildGitHubHeaders(),
    },
  );

  if (!response.ok) {
    const errorBody = response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : null;
    const message = typeof errorBody?.message === "string" ? ` - ${errorBody.message}` : "";

    throw new Error(
      `GitHub tag fetch failed for ${owner}/${repoName}: ${response.status} ${response.statusText}${message}`,
    );
  }

  const tags = await response.json();

  if (!Array.isArray(tags)) {
    throw new TypeError(`GitHub tag fetch for ${owner}/${repoName} returned a non-array response`);
  }

  return typeof tags[0]?.name === "string" && tags[0].name.length > 0 ? tags[0].name : "Unreleased";
}

async function fetchGitHubReadmeWithFallback(owner, repoName, token, outputDir) {
  try {
    return await fetchGitHubReadme(owner, repoName, token, { outputDir });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.warn(`Skipping README sync for ${owner}/${repoName}: ${message}`);

    return createUnavailableReadme();
  }
}

async function writeGeneratedModule(
  outputPath,
  timestampExportName,
  collectionExportName,
  data,
  generatedAt,
) {
  const fileContents = `// This file is generated by \`pnpm run generate:data\`. Do not edit by hand.\nexport const ${timestampExportName} = ${JSON.stringify(generatedAt)};\n\nexport const ${collectionExportName} = ${JSON.stringify(data, null, 2)} as const;\n`;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, fileContents);
}

async function main() {
  const explicitTapPath = readTapPathFromArgs(process.argv);
  const configuredTapPath = explicitTapPath ?? process.env.HOMEBREW_TAP_PATH;
  const tapPath = configuredTapPath
    ? resolve(configuredTapPath)
    : resolve(process.cwd(), "../homebrew-tools");
  const formulaDir = join(tapPath, "Formula");
  const dataDir = resolve(process.cwd(), "src/data");
  const publicReadmeImageDir = resolve(process.cwd(), "public/generated/readme-images");
  const toolsOutputPath = join(dataDir, "tools.generated.ts");
  const pluginsOutputPath = join(dataDir, "plugins.generated.ts");
  const parsedTools = await readFormulas(formulaDir);
  const tools = await Promise.all(
    parsedTools.map(async (tool) => {
      const repository = extractGitHubRepository(tool.homepage);

      return {
        ...tool,
        readme: repository
          ? await fetchGitHubReadmeWithFallback(
              repository.owner,
              repository.repo,
              TOOL_README_TOKEN,
              publicReadmeImageDir,
            )
          : createUnavailableReadme(),
      };
    }),
  );
  const pluginRepos = filterPluginRepos(await fetchGitHubRepos(GITHUB_OWNER));
  const plugins = await Promise.all(
    pluginRepos.map(async (repo) => ({
      ...toPluginRecord(repo, await fetchLatestGitHubTag(GITHUB_OWNER, repo.name)),
      readme: await fetchGitHubReadmeWithFallback(
        GITHUB_OWNER,
        repo.name,
        undefined,
        publicReadmeImageDir,
      ),
    })),
  );
  const generatedAt = new Date().toISOString();

  await Promise.all([
    writeGeneratedModule(toolsOutputPath, "generatedAt", "tools", tools, generatedAt),
    writeGeneratedModule(pluginsOutputPath, "pluginsGeneratedAt", "plugins", plugins, generatedAt),
  ]);

  console.log(`Generated ${tools.length} tools from ${formulaDir}`);
  console.log(`Generated ${plugins.length} plugins from GitHub repositories under ${GITHUB_OWNER}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
