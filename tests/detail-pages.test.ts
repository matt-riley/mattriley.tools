import { describe, expect, it } from "vitest";

import pluginDetailPageSource from "../src/pages/plugins/[slug].astro?raw";
import skillDetailPageSource from "../src/pages/skills/[slug].astro?raw";
import templateDetailPageSource from "../src/pages/templates/[slug].astro?raw";
import toolDetailPageSource from "../src/pages/tools/[slug].astro?raw";

describe("detail pages", () => {
  it("uses the site Layout wrapper on all detail pages", () => {
    expect(toolDetailPageSource).toContain('import Layout from "../../layouts/Layout.astro"');
    expect(pluginDetailPageSource).toContain('import Layout from "../../layouts/Layout.astro"');
    expect(templateDetailPageSource).toContain('import Layout from "../../layouts/Layout.astro"');
    expect(skillDetailPageSource).toContain('import Layout from "../../layouts/Layout.astro"');

    expect(toolDetailPageSource).toContain("<h1>{tool.name}</h1>");
    expect(pluginDetailPageSource).toContain("<h1>{plugin.name}</h1>");
    expect(templateDetailPageSource).toContain("<h1>{template.name}</h1>");
    expect(skillDetailPageSource).toContain("<h1>{skill.name}</h1>");
  });

  it("renders a README section on tool detail pages", () => {
    expect(toolDetailPageSource).toContain("<h2>README</h2>");
    expect(toolDetailPageSource).toContain(
      "This tool does not currently have synced README content to display.",
    );
  });

  it("renders a README section on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain("<h2>README</h2>");
    expect(pluginDetailPageSource).toContain(
      "This plugin does not currently have synced README content to display.",
    );
  });

  it("renders a README section on template detail pages", () => {
    expect(templateDetailPageSource).toContain("<h2>README</h2>");
    expect(templateDetailPageSource).toContain(
      "This template does not currently have synced README content to display.",
    );
  });

  it("renders a SKILL.md section on skill detail pages", () => {
    expect(skillDetailPageSource).toContain("<h2>SKILL.md</h2>");
    expect(skillDetailPageSource).toContain(
      "This skill does not currently have synced instruction content to display.",
    );
  });

  it("renders install snippets for lazy.nvim and vim.pack on plugin detail pages", () => {
    expect(pluginDetailPageSource).toContain("Install (lazy.nvim):");
    expect(pluginDetailPageSource).toContain("Install (vim.pack):");
    expect(pluginDetailPageSource).toContain("{plugin.lazyInstallSnippet}");
    expect(pluginDetailPageSource).toContain("{plugin.vimPackInstallSnippet}");
  });

  it("renders a main content landmark on detail pages", () => {
    expect(toolDetailPageSource).toContain("<main>");
    expect(pluginDetailPageSource).toContain("<main>");
    expect(templateDetailPageSource).toContain("<main>");
    expect(skillDetailPageSource).toContain("<main>");
  });
});
