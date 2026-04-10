import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { createHash } from "node:crypto";

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;

/**
 * @param {string} value
 * @returns {string}
 */
function sanitizePathSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

/**
 * @param {string} source
 * @returns {string | null}
 */
function extensionForSource(source) {
  try {
    const url = new URL(source);
    const extension = extname(url.pathname);

    return extension || null;
  } catch {
    return null;
  }
}

/**
 * @param {string | null} contentType
 * @returns {string | null}
 */
function extensionForContentType(contentType) {
  if (typeof contentType !== "string" || contentType.length === 0) {
    return null;
  }

  const mimeType = contentType.split(";")[0]?.trim().toLowerCase();

  switch (mimeType) {
    case "image/apng":
      return ".apng";
    case "image/avif":
      return ".avif";
    case "image/bmp":
      return ".bmp";
    case "image/gif":
      return ".gif";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/svg+xml":
      return ".svg";
    case "image/tiff":
      return ".tiff";
    case "image/vnd.microsoft.icon":
    case "image/x-icon":
      return ".ico";
    case "image/webp":
      return ".webp";
    default:
      return null;
  }
}

/**
 * @param {string} source
 * @returns {string | null}
 */
function normalizeImageSource(source) {
  if (typeof source !== "string" || source.length === 0) {
    return null;
  }

  return source.trim();
}

/**
 * @param {string} source
 * @param {string | null | undefined} downloadUrl
 * @returns {string | null}
 */
function resolveImageSource(source, downloadUrl) {
  const normalizedSource = normalizeImageSource(source);

  if (!normalizedSource) {
    return null;
  }

  try {
    const resolvedUrl = downloadUrl
      ? new URL(normalizedSource, downloadUrl)
      : new URL(normalizedSource);

    if (resolvedUrl.protocol !== "http:" && resolvedUrl.protocol !== "https:") {
      return null;
    }

    return resolvedUrl.toString();
  } catch {
    return null;
  }
}

/**
 * @param {{ markdown: string | null | undefined; downloadUrl: string | null | undefined }} input
 * @returns {string[]}
 */
export function resolveReadmeImageRefs({ markdown, downloadUrl }) {
  if (typeof markdown !== "string" || markdown.length === 0) {
    return [];
  }

  const uncommentedMarkdown = markdown.replace(/<!--[\s\S]*?-->/g, "");
  const matches = [];

  for (const match of uncommentedMarkdown.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const resolved = resolveImageSource(match[1], downloadUrl);

    if (resolved) {
      matches.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, source: resolved });
    }
  }

  for (const match of uncommentedMarkdown.matchAll(HTML_IMAGE_PATTERN)) {
    const resolved = resolveImageSource(match[2], downloadUrl);

    if (resolved) {
      matches.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, source: resolved });
    }
  }

  matches.sort((left, right) => left.index - right.index);

  return [...new Set(matches.map((match) => match.source))];
}

/**
 * @param {string} source
 * @param {Record<string, string> | undefined} headers
 * @returns {Record<string, string> | undefined}
 */
