import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { createHash } from "node:crypto";

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;
const IMAGE_EXTENSION_BY_CONTENT_TYPE = {
  "image/apng": ".apng",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/tiff": ".tiff",
  "image/vnd.microsoft.icon": ".ico",
  "image/webp": ".webp",
  "image/x-icon": ".ico",
};

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

  return mimeType ? (IMAGE_EXTENSION_BY_CONTENT_TYPE[mimeType] ?? null) : null;
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

function isMissingDirectoryError(error) {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function readDirectory(path, options) {
  try {
    return await readdir(path, options);
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * @param {string} outputDir
 * @param {string} currentDir
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function listRelativeFiles(outputDir, currentDir = outputDir, prefix = "") {
  const entries = await readDirectory(currentDir, { withFileTypes: true });

  if (!entries) {
    return [];
  }

  const nestedFiles = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        return listRelativeFiles(outputDir, join(currentDir, entry.name), relativePath);
      }),
  );

  return [
    ...entries
      .filter((entry) => entry.isFile())
      .map((entry) => (prefix ? `${prefix}/${entry.name}` : entry.name)),
    ...nestedFiles.flat(),
  ];
}

/**
 * @param {string} outputDir
 * @param {string} currentDir
 * @returns {Promise<void>}
 */
async function removeEmptyDirectories(outputDir, currentDir = outputDir) {
  const entries = await readDirectory(currentDir, { withFileTypes: true });

  if (!entries) {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => removeEmptyDirectories(outputDir, join(currentDir, entry.name))),
  );

  if (currentDir === outputDir) {
    return;
  }

  const remainingEntries = await readDirectory(currentDir);

  if (!remainingEntries || remainingEntries.length === 0) {
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
async function mirrorReadmeImage({
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
