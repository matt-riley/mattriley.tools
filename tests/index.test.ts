import { describe, expect, it } from "vitest";

import indexPageSource from "../src/pages/index.astro?raw";
import { generatedAt, tools } from "../src/data/tools.generated";
import { plugins, pluginsGeneratedAt } from "../src/data/plugins.generated";

function hasValidReadmeImageShape(image: unknown) {
  const readmeImage = image as { source?: unknown; mirroredPath?: unknown };

  return (
    typeof readmeImage.source === "string" &&
    (typeof readmeImage.mirroredPath === "string" || readmeImage.mirroredPath === null)
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

  it("stores synced README metadata for every tool and plugin", () => {
    expect(
      tools.every(
        (tool) =>
          typeof tool.readme === "object" &&
          "markdown" in tool.readme &&
          "htmlUrl" in tool.readme &&
          "downloadUrl" in tool.readme &&
          Array.isArray(tool.readme.images) &&
          tool.readme.images.every(hasValidReadmeImageShape),
      ),
    ).toBe(true);
    expect(
      plugins.every(
        (plugin) =>
          typeof plugin.readme === "object" &&
          "markdown" in plugin.readme &&
          "htmlUrl" in plugin.readme &&
          "downloadUrl" in plugin.readme &&
          Array.isArray(plugin.readme.images) &&
          plugin.readme.images.every(hasValidReadmeImageShape),
      ),
    ).toBe(true);
    expect([...tools, ...plugins].some((entry) => typeof entry.readme.markdown === "string")).toBe(
      true,
    );
  });

  it("renders the plugin index table with plugin, version, and description columns only", async () => {
    const pluginSection = indexPageSource.split('headingId="neovim-plugins"')[1] ?? "";

    const pluginHeader = pluginSection.match(/<tr slot="head">[\s\S]*?<\/tr>/)?.[0] ?? "";

    expect(pluginHeader).toContain('<th scope="col">Plugin</th>');
    expect(pluginHeader).toContain('<th scope="col">Version</th>');
    expect(pluginHeader).toContain('<th scope="col">Description</th>');
    expect(pluginHeader.indexOf('<th scope="col">Plugin</th>')).toBeLessThan(
      pluginHeader.indexOf('<th scope="col">Version</th>'),
    );
    expect(pluginHeader.indexOf('<th scope="col">Version</th>')).toBeLessThan(
      pluginHeader.indexOf('<th scope="col">Description</th>'),
    );
    expect(pluginSection).not.toContain('<th scope="col">Language</th>');
    expect(pluginSection).not.toContain('<th scope="col">Install</th>');
  });

  it("composes the homepage from the shared Snurble Astro primitives", () => {
    expect(indexPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(indexPageSource).toContain("<PageShell>");
    expect(indexPageSource).toContain("<Hero");
    expect(indexPageSource).toContain("<Section");
    expect(indexPageSource).toContain("<DataTable");
  });

  it("does not render the source-of-truth eyebrow on the homepage", () => {
    expect(indexPageSource).not.toContain("Sources of truth:");
  });

  it("records the last generation timestamps", () => {
    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(pluginsGeneratedAt))).toBe(false);
  });
});
