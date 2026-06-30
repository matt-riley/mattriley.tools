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
    sitemap({
      /**
       * @param {import("@astrojs/sitemap").SitemapItem} item
       * @returns {import("@astrojs/sitemap").SitemapItem}
       */
      serialize(item) {
        const url = new URL(item.url);
        const lastmod = new Date().toISOString().split("T")[0];
        const isHome = url.pathname === "/";
        const isListing = !isHome && url.pathname.split("/").filter(Boolean).length === 1;
        return {
          ...item,
          lastmod,
          // @ts-ignore — string literals are valid EnumChangefreq values at runtime
          changefreq: isHome ? "daily" : "weekly",
          priority: isHome ? 1.0 : isListing ? 0.8 : 0.5,
        };
      },
    }),
  ],
});
