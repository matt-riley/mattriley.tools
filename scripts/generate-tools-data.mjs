import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseFormula } from "./formula-parser.mjs";
import { filterPluginRepos, toPluginRecord } from "./plugin-repo-metadata.mjs";
import { pruneMirroredReadmeImages, syncReadmeImages } from "./readme-image-assets.mjs";

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

async function readGitHubJson(response, errorPrefix) {
  if (!response.ok) {
    const errorBody = response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : null;
    const message = typeof errorBody?.message === "string" ? ` - ${errorBody.message}` : "";

    throw new Error(`${errorPrefix}: ${response.status} ${response.statusText}${message}`);
  }

  return response.json();
}

function parseGitHubRepositoryVisibility(repo, owner, repoName) {
  if (typeof repo?.private !== "boolean") {
    throw new TypeError(
      `GitHub repository visibility fetch for ${owner}/${repoName} returned no private flag`,
    );
  }

  if (typeof repo?.archived !== "boolean") {
    throw new TypeError(
      `GitHub repository visibility fetch for ${owner}/${repoName} returned no archived flag`,
    );
  }

  return {
    isPublic: repo.private === false,
    isArchived: repo.archived,
  };
}

export async function fetchGitHubRepositoryVisibility(owner, repoName, token, options = {}) {
  const { fetchImpl = fetch } = options;
  const response = await fetchImpl(`${GITHUB_API_BASE_URL}/repos/${owner}/${repoName}`, {
    headers: buildGitHubHeaders(token),
  });

  if (response.status === 404) {
    return { isPublic: false };
  }

  const repo = await readGitHubJson(
    response,
    `GitHub repository visibility fetch failed for ${owner}/${repoName}`,
  );

  return parseGitHubRepositoryVisibility(repo, owner, repoName);
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

function readPathFromArgs(argv, optionName) {
  const optionIndex = argv.indexOf(optionName);

  if (optionIndex === -1) {
    return null;
  }

  return argv[optionIndex + 1] ?? null;
}

function readTapPathFromArgs(argv) {
  return readPathFromArgs(argv, "--tap-path");
}

function readSkillsPathFromArgs(argv) {
  return readPathFromArgs(argv, "--skills-path");
}

function parseYamlScalarValue(rawValue) {
  const value = rawValue.replace(/\s+#.*$/u, "").trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function appendYamlContinuation(container, key, rawValue) {
  const previous = typeof container[key] === "string" ? container[key] : "";
  const next = parseYamlScalarValue(rawValue);
  container[key] = `${previous} ${next}`.trim();
}

function parseYamlPair(line) {
  const pair = /^([A-Za-z0-9_-]+):(.*)$/u.exec(line);

  return pair ? { key: pair[1], rawValue: pair[2] } : null;
}

function setTopLevelYamlValue(parsed, pair) {
  const value = parseYamlScalarValue(pair.rawValue);
  parsed[pair.key] = value || {};

  return pair.key;
}

function canSetNestedYamlValue(indent, pair, currentTopLevelKey, currentValue) {
  return (
    indent > 0 &&
    pair !== null &&
    currentTopLevelKey !== null &&
    typeof currentValue === "object" &&
    currentValue !== null
  );
}

function setNestedYamlValue(currentValue, pair) {
  currentValue[pair.key] = parseYamlScalarValue(pair.rawValue);

  return pair.key;
}

function appendYamlValue(parsed, currentTopLevelKey, currentValue, currentNestedKey, trimmed) {
  if (!currentTopLevelKey) {
    return;
  }

  if (typeof currentValue === "object" && currentValue !== null && currentNestedKey) {
    appendYamlContinuation(currentValue, currentNestedKey, trimmed);
    return;
  }

  appendYamlContinuation(parsed, currentTopLevelKey, trimmed);
}

function parseSimpleYamlFrontmatter(frontmatter) {
  const parsed = {};
  let currentTopLevelKey = null;
  let currentNestedKey = null;

  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const indent = rawLine.length - rawLine.trimStart().length;
    const pair = parseYamlPair(trimmed);

    if (indent === 0 && pair) {
      currentTopLevelKey = setTopLevelYamlValue(parsed, pair);
      currentNestedKey = null;
      continue;
    }

    const currentValue = currentTopLevelKey ? parsed[currentTopLevelKey] : null;

    if (canSetNestedYamlValue(indent, pair, currentTopLevelKey, currentValue)) {
      currentNestedKey = setNestedYamlValue(currentValue, pair);
      continue;
    }

    appendYamlValue(parsed, currentTopLevelKey, currentValue, currentNestedKey, trimmed);
  }

  return parsed;
}

function parseSkillMarkdown(markdown, sourcePath) {
  const frontmatterMatch = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u.exec(markdown);

  if (!frontmatterMatch) {
    throw new Error(`Skill file ${sourcePath} must start with YAML frontmatter`);
  }

  return {
    frontmatter: parseSimpleYamlFrontmatter(frontmatterMatch[1]),
    body: frontmatterMatch[2].trimStart(),
  };
}

function readString(value, fallback = null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

async function readAgentSkills(skillsRootPath) {
  const skillsDir = join(skillsRootPath, "skills");
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skillDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    skillDirs.map(async (slug) => {
      const skillPath = join(skillsDir, slug, "SKILL.md");

      let content;
      try {
        content = await readFile(skillPath, "utf8");
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
      const { frontmatter, body } = parseSkillMarkdown(content, skillPath);
      const metadata =
        typeof frontmatter.metadata === "object" && frontmatter.metadata !== null
          ? frontmatter.metadata
          : {};
      const sourceUrl = `https://github.com/${GITHUB_OWNER}/agent-skills/blob/main/skills/${slug}/SKILL.md`;
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/agent-skills/main/skills/${slug}/SKILL.md`;

      return {
        slug,
        name: readString(frontmatter.name, slug),
        description: readString(frontmatter.description, "No description provided."),
        repository: `${GITHUB_OWNER}/agent-skills`,
        sourceUrl,
        rawUrl,
        license: readString(frontmatter.license),
        homepage: readString(frontmatter.homepage),
        compatibility: readString(
          frontmatter.compatibility,
          "Agent Skills-compatible coding agents.",
        ),
        version: readString(metadata.version, "Unversioned"),
        maturity: readString(metadata.maturity, "Unknown"),
        readme: {
          markdown: body,
          htmlUrl: sourceUrl,
          downloadUrl: rawUrl,
          images: [],
        },
      };
    }),
  ).then((results) => results.filter(Boolean));
}

export async function filterPublicToolsByRepository(tools, options = {}) {
  const {
    fetchRepositoryVisibility = (owner, repoName) =>
      fetchGitHubRepositoryVisibility(owner, repoName, TOOL_README_TOKEN),
  } = options;

  const visibilityResults = await Promise.all(
    tools.map(async (tool) => {
      const repository = extractGitHubRepository(tool.homepage);

      if (!repository) {
        return { tool, include: true };
      }

      const visibility = await fetchRepositoryVisibility(repository.owner, repository.repo);

      return {
        tool,
        include: visibility.isPublic && visibility.isArchived !== true,
      };
    }),
  );

  return visibilityResults.filter((result) => result.include).map((result) => result.tool);
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

function parseGitHubReadme(readme, owner, repoName) {
  if (typeof readme?.content !== "string") {
    throw new TypeError(`GitHub README fetch for ${owner}/${repoName} returned no content`);
  }

  return {
    markdown: Buffer.from(readme.content.replace(/\n/g, ""), "base64").toString("utf8"),
    htmlUrl: typeof readme.html_url === "string" ? readme.html_url : null,
    downloadUrl: stripUrlSearchAndHash(readme.download_url),
  };
}

export async function fetchGitHubReadme(owner, repoName, token, options = {}) {
  const {
    fetchImpl = fetch,
    outputDir = resolve(process.cwd(), "public/generated/readme-images"),
    writeAssetImpl,
  } = options;
  const headers = buildGitHubHeaders(token);
  const response = await fetchImpl(`${GITHUB_API_BASE_URL}/repos/${owner}/${repoName}/readme`, {
    headers,
  });

  if (response.status === 404) {
    return createUnavailableReadme();
  }

  const readme = parseGitHubReadme(
    await readGitHubJson(response, `GitHub README fetch failed for ${owner}/${repoName}`),
    owner,
    repoName,
  );

  return {
    ...readme,
    images: await syncReadmeImages({
      owner,
      repo: repoName,
      markdown: readme.markdown,
      downloadUrl: readme.downloadUrl,
      outputDir,
      fetchImpl,
      headers,
      writeAssetImpl,
    }),
  };
}

function parseLatestGitHubTag(tags, owner, repoName) {
  if (!Array.isArray(tags)) {
    throw new TypeError(`GitHub tag fetch for ${owner}/${repoName} returned a non-array response`);
  }

  return typeof tags[0]?.name === "string" && tags[0].name.length > 0 ? tags[0].name : "Unreleased";
}

async function fetchLatestGitHubTag(owner, repoName) {
  const response = await fetch(
    `${GITHUB_API_BASE_URL}/repos/${owner}/${repoName}/tags?per_page=1`,
    {
      headers: buildGitHubHeaders(),
    },
  );

  return parseLatestGitHubTag(
    await readGitHubJson(response, `GitHub tag fetch failed for ${owner}/${repoName}`),
    owner,
    repoName,
  );
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
  const explicitSkillsPath = readSkillsPathFromArgs(process.argv);
  const configuredTapPath = explicitTapPath ?? process.env.HOMEBREW_TAP_PATH;
  const configuredSkillsPath = explicitSkillsPath ?? process.env.AGENT_SKILLS_PATH;
  const tapPath = configuredTapPath
    ? resolve(configuredTapPath)
    : resolve(process.cwd(), "../homebrew-tools");
  const skillsPath = configuredSkillsPath
    ? resolve(configuredSkillsPath)
    : resolve(process.cwd(), "../agent-skills");
  const formulaDir = join(tapPath, "Formula");
  const dataDir = resolve(process.cwd(), "src/data");
  const publicReadmeImageDir = resolve(process.cwd(), "public/generated/readme-images");
  const toolsOutputPath = join(dataDir, "tools.generated.ts");
  const pluginsOutputPath = join(dataDir, "plugins.generated.ts");
  const templatesOutputPath = join(dataDir, "templates.generated.ts");
  const skillsOutputPath = join(dataDir, "skills.generated.ts");
  const parsedTools = await readFormulas(formulaDir);
  const publicTools = await filterPublicToolsByRepository(parsedTools);
  const githubRepos = await fetchGitHubRepos(GITHUB_OWNER);
  const tools = await Promise.all(
    publicTools.map(async (tool) => {
      const repository = extractGitHubRepository(tool.homepage);
      const repoData = repository ? githubRepos.find((r) => r.name === repository.repo) : null;

      return {
        ...tool,
        homepage: repoData?.homepage || tool.homepage,
        license: tool.license || repoData?.license?.spdx_id || null,
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
  const pluginRepos = filterPluginRepos(githubRepos);
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
  const templateRepos = githubRepos
    .filter((repo) => repo.private !== true && repo.archived !== true && repo.is_template === true)
    .sort((left, right) => left.name.localeCompare(right.name));
  const templates = await Promise.all(
    templateRepos.map(async (repo) => ({
      slug: repo.name,
      name: repo.name,
      description: repo.description ?? "No description provided.",
      repository: repo.full_name,
      homepage: repo.homepage || repo.html_url,
      updatedAt: repo.pushed_at,
      language: repo.language,
      topics: repo.topics ?? [],
      readme: await fetchGitHubReadmeWithFallback(
        GITHUB_OWNER,
        repo.name,
        undefined,
        publicReadmeImageDir,
      ),
    })),
  );
  const skills = await readAgentSkills(skillsPath);
  const generatedAt = new Date().toISOString();
  const mirroredPaths = [...tools, ...plugins, ...templates, ...skills].flatMap((entry) =>
    entry.readme.images.map((image) => image.mirroredPath),
  );

  await pruneMirroredReadmeImages({
    outputDir: publicReadmeImageDir,
    mirroredPaths,
  });

  await Promise.all([
    writeGeneratedModule(toolsOutputPath, "generatedAt", "tools", tools, generatedAt),
    writeGeneratedModule(pluginsOutputPath, "pluginsGeneratedAt", "plugins", plugins, generatedAt),
    writeGeneratedModule(
      templatesOutputPath,
      "templatesGeneratedAt",
      "templates",
      templates,
      generatedAt,
    ),
    writeGeneratedModule(skillsOutputPath, "skillsGeneratedAt", "skills", skills, generatedAt),
  ]);

  console.log(`Generated ${tools.length} tools from ${formulaDir}`);
  console.log(`Generated ${plugins.length} plugins from GitHub repositories under ${GITHUB_OWNER}`);
  console.log(
    `Generated ${templates.length} templates from GitHub repositories under ${GITHUB_OWNER}`,
  );
  console.log(`Generated ${skills.length} agent skills from ${join(skillsPath, "skills")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
