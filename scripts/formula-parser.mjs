import { basename } from "node:path";

// Formulas come from several publishers, so accept either Ruby quote style.
const QUOTED = String.raw`(["'])(.*?)\1`;
const BINARY_PATTERN = new RegExp(String.raw`bin\.install\s+${QUOTED}`, "g");
const DESC_PATTERN = new RegExp(String.raw`^\s*desc\s+${QUOTED}\s*$`, "m");
const HOMEPAGE_PATTERN = new RegExp(String.raw`^\s*homepage\s+${QUOTED}\s*$`, "m");
const LICENSE_PATTERN = new RegExp(String.raw`^\s*license\s+${QUOTED}\s*$`, "m");
const VERSION_PATTERN = new RegExp(String.raw`^\s*version\s+${QUOTED}\s*$`, "m");
const URL_PATTERN = new RegExp(String.raw`^\s*url\s+${QUOTED}`, "gm");

// Release asset names carry the platform, e.g. tool_Darwin_x86_64.tar.gz,
// tool_linux_arm64.tar.gz or tool-aarch64-macos.tar.gz.
const OS_PATTERN = /(?<![a-z])(darwin|macos|linux)(?![a-z])/;
const ARCH_PATTERN = /(?<![a-z0-9])(x86_64|amd64|aarch64|arm64)(?![a-z0-9])/;
const OS_KEYS = { darwin: "mac", macos: "mac", linux: "linux" };
const ARCH_KEYS = { x86_64: "amd64", amd64: "amd64", aarch64: "arm64", arm64: "arm64" };

function extractFirst(pattern, content) {
  return content.match(pattern)?.[2] ?? null;
}

function extractAll(pattern, content) {
  return [...content.matchAll(pattern)].map((match) => match[2]);
}

function detectPlatforms(content) {
  const targets = new Set();

  for (const url of extractAll(URL_PATTERN, content)) {
    const asset = basename(url).toLowerCase();
    const os = asset.match(OS_PATTERN)?.[1];
    const arch = asset.match(ARCH_PATTERN)?.[1];

    if (os && arch) {
      targets.add(`${OS_KEYS[os]}:${ARCH_KEYS[arch]}`);
    }
  }

  const macArchitectures = [];
  const linuxArchitectures = [];

  if (targets.has("mac:amd64")) {
    macArchitectures.push("Intel");
  }

  if (targets.has("mac:arm64")) {
    macArchitectures.push("Apple Silicon");
  }

  if (targets.has("linux:amd64")) {
    linuxArchitectures.push("x86_64");
  }

  if (targets.has("linux:arm64")) {
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
