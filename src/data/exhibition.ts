import { tools } from "./tools.generated";
import { plugins } from "./plugins.generated";
import { templates } from "./templates.generated";

export const collections = [
  { id: "homebrew-tools", label: "Homebrew tools", route: "tools", entries: tools },
  { id: "neovim-plugins", label: "Neovim plugins", route: "plugins", entries: plugins },
  { id: "public-templates", label: "Public templates", route: "templates", entries: templates },
] as const;

const portraits = [
  {
    id: "deadwood",
    route: "tools",
    title: "Root study",
    medium: "Wood engraving",
    image: "/prints/root-study.webp",
    alt: "A black engraved oak with bare branches crossing a vermilion sun.",
    description: "Trace a project from its entry point. See which files fall away.",
    note: "Three small TypeScript modules. Change the imports in index.ts to see the unused files reported by Deadwood.",
  },
  {
    id: "crap",
    route: "tools",
    title: "Risk in relief",
    medium: "Overprint",
    image: "/prints/risk-block.webp",
    alt: "An isometric block of overlapping black bars printed in vermilion.",
    description: "Stack complexity against coverage and watch the risk accumulate.",
    note: "Hold cyclomatic complexity at 8 and vary test coverage. The offset between ink passes follows the calculated CRAP score.",
  },
  {
    id: "waystone.nvim",
    route: "plugins",
    title: "Points of return",
    medium: "Contour etching",
    image: "/prints/wayfinding.webp",
    alt: "A cobalt mountain range engraved with fine ivory contour lines.",
    description: "Drop a mark in the landscape of a project and jump back to it.",
    note: "Three saved positions in one project. Select a Waystone slot to jump to its marked file and line.",
  },
] as const;

// An upstream removal must also retire its portrait and detail link.
export const plates = portraits.filter((p) =>
  collections.some((c) => c.route === p.route && c.entries.some((e) => e.slug === p.id)),
);
export type Plate = (typeof portraits)[number];
