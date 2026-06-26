import { expect, test } from "@playwright/test";

// Mobile coverage: catches layout regressions (overflow, clipped/huge titles,
// grid not collapsing) that source-string tests cannot detect. Runs against
// the built site (see playwright.config.ts webServer) at phone viewports.

const HOMEPAGE_PATHS = [
  "/",
  "/#homebrew-tools",
  "/#neovim-plugins",
  "/#agent-skills",
  "/#public-templates",
];

test.describe("homepage on mobile width", () => {
  for (const path of HOMEPAGE_PATHS) {
    test(`${path} has no horizontal overflow and titles fit`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // Root cause guard for the "vv0.1" regression: version badges must show
      // a single leading v, never "vv".
      const versions = await page.locator(".version").allTextContents();
      for (const v of versions) {
        expect(v, `version badge "${v}" must not be doubled`).not.toMatch(/^vv/i);
      }

      // No horizontal scroll: the page must not exceed the viewport width.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = page.viewportSize()?.width ?? 0;
      expect(scrollWidth, "page must not overflow horizontally").toBeLessThanOrEqual(viewportWidth);

      // Every card title must be fully visible: its right edge sits within the
      // viewport and it is not clipped by overflow.
      const titles = page.locator(".card-title");
      const count = await titles.count();
      for (let i = 0; i < count; i += 1) {
        const box = await titles.nth(i).boundingBox();
        expect(box, "card-title must have a layout box").not.toBeNull();
        const vw = page.viewportSize()?.width ?? 0;
        expect(box!.x, "title left edge within viewport").toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, "title right edge within viewport").toBeLessThanOrEqual(vw + 1);
      }
    });
  }

  test("catalog grid collapses to a single column on a narrow viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator(".catalog-card").first();
    const grid = page.locator(".domain-grid").first();

    const cardBox = await firstCard.boundingBox();
    const gridBox = await grid.boundingBox();
    expect(cardBox, "at least one card present").not.toBeNull();
    expect(gridBox, "grid present").not.toBeNull();

    // In a single-column layout two cards in the same grid would share the
    // same x and stack vertically. One card is enough: assert its width fills
    // the grid's content width (siblings cannot sit beside it).
    const vw = page.viewportSize()?.width ?? 0;
    expect(cardBox!.width, "card spans the (single) column width").toBeGreaterThan(vw - 80);
    expect(gridBox!.x, "grid is not offset past the viewport").toBeGreaterThanOrEqual(0);
  });

  test("hero title is present and not clipped by the viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const hero = page.locator("h1").first();
    await expect(hero).toBeVisible();
    const box = await hero.boundingBox();
    expect(box, "hero h1 has a box").not.toBeNull();
    const vw = page.viewportSize()?.width ?? 0;
    expect(box!.x, "hero left edge within viewport").toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, "hero right edge within viewport").toBeLessThanOrEqual(vw + 1);
  });
});

test.describe("detail page on mobile width", () => {
  test("plugin detail page renders a single-v version and fits the viewport", async ({ page }) => {
    await page.goto("/plugins/slides.nvim/");
    await page.waitForLoadState("networkidle");

    // The detail page renders the version inline; ensure it is visible and
    // not doubled.
    const body = await page.locator("body").innerText();
    expect(body, "no doubled-v version on detail page").not.toMatch(/vv\d/i);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = page.viewportSize()?.width ?? 0;
    expect(scrollWidth, "detail page must not overflow horizontally").toBeLessThanOrEqual(
      viewportWidth,
    );

    const h1 = page.locator("h1").first();
    const box = await h1.boundingBox();
    expect(box, "h1 has a box").not.toBeNull();
    expect(box!.x + box!.width, "h1 right edge within viewport").toBeLessThanOrEqual(
      viewportWidth + 1,
    );
  });
});
