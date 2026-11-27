import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

await test("the settings menu opts in locally and the article only shows its own public credits", async (t) => {
  const origin = process.env.EDITOR_TEST_ORIGIN || "http://127.0.0.1:5173";
  const path = "08 化学反应能量与速率/05 电解池.md";
  const article = new URL(path.replace(/\.md$/, ".html"), origin).href;
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    if (!localStorage.getItem("cc-site-settings"))
      localStorage.setItem("cc-site-settings", JSON.stringify({ showComments: false }));
  });
  let reads = 0;
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/editor-contributors")) {
      const file = url.searchParams.get("path");
      return route.fulfill({
        json: {
          contributors:
            file && file !== path ? [] : [{ id: 1, name: "署名测试读者", contributions: 2 }],
        },
        headers: { "access-control-allow-origin": "*" },
      });
    }
    if (url.pathname === "/api/editor/source") {
      reads++;
      return route.fulfill({ json: { requiresContributor: false } });
    }
    if (url.pathname === "/api/editor/submissions") return route.abort();
    if (url.hostname === "comment-chemistry-note.seeridia.top")
      return route.fulfill({
        json: { errno: 0, data: [{ time: 1 }] },
        headers: { "access-control-allow-origin": "*" },
      });
    return url.origin === origin ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const button = page.getByRole("button", { name: "编辑此页", exact: true });
  const visibleCredits = page.locator(".cc-editor-credits:visible");
  await page.goto(article);
  await visibleCredits.getByText("署名测试读者", { exact: true }).waitFor();
  assert.equal(await visibleCredits.evaluate((el) => Boolean(el.closest(".aside"))), true);
  assert.equal(await button.count(), 0);
  assert.equal(reads, 0);

  async function settings() {
    await page.getByRole("button", { name: "打开显示配置" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("站内编辑", { exact: true }).click();
    return dialog;
  }
  const menu = await settings();
  const toggle = menu.getByRole("checkbox", { name: "显示「编辑此页」按钮" });
  assert.equal(await toggle.isChecked(), false);
  await toggle.check();
  await menu.getByRole("button", { name: "关闭显示配置" }).click();
  await page.reload();
  await button.click();
  await page.getByRole("alert").filter({ hasText: "站点尚未接通投稿署名服务" }).waitFor();
  assert.equal(reads, 1);
  await page.getByRole("button", { name: "关闭编辑" }).click();
  await settings();
  await toggle.uncheck();
  await menu.getByRole("button", { name: "关闭显示配置" }).click();
  await page.reload();
  await visibleCredits.waitFor();
  assert.equal(await button.count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await visibleCredits.evaluate((el) => el.classList.contains("cc-editor-credits-mobile")),
    true,
  );
  await page.goto(origin + "/");
  await visibleCredits.getByText("署名测试读者").waitFor();
  const other = new URL("09 化学平衡/03 水溶液中的离子反应.html", origin);
  const loaded = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname.endsWith("/editor-contributors") &&
      new URL(r.url()).searchParams.has("path"),
  );
  await page.goto(other.href);
  await loaded;
  assert.equal(await visibleCredits.count(), 0);
});
