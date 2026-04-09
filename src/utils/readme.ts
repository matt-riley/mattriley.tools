import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface SyncedReadme {
  markdown: string | null;
  htmlUrl: string | null;
  downloadUrl: string | null;
}

const ALLOWED_IMAGE_HOSTS = new Set([
  "avatars.githubusercontent.com",
  "github.com",
  "private-user-images.githubusercontent.com",
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
]);

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

function isAllowedReadmeImageSource(src: string | undefined) {
  if (!src) {
    return false;
  }

  try {
    const url = new URL(src);

    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function renderReadme(readme: SyncedReadme) {
  if (!readme.markdown) {
    return "";
  }

  const parser = new Marked({
    async: false,
    gfm: true,
    walkTokens(token) {
      if (token.type === "link") {
        token.href = resolveReadmeUrl(token.href, readme.htmlUrl);
      }

      if (token.type === "image") {
        token.href = resolveReadmeUrl(token.href, readme.downloadUrl);
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
      return frame.tag === "img" && !isAllowedReadmeImageSource(frame.attribs.src);
    },
  });
}
