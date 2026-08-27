import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { getSingletonHighlighter } from "shiki";
import bashLang from "shiki/langs/bash.mjs";
import cssLang from "shiki/langs/css.mjs";
import diffLang from "shiki/langs/diff.mjs";
import dockerLang from "shiki/langs/docker.mjs";
import fishLang from "shiki/langs/fish.mjs";
import goLang from "shiki/langs/go.mjs";
import htmlLang from "shiki/langs/html.mjs";
import iniLang from "shiki/langs/ini.mjs";
import jsLang from "shiki/langs/javascript.mjs";
import jsonLang from "shiki/langs/json.mjs";
import luaLang from "shiki/langs/lua.mjs";
import makefileLang from "shiki/langs/makefile.mjs";
import markdownLang from "shiki/langs/markdown.mjs";
import pythonLang from "shiki/langs/python.mjs";
import rustLang from "shiki/langs/rust.mjs";
import sqlLang from "shiki/langs/sql.mjs";
import tomlLang from "shiki/langs/toml.mjs";
import tsLang from "shiki/langs/typescript.mjs";
import yamlLang from "shiki/langs/yaml.mjs";
import zigLang from "shiki/langs/zig.mjs";
import tokyoNightTheme from "shiki/themes/tokyo-night.mjs";

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

/*
 * Build-time syntax highlighting. The highlighter loads once at module
 * init (static site generation runs in Node) and colors are baked into
 * the HTML — no client-side highlighting script is shipped.
 *
 * Highlighting runs AFTER sanitize-html so token <span style=...>
 * markup cannot be smuggled in by README content.
 */
const highlighter = await getSingletonHighlighter({
  themes: [tokyoNightTheme],
  langs: [
    bashLang,
    cssLang,
    diffLang,
    dockerLang,
    fishLang,
    goLang,
    htmlLang,
    iniLang,
    jsLang,
    jsonLang,
    luaLang,
    makefileLang,
    markdownLang,
    pythonLang,
    rustLang,
    sqlLang,
    tomlLang,
    tsLang,
    yamlLang,
    zigLang,
  ],
});

const languageAliases: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  py: "python",
  js: "javascript",
  ts: "typescript",
  jsonc: "json",
  yml: "yaml",
  md: "markdown",
  dockerfile: "docker",
};

const highlightCache = new Map<string, string>();

/* marked escapes code content; shiki needs the raw text. */
function decodeCodeEntities(code: string): string {
  return code
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function highlightCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code class="language-([a-z0-9]+)">([\s\S]*?)<\/code><\/pre>/g,
    (whole, rawLang: string, code: string) => {
      const lang = languageAliases[rawLang] ?? rawLang;
      const cacheKey = `${lang}\u0000${code}`;
      const cached = highlightCache.get(cacheKey);
      if (cached) return cached;

      try {
        const highlighted = highlighter.codeToHtml(decodeCodeEntities(code), {
          lang,
          theme: "tokyo-night",
        });
        // The site owns the pre styling; drop shiki's background/foreground.
        const cleaned = highlighted.replace(
          /<pre class="shiki[^"]*" style="[^"]*" tabindex="0">/,
          '<pre class="shiki">',
        );
        highlightCache.set(cacheKey, cleaned);
        return cleaned;
      } catch {
        // Unregistered language or unparsable payload: keep the plain block.
        return whole;
      }
    },
  );
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

  return highlightCodeBlocks(
    sanitizeHtml(rendered, {
      allowedTags: [
        "a",
        "blockquote",
        "br",
        "code",
        "del",
        "em",
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
        code: ["class"],
        img: ["alt", "src", "title"],
        pre: ["class"],
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
    }),
  );
}
