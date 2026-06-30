import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface SyncedReadmeImage {
  source: string;
  mirroredPath: string | null;
}

export interface SyncedReadme {
  markdown: string | null;
  htmlUrl: string | null;
  downloadUrl: string | null;
  images: readonly SyncedReadmeImage[];
}

function resolveReadmeUrl(href: string, baseUrl: string | null) {
  if (href.startsWith("#")) {
    return href;
  }

  try {
    return new URL(href).toString();
  } catch {
    if (!baseUrl) {
      return href;
    }

    return new URL(href, baseUrl).toString();
  }
}

function isMirroredReadmeImagePath(src: string | null): src is string {
  return typeof src === "string" && src.startsWith("/generated/readme-images/");
}

function rewriteReadmeImageSource(
  src: string | undefined,
  baseUrl: string | null,
  imageMap: ReadonlyMap<string, string>,
  allowedRemoteSources: ReadonlySet<string>,
  allowedMirroredPaths: ReadonlySet<string>,
) {
  if (!src) {
    return src;
  }

  if (allowedMirroredPaths.has(src)) {
    return src;
  }

  if (allowedRemoteSources.has(src)) {
    return imageMap.get(src) ?? src;
  }

  const resolvedSrc = resolveReadmeUrl(src, baseUrl);

  if (allowedRemoteSources.has(resolvedSrc)) {
    return imageMap.get(resolvedSrc) ?? resolvedSrc;
  }

  return resolvedSrc;
}

export function renderReadme(readme: SyncedReadme) {
  if (!readme.markdown) {
    return "";
  }

  const allowedRemoteSources = new Set(readme.images.map((image) => image.source));
  const allowedMirroredPaths = new Set(
    readme.images
      .map((image) => image.mirroredPath)
      .filter((path): path is string => isMirroredReadmeImagePath(path)),
  );
  const imageMap = new Map(
    readme.images.map((image): [string, string] => [
      image.source,
      isMirroredReadmeImagePath(image.mirroredPath) ? image.mirroredPath : image.source,
    ]),
  );
  const allowedImageSources = new Set([...allowedRemoteSources, ...allowedMirroredPaths]);

  /*
   * Builds a human-readable alt text from an image filename when the
   * upstream alt text is empty. This prevents the seo-graph integration from
   * failing the validateImageAlt check on README images that lack alt text.
   */
  const fallbackAltText = (filename: string | undefined): string => {
    if (!filename || filename.length === 0) return "";
    const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
    return base.replace(/[-_]+/g, " ").trim();
  };

  const parser = new Marked({
    async: false,
    gfm: true,
    walkTokens(token) {
      if (token.type === "heading" && token.depth < 6) {
        token.depth = (token.depth + 1) as 2 | 3 | 4 | 5 | 6;
      }

      if (token.type === "link") {
        token.href = resolveReadmeUrl(token.href, readme.htmlUrl);
      }

      if (token.type === "image") {
        token.href =
          rewriteReadmeImageSource(
            token.href,
            readme.downloadUrl,
            imageMap,
            allowedRemoteSources,
            allowedMirroredPaths,
          ) ?? token.href;
      }
    },
  });

  const rendered = parser.parse(readme.markdown);

  if (rendered instanceof Promise) {
    throw new TypeError("README rendering unexpectedly returned a promise");
  }

  return sanitizeHtml(rendered, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "del",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      img: ["alt", "src", "title"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          src:
            rewriteReadmeImageSource(
              attribs.src,
              readme.downloadUrl,
              imageMap,
              allowedRemoteSources,
              allowedMirroredPaths,
            ) ?? attribs.src,
          alt: attribs.alt || fallbackAltText(attribs.src),
        },
      }),
    },
    exclusiveFilter(frame) {
      return frame.tag === "img" && !allowedImageSources.has(frame.attribs.src);
    },
  });
}
