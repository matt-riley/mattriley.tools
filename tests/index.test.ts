import { describe, expect, it } from "vitest";

import indexPageSource from "../src/pages/index.astro?raw";
import generatorSource from "../scripts/generate-tools-data.mjs?raw";
import skillDetailPageSource from "../src/pages/skills/[slug].astro?raw";
import templateDetailPageSource from "../src/pages/templates/[slug].astro?raw";
import { generatedAt, tools } from "../src/data/tools.generated";
import { plugins, pluginsGeneratedAt } from "../src/data/plugins.generated";
import { skills, skillsGeneratedAt } from "../src/data/skills.generated";

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

  it("includes agent skills from the skills catalog", () => {
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.map((skill) => skill.slug)).toContain("skill-creator");
  });

  it("uses unique slugs", () => {
    const slugs = tools.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses unique plugin slugs", () => {
    const slugs = plugins.map((plugin) => plugin.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses unique skill slugs", () => {
    const slugs = skills.map((skill) => skill.slug);
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

  it("stores SKILL.md content and metadata for every agent skill", () => {
    expect(
      skills.every(
        (skill) =>
          skill.repository === "matt-riley/agent-skills" &&
          skill.sourceUrl.endsWith(`/skills/${skill.slug}/SKILL.md`) &&
          typeof skill.description === "string" &&
          skill.description.length > 0 &&
          typeof skill.compatibility === "string" &&
          skill.compatibility.length > 0 &&
          typeof skill.version === "string" &&
          skill.version.length > 0 &&
          typeof skill.maturity === "string" &&
          skill.maturity.length > 0 &&
          typeof skill.readme.markdown === "string" &&
          skill.readme.markdown.length > 0,
      ),
    ).toBe(true);
  });

  it("renders the plugin index table with plugin, version, and description columns only", () => {
    const pluginSection =
      indexPageSource
        .split('headingId="neovim-plugins"')[1]
        ?.split('headingId="agent-skills"')[0] ?? "";

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

  it("renders an agent skills section on the homepage", () => {
    const skillsSection =
      indexPageSource
        .split('headingId="agent-skills"')[1]
        ?.split('headingId="public-templates"')[0] ?? "";

    expect(indexPageSource).toContain('Section title="Agent skills"');
    expect(skillsSection).toContain('<th scope="col">Skill</th>');
    expect(skillsSection).toContain('<th scope="col">Maturity</th>');
    expect(skillsSection).toContain('<th scope="col">Description</th>');
  });

  it("renders a templates section on the homepage", () => {
    const templatesSection = indexPageSource.split('headingId="public-templates"')[1] ?? "";

    expect(indexPageSource).toContain('Section title="Public templates"');
    expect(templatesSection).toContain('<th scope="col">Template</th>');
    expect(templatesSection).toContain('<th scope="col">Language</th>');
    expect(templatesSection).toContain('<th scope="col">Description</th>');
  });

  it("includes template data in the generator contract", () => {
    expect(generatorSource).toContain('join(dataDir, "templates.generated.ts")');
    expect(generatorSource).toContain("templatesGeneratedAt");
    expect(generatorSource).toContain("templates");
  });

  it("includes skill data in the generator contract", () => {
    expect(generatorSource).toContain('join(dataDir, "skills.generated.ts")');
    expect(generatorSource).toContain("skillsGeneratedAt");
    expect(generatorSource).toContain("readAgentSkills");
  });

  it("has static template detail pages", () => {
    expect(templateDetailPageSource).toContain("export function getStaticPaths()");
    expect(templateDetailPageSource).toContain('from "../../data/templates.generated"');
  });

  it("has static skill detail pages", () => {
    expect(skillDetailPageSource).toContain("export function getStaticPaths()");
    expect(skillDetailPageSource).toContain('from "../../data/skills.generated"');
  });

  it("composes the homepage from a richer shared Snurble surface", () => {
    expect(indexPageSource).toContain('from "@matt-riley/ui-astro"');
    expect(indexPageSource).toContain("<PageShell>");
    expect(indexPageSource).toContain("<Hero");
    expect(indexPageSource).toContain("<Section");
    expect(indexPageSource).toContain("<DataTable");
    expect(indexPageSource).toContain("<BentoGrid");
    expect(indexPageSource).toContain("<StatCard");
    expect(indexPageSource).toContain("<LinkButton");
    expect(indexPageSource).toContain("<Callout");
    expect(indexPageSource).toContain("<EmptyState");
    expect(indexPageSource).toContain("striped>");
    expect(indexPageSource).toContain('data-label="Tool"');
  });

  it("relies on the shared layout for the main landmark", () => {
    expect(indexPageSource).not.toContain("<main>");
  });

  it("does not render the source-of-truth eyebrow on the homepage", () => {
    expect(indexPageSource).not.toContain("Sources of truth:");
  });

  it("records the last generation timestamps", () => {
    expect(Number.isNaN(Date.parse(generatedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(pluginsGeneratedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(skillsGeneratedAt))).toBe(false);
  });
});
