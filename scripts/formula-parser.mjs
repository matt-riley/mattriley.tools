import { basename } from "node:path";

const BINARY_PATTERN = /bin\.install\s+"([^"]+)"/g;
const DESC_PATTERN = /^\s*desc\s+"([^"]+)"/m;
const HOMEPAGE_PATTERN = /^\s*homepage\s+"([^"]+)"/m;
const LICENSE_PATTERN = /^\s*license\s+"([^"]+)"/m;
const VERSION_PATTERN = /^\s*version\s+"([^"]+)"/m;

function extractFirst(pattern, content) {
  return content.match(pattern)?.[1] ?? null;
}

function extractAll(pattern, content) {
  return [...content.matchAll(pattern)].map((match) => match[1]);
}

function detectPlatforms(content) {
  const macArchitectures = [];
  const linuxArchitectures = [];

  if (/(Darwin_x86_64|darwin_amd64)/.test(content)) {
    macArchitectures.push("Intel");
  }

  if (/(Darwin_arm64|darwin_arm64)/.test(content)) {
    macArchitectures.push("Apple Silicon");
  }

  if (/(Linux_x86_64|linux_amd64)/.test(content)) {
    linuxArchitectures.push("x86_64");
  }

  if (/(Linux_arm64|linux_arm64)/.test(content)) {
    linuxArchitectures.push("arm64");
  }

  const platforms = [];

  if (macArchitectures.length > 0) {
    platforms.push(`macOS (${macArchitectures.join(", ")})`);
  }

  if (linuxArchitectures.length > 0) {
    platforms.push(`Linux (${linuxArchitectures.join(", ")})`);
  }

  return platforms;
}

export function parseFormula(content, formulaPath) {
  const formulaFile = basename(formulaPath);
  const slug = formulaFile.replace(/\.rb$/, "");
  const description = extractFirst(DESC_PATTERN, content);
  const homepage = extractFirst(HOMEPAGE_PATTERN, content);
  const version = extractFirst(VERSION_PATTERN, content);
  const binaryNames = [...new Set(extractAll(BINARY_PATTERN, content))];
  const platforms = detectPlatforms(content);

  if (!description || !homepage || !version) {
    throw new Error(`Failed to parse required metadata from ${formulaFile}`);
  }

  return {
    slug,
    name: slug,
    description,
    homepage,
    version,
    license: extractFirst(LICENSE_PATTERN, content),
    installCommand: `brew install matt-riley/tools/${slug}`,
    binaryNames,
    platforms,
    formulaFile: `Formula/${formulaFile}`,
  };
}
