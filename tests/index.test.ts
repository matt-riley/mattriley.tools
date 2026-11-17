import { describe, expect, it } from "vitest";

import indexPageSource from "../src/pages/index.astro?raw";
import generatorSource from "../scripts/generate-tools-data.mjs?raw";
import templateDetailPageSource from "../src/pages/templates/[slug].astro?raw";
import { collections, plates } from "../src/data/exhibition";
import { templatesGeneratedAt } from "../src/data/templates.generated";
import { generatedAt, tools } from "../src/data/tools.generated";
import { plugins, pluginsGeneratedAt } from "../src/data/plugins.generated";

function hasValidReadmeImageShape(image: unknown) {
  const readmeImage = image as { source?: unknown; mirroredPath?: unknown };

  return (
    typeof readmeImage.source === "string" &&
    (typeof readmeImage.mirroredPath === "string" || readmeImage.mirroredPath === null)
  );
}

function hasSyncedReadmeMetadata(entry: unknown) {
  const readme = (entry as { readme?: unknown }).readme as {
    markdown?: unknown;
    htmlUrl?: unknown;
    downloadUrl?: unknown;
    images?: unknown;
  };

  return (
    typeof readme === "object" &&
    readme !== null &&
    "markdown" in readme &&
    "htmlUrl" in readme &&
    "downloadUrl" in readme &&
    Array.isArray(readme.images) &&
    readme.images.every(hasValidReadmeImageShape)
  );
}

describe("generated site data", () => {
  it("includes at least one tool", () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it("includes at least one plugin", () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  it("uses unique slugs", () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses unique plugin slugs", () => {
    const slugs = plugins.map((plugin) => plugin.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("stores install commands for the matt-riley/tools tap", () => {
    expect(
      tools.every((tool) => tool.installCommand.startsWith("brew install matt-riley/tools/")),
    ).toBe(true);
  });

  it("stores install snippets for every plugin", () => {
    expect(
      plugins.every(
        (plugin) =>
          plugin.lazyInstallSnippet.includes(plugin.repository) &&
          plugin.vimPackInstallSnippet.includes(plugin.homepage),
      ),
    ).toBe(true);
  });

  it("stores a version for every plugin", () => {
    expect(
      plugins.every((plugin) => typeof plugin.version === "string" && plugin.version.length > 0),
    ).toBe(true);
  });

  it("stores bare version strings (no leading v) so cards never render vv0.1", () => {
    const all = [...tools, ...plugins];
    expect(all.every((entry) => !/^v/i.test(entry.version))).toBe(true);
  });

  it("stores synced README metadata for every tool and plugin", () => {
    expect(tools.every(hasSyncedReadmeMetadata)).toBe(true);
    expect(plugins.every(hasSyncedReadmeMetadata)).toBe(true);
    expect([...tools, ...plugins].some((entry) => typeof entry.readme.markdown === "string")).toBe(
      true,
    );
  });

  it("includes template data in the generator contract", () => {
    expect(generatorSource).toContain('join(dataDir, "templates.generated.ts")');
    expect(generatorSource).toContain("templatesGeneratedAt");
    expect(generatorSource).toContain("templates");
  });

  it("has static template detail pages", () => {
    expect(templateDetailPageSource).toContain("export function getStaticPaths()");
    expect(templateDetailPageSource).toContain('from "../../data/templates.generated"');
  });

  it("indexes every current collection and links portraits to real entries", () => {
    expect(collections.map((c) => c.id)).toEqual([
      "homebrew-tools",
      "neovim-plugins",
      "public-templates",
    ]);
    expect(indexPageSource).toContain("collections.map");
    expect(
      plates.every((p) =>
        collections.some(
          (c) => c.route === p.route && c.entries.some((entry) => entry.slug === p.id),
        ),
      ),
    ).toBe(true);
    expect(generatorSource).not.toContain("skills.generated.ts");
  });

  it("records the last generation timestamps", () => {
    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(pluginsGeneratedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(templatesGeneratedAt))).toBe(false);
  });
});
