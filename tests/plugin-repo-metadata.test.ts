import { describe, expect, it } from "vitest";

import { filterPluginRepos, toPluginRecord } from "../scripts/plugin-repo-metadata.mjs";

describe("plugin repo metadata", () => {
  it("keeps only repos whose names contain .nvim", () => {
    const repos = [
      { name: "waystone.nvim", private: false },
      { name: "hopcli", private: false },
      { name: "slides.nvim", private: false },
    ];

    expect(filterPluginRepos(repos).map((repo) => repo.name)).toEqual([
      "slides.nvim",
      "waystone.nvim",
    ]);
  });

  it("excludes private plugin repositories even when the name matches", () => {
    const repos = [
      { name: "waystone.nvim", private: false },
      { name: "secret.nvim", private: true },
      { name: "slides.nvim", private: false },
    ];

    expect(filterPluginRepos(repos).map((repo) => repo.name)).toEqual([
      "slides.nvim",
      "waystone.nvim",
    ]);
  });

  it("excludes archived plugin repositories even when the name matches", () => {
    const repos = [
      { name: "waystone.nvim", private: false, archived: false },
      { name: "old.nvim", private: false, archived: true },
      { name: "slides.nvim", private: false, archived: false },
    ];

    expect(filterPluginRepos(repos).map((repo) => repo.name)).toEqual([
      "slides.nvim",
      "waystone.nvim",
    ]);
  });

  it("maps a GitHub repo into the plugin record used by the site", () => {
    const repo = {
      name: "slides.nvim",
      full_name: "matt-riley/slides.nvim",
      html_url: "https://github.com/matt-riley/slides.nvim",
      description: "Neovim plugin for presenting Markdown slides in a full-screen floating window.",
      pushed_at: "2026-04-08T01:02:03Z",
      language: "Lua",
      topics: ["neovim", "slides"],
    };

    expect(toPluginRecord(repo, "v0.1.4")).toEqual({
      slug: "slides.nvim",
      name: "slides.nvim",
      description: "Neovim plugin for presenting Markdown slides in a full-screen floating window.",
      repository: "matt-riley/slides.nvim",
      homepage: "https://github.com/matt-riley/slides.nvim",
      version: "v0.1.4",
      updatedAt: "2026-04-08T01:02:03Z",
      language: "Lua",
      topics: ["neovim", "slides"],
      lazyInstallSnippet: '{ "matt-riley/slides.nvim" }',
      vimPackInstallSnippet: "vim.pack.add({ 'https://github.com/matt-riley/slides.nvim' })",
    });
  });

  it("uses fallback description when null", () => {
    const repo = {
      name: "slides.nvim",
      full_name: "matt-riley/slides.nvim",
      html_url: "https://github.com/matt-riley/slides.nvim",
      description: null,
      pushed_at: "2026-04-08T01:02:03Z",
      language: "Lua",
      topics: ["neovim", "slides"],
    };
    expect(toPluginRecord(repo, "v0.1.4").description).toBe("No description provided.");
  });

  it("builds the lazy.nvim snippet from the full repository name", () => {
    const repo = {
      name: "slides.nvim",
      full_name: "acme/slides.nvim",
      html_url: "https://github.com/acme/slides.nvim",
      description: "Neovim plugin for presenting Markdown slides in a full-screen floating window.",
      pushed_at: "2026-04-08T01:02:03Z",
      language: "Lua",
      topics: ["neovim", "slides"],
    };

    expect(toPluginRecord(repo, "v0.1.4").lazyInstallSnippet).toBe('{ "acme/slides.nvim" }');
  });
});
