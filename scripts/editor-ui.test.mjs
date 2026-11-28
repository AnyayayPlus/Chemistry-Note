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
  let reads = 0,
    logins = 0,
    sessionChecks = 0,
    nickname = null;
  const submissions = [];
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
      return route.fulfill({
        json: {
          requiresAccount: true,
          requiresContributor: true,
          path,
          repository: "test/notes",
          branch: "main",
          markdown: "一行原文。\n",
          baseCommit: "a".repeat(40),
          baseBlob: "b".repeat(40),
        },
      });
    }
    if (url.pathname === "/api/editor/submissions") {
      submissions.push(route.request().postDataJSON());
      if (logins < 2) return route.fulfill({ status: 401, json: { code: "login_required" } });
      if (!nickname) return route.fulfill({ status: 428, json: { code: "name_required" } });
      return route.fulfill({
        json: {
          review: { number: 7, provider: "github", url: "https://example.test/pull/7" },
          profileUrl: "/u/public-id",
          submissionsUrl: "/api/account/submissions",
        },
      });
    }
    if (url.pathname === "/api/account/login") {
      assert.equal(route.request().method(), "POST");
      logins++;
      const location = new URL(url.searchParams.get("returnTo"), origin).href;
      assert.equal(location, article);
      return route.fulfill({ status: 303, headers: { location } });
    }
    if (url.pathname === "/api/account/session") {
      sessionChecks++;
      if (logins < 2) return route.fulfill({ status: 401, json: {} });
      return route.fulfill({ json: { name: nickname } });
    }
    if (url.pathname === "/api/account/profile") {
      nickname = route.request().postDataJSON().name;
      return route.fulfill({ json: { ok: true } });
    }
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
  await page.getByRole("button", { name: "源码", exact: true }).click();
  await page.locator(".cm-content").fill("一行修改。");
  await page.getByRole("button", { name: "查看改动" }).click();
  assert.equal(reads, 1);
  assert.equal(logins, 0);
  assert.equal(sessionChecks, 0);
  assert.equal(await page.getByRole("link", { name: "我的主页" }).count(), 0);
  // The reader cancels the first login and returns to the same unsubmitted change.
  const cancelled = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/account/session" && response.status() === 401,
  );
  await page.getByRole("button", { name: "确认投稿" }).click();
  await cancelled;
  assert.ok((await page.locator(".vpie-diff").innerText()).includes("一行修改"));
  assert.equal(await page.getByLabel("公开署名").count(), 0);
  await page.getByRole("button", { name: "确认投稿" }).click();
  await page.getByLabel("公开署名").waitFor();
  assert.ok((await page.locator(".vpie-diff").innerText()).includes("一行修改"));
  await page.getByLabel("公开署名").fill("投稿人");
  await page.getByRole("button", { name: "确认投稿" }).click();
  await page.getByRole("link", { name: "我的主页" }).waitFor();
  assert.equal(await page.getByRole("link", { name: "我的投稿" }).getAttribute("target"), "_self");
  assert.equal(await page.getByRole("link", { name: "我的主页" }).getAttribute("target"), "_self");
  assert.equal(logins, 2);
  assert.equal(nickname, "投稿人");
  assert.equal(submissions.length, 3);
  assert.deepEqual(submissions[0], submissions[1]);
  assert.deepEqual(submissions[1], submissions[2]);
  assert.equal(submissions[2].contributor, undefined);
  await page.getByRole("button", { name: "返回文章" }).click();
  assert.equal(await page.getByRole("link", { name: "我的主页" }).count(), 0);
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

await test("readers on the short domain opt in on the same article on the submission site", async (t) => {
  const local = new URL(process.env.EDITOR_TEST_ORIGIN || "http://127.0.0.1:5173");
  const main = "https://chemistry-note.seeridia.top";
  const mirror = "https://cn.seeridia.top";
  const article = new URL("08 化学反应能量与速率/05 电解池.html?from=notes#section", mirror);
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  t.after(() => browser.close());
  const context = await browser.newContext();
  let submissionRequests = 0;
  await context.addInitScript((alias) => {
    if (window.location.origin === alias)
      localStorage.setItem("cc-site-settings", JSON.stringify({ enableEditor: true }));
  }, mirror);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (![main, mirror].includes(url.origin)) return route.abort();
    if (url.pathname.startsWith("/api/account/") || url.pathname.startsWith("/api/editor/")) {
      submissionRequests++;
      return route.abort();
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ json: { contributors: [] } });
    url.protocol = local.protocol;
    url.host = local.host;
    const response = await route.fetch({ url: url.href });
    return route.fulfill({ response });
  });
  const page = await context.newPage();
  await page.goto(article.href);
  const edit = page.getByRole("button", { name: "编辑此页", exact: true });
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "打开显示配置" }).click();
  assert.equal(await edit.count(), 0);
  await dialog.getByText("站内编辑", { exact: true }).click();
  const link = dialog.getByRole("link", { name: "在主站设置站内编辑" });
  await link.click();
  const toggle = dialog.getByRole("checkbox", { name: "显示「编辑此页」按钮" });
  await toggle.waitFor();
  assert.equal(page.url(), main + article.pathname + article.search + article.hash);
  assert.equal(await toggle.isChecked(), false);
  await toggle.check();
  await dialog.getByRole("button", { name: "完成" }).click();
  await edit.waitFor();
  assert.equal(submissionRequests, 0);
});