function getDownloadHeaders(source, headers) {
  if (!headers) {
    return undefined;
  }

  try {
    const { hostname } = new URL(source);

    if (
      hostname === "raw.githubusercontent.com" ||
      hostname === "github.com" ||
      hostname.endsWith(".githubusercontent.com")
    ) {
      return headers;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * @param {string} outputPath
 * @param {Uint8Array} bytes
 * @returns {Promise<void>}
 */
async function writeMirroredAsset(outputPath, bytes) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}

/**
 * @param {string} outputDir
 * @param {string} currentDir
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function listRelativeFiles(outputDir, currentDir = outputDir, prefix = "") {
  let entries;

  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const entryPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listRelativeFiles(outputDir, entryPath, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * @param {string} outputDir
 * @param {string} currentDir
 * @returns {Promise<void>}
 */
async function removeEmptyDirectories(outputDir, currentDir = outputDir) {
  let entries;

  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    await removeEmptyDirectories(outputDir, join(currentDir, entry.name));
  }

  if (currentDir === outputDir) {
    return;
  }

  const remainingEntries = await readdir(currentDir);

  if (remainingEntries.length === 0) {
    await rm(currentDir, { recursive: true, force: true });
  }
}

/**
 * @param {string | null | undefined} mirroredPath
 * @returns {string | null}
 */
function toRelativeMirroredPath(mirroredPath) {
  if (typeof mirroredPath !== "string" || mirroredPath.length === 0) {
    return null;
  }

  const normalizedPath = mirroredPath.replace(/^\/+/, "");
  const generatedPrefix = "generated/readme-images/";

  if (!normalizedPath.startsWith(generatedPrefix)) {
    return null;
  }

  return normalizedPath.slice(generatedPrefix.length);
}

/**
 * @param {{
 *   owner: string;
 *   repo: string;
 *   source: string;
 *   outputDir: string;
 *   fetchImpl?: typeof fetch;
 *   headers?: Record<string, string>;
 *   writeAssetImpl?: (outputPath: string, bytes: Uint8Array) => Promise<void>;
 * }} input
 * @returns {Promise<string | null>}
 */
export async function mirrorReadmeImage({
  owner,
  repo,
  source,
  outputDir,
  fetchImpl = fetch,
  headers,
  writeAssetImpl = writeMirroredAsset,
}) {
  const response = await fetchImpl(source, {
    headers: getDownloadHeaders(source, headers),
  });

  if (!response.ok) {
    return null;
  }

  const bytes = await response.arrayBuffer();
  const extension =
    extensionForSource(source) ??
    extensionForContentType(response.headers.get("content-type")) ??
    ".bin";
  const filename = `${createHash("sha256").update(source).digest("hex")}${extension}`;
  const relativePathSegments = [sanitizePathSegment(owner), sanitizePathSegment(repo), filename];
  const relativePath = relativePathSegments.join("/");
  const outputPath = join(outputDir, ...relativePathSegments);
  await writeAssetImpl(outputPath, Buffer.from(bytes));

  return `/generated/readme-images/${relativePath}`;
}

/**
 * @param {{
 *   owner: string;
 *   repo: string;
 *   markdown: string | null | undefined;
 *   downloadUrl: string | null | undefined;
 *   outputDir: string;
 *   fetchImpl?: typeof fetch;
 *   headers?: Record<string, string>;
 *   writeAssetImpl?: (outputPath: string, bytes: Uint8Array) => Promise<void>;
 * }} input
 * @returns {Promise<Array<{ source: string; mirroredPath: string | null }>>}
 */
export async function syncReadmeImages({
  owner,
  repo,
  markdown,
  downloadUrl,
  outputDir,
  fetchImpl = fetch,
  headers,
  writeAssetImpl = writeMirroredAsset,
}) {
  const sources = resolveReadmeImageRefs({ markdown, downloadUrl });

  return Promise.all(
    sources.map(async (source) => {
      let mirroredPath = null;

      try {
        mirroredPath = await mirrorReadmeImage({
          owner,
          repo,
          source,
          outputDir,
          fetchImpl,
          headers,
          writeAssetImpl,
        });
      } catch {
        mirroredPath = null;
      }

      return { source, mirroredPath };
    }),
  );
}

/**
 * @param {{
 *   outputDir: string;
 *   mirroredPaths: Array<string | null | undefined>;
 *   listRelativeFilesImpl?: (outputDir: string) => Promise<string[]>;
 *   removeFileImpl?: (filePath: string) => Promise<void>;
 *   removeEmptyDirectoriesImpl?: (outputDir: string) => Promise<void>;
 * }} input
 * @returns {Promise<void>}
 */
export async function pruneMirroredReadmeImages({
  outputDir,
  mirroredPaths,
  listRelativeFilesImpl = listRelativeFiles,
  removeFileImpl = async (filePath) => rm(filePath, { force: true }),
  removeEmptyDirectoriesImpl = removeEmptyDirectories,
}) {
  const referencedPaths = new Set(
    mirroredPaths.map((mirroredPath) => toRelativeMirroredPath(mirroredPath)).filter(Boolean),
  );
  const existingFiles = await listRelativeFilesImpl(outputDir);

  await Promise.all(
    existingFiles
      .filter((relativePath) => !referencedPaths.has(relativePath))
      .map((relativePath) => removeFileImpl(join(outputDir, relativePath))),
  );

  await removeEmptyDirectoriesImpl(outputDir);
}
