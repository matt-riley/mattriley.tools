// @ts-check
import { defineConfig } from "astro/config";
import seoGraph from "@jdevalk/astro-seo-graph/integration";
import sitemap, { ChangeFreqEnum } from "@astrojs/sitemap";

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
    sitemap({
      serialize(item) {
        const url = new URL(item.url);
        const priority =
          url.pathname === "/" ? 1.0 : url.pathname.split("/").length <= 3 ? 0.8 : 0.5;
        return {
          ...item,
          lastmod: new Date().toISOString().split("T")[0],
          changefreq: url.pathname === "/" ? ChangeFreqEnum.DAILY : ChangeFreqEnum.WEEKLY,
          priority,
        };
      },
    }),
  ],
});
