import { expect, test } from "@playwright/test";

for (const path of [
  "/",
  "/#homebrew-tools",
  "/#neovim-plugins",
  "/#public-templates",
  "/plugins/slides.nvim/",
  "/tools/deadwood/",
]) {
  test(path + " fits the viewport", async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    expect(await page.locator("body").innerText()).not.toMatch(/vv\d/i);
    await expect(page.locator('a[href^="/skills/"]')).toHaveCount(0);
  });
}

test("turn a sheet, work a proof, and pull the selected impression", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Next plate" }).click();
  await expect(page.locator("[data-cover-id]")).toHaveText("crap");
  await page.locator("[data-cover-link]").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Test coverage").selectOption("0");
  await expect(dialog.locator("output")).toHaveText("CRAP score 72.00");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Pull a print" }).click();
  expect((await download).suggestedFilename()).toBe("crap-proof-1.png");
  await dialog.getByRole("button", { name: "Close print room" }).click();
  await expect(dialog).not.toBeVisible();
});

test("the index searches and filters, including empty results", async ({ page }) => {
  await page.goto("/#index");
  await page
    .getByRole("combobox", { name: "Collection", exact: true })
    .selectOption("neovim-plugins");
  const search = page.getByRole("searchbox");
  await search.fill("waystone");
  await expect(page.locator(".collection:visible .index-row:visible")).toHaveCount(1);
  await search.fill("no-matching-print");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".collection:visible")).toHaveCount(3);
  await page.getByRole("link", { name: /waystone.nvim.*persistent/ }).click();
  await expect(page.locator("h1").first()).toHaveText("waystone.nvim");
});

test("static exhibition links work without scripting", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator(".plate-card").first().click();
  await expect(page).toHaveURL(/\/tools\/deadwood\//);
  await context.close();
});

test("the fourth registration pass uncovers the missing print", async ({ page }) => {
  await page.goto("/404.html");
  const mark = page.getByRole("button", { name: "Align the printing plates" });
  for (let n = 1; n <= 3; n++) {
    await mark.click();
    await expect(page.getByRole("status")).toHaveText("Registration pass " + n + " / 4");
  }
  await mark.press("Enter");
  await expect(page.getByText("Night shift", { exact: true })).toBeVisible();
  const keep = page.getByRole("link", { name: "Keep this print" });
  await expect(keep).toBeFocused();
  const download = page.waitForEvent("download");
  await keep.click();
  expect((await download).suggestedFilename()).toBe("night-shift-artists-proof.webp");
});
