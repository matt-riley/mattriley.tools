import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
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
 * @returns {string}
 */
function extensionForSource(source) {
  try {
    const url = new URL(source);
    const extension = extname(url.pathname);

    return extension || ".bin";
  } catch {
    return ".bin";
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

  const matches = [];

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_PATTERN)) {
    const resolved = resolveImageSource(match[1], downloadUrl);

    if (resolved) {
      matches.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, source: resolved });
    }
  }

  for (const match of markdown.matchAll(HTML_IMAGE_PATTERN)) {
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
 * @param {{
 *   owner: string;
 *   repo: string;
 *   source: string;
 *   outputDir: string;
 *   fetchImpl?: typeof fetch;
 *   headers?: Record<string, string>;
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
}) {
  const response = await fetchImpl(source, {
    headers: getDownloadHeaders(source, headers),
  });

  if (!response.ok) {
    return null;
  }

  const bytes = await response.arrayBuffer();
  const extension = extensionForSource(source);
  const filename = `${createHash("sha256").update(source).digest("hex")}${extension}`;
  const relativePathSegments = [sanitizePathSegment(owner), sanitizePathSegment(repo), filename];
  const relativePath = relativePathSegments.join("/");
  const outputPath = join(outputDir, ...relativePathSegments);

  await mkdir(join(outputDir, sanitizePathSegment(owner), sanitizePathSegment(repo)), {
    recursive: true,
  });
  await writeFile(outputPath, Buffer.from(bytes));

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
        });
      } catch {
        mirroredPath = null;
      }

      return { source, mirroredPath };
    }),
  );
}
