// @ts-check
import { defineConfig } from "astro/config";
import seoGraph from "@jdevalk/astro-seo-graph/integration";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://mattriley.tools",
  integrations: [
    seoGraph({
      validateH1: true,
      validateUniqueMetadata: true,
      validateImageAlt: true,
      validateMetadataLength: true,
    }),
    sitemap(),
  ],
});
