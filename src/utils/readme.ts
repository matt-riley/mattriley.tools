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

function isAllowedReadmeImageSource(
  src: string | undefined,
  allowedSources: Set<string>,
) {
  if (!src) {
    return false;
  }

  if (src.startsWith("/generated/readme-images/")) {
    return true;
  }

  if (allowedSources.has(src)) {
    return true;
  }

  return false;
}

export function renderReadme(readme: SyncedReadme) {
  if (!readme.markdown) {
    return "";
  }

  const imageMap = new Map(
    readme.images.map((image) => [image.source, image.mirroredPath ?? image.source]),
  );
  const allowedImageSources = new Set(imageMap.values());

  const parser = new Marked({
    async: false,
    gfm: true,
    walkTokens(token) {
      if (token.type === "link") {
        token.href = resolveReadmeUrl(token.href, readme.htmlUrl);
      }

      if (token.type === "image") {
        const resolvedSrc = resolveReadmeUrl(token.href, readme.downloadUrl);
        token.href = imageMap.get(resolvedSrc) ?? resolvedSrc;
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
    exclusiveFilter(frame) {
      return (
        frame.tag === "img" &&
        !isAllowedReadmeImageSource(frame.attribs.src, allowedImageSources)
      );
    },
  });
}
