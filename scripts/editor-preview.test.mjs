import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright";

await test("the deployed preview loads the Git source, edits it in three modes and restores the draft", async (t) => {
  const origin = process.env.EDITOR_TEST_ORIGIN || "http://127.0.0.1:8787";
  const path = "01 原子结构与元素性质/01 核外电子排布方式.md";
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
  const revision = process.env.EDITOR_TEST_REVISION || git("rev-parse", "HEAD").trim();
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const accountRequests = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/api/account/") || pathname === "/api/editor/submissions")
      accountRequests.push(pathname);
  });
  await page.goto(new URL(path.replace(/\.md$/, ".html"), origin).href, {
    waitUntil: "domcontentloaded",
  });
  const button = (name) => page.getByRole("button", { name, exact: true });
  await button("打开显示配置").click();
  await page.getByText("站内编辑", { exact: true }).click();
  const toggle = page.getByRole("checkbox", { name: "显示「编辑此页」按钮" });
  assert.equal(await toggle.isChecked(), false);
  await toggle.check();
  await button("关闭显示配置").click();

  const reading = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/editor/source");
  await button("编辑此页").click();
  const response = await reading;
  assert.equal(response.status(), 200);
  const source = await response.json();
  assert.equal(source.path, path);
  assert.equal(source.baseCommit, revision);
  assert.equal(source.baseBlob, git("rev-parse", revision + ":" + path).trim());
  assert.equal(source.markdown, git("cat-file", "blob", revision + ":" + path));
  assert.equal(source.draftOnly, true);

  await page
    .locator(".vpie-projection")
    .getByRole("heading", { name: "能层与能级", exact: true })
    .click();
  const rich = page.locator(".vpie-rich .ProseMirror");
  await rich.click();
  await page.keyboard.insertText("（试写）");
  const editedHeading = await rich.innerText();
  assert.ok(editedHeading.includes("（试写）"));
  await button("完成此段").click();
  await button("源码").click();
  const editor = page.locator(".cm-content");
  assert.ok((await editor.innerText()).includes(editedHeading.trim()));
  await button("分屏预览").click();
  await editor.press("Control+End");
  await page.keyboard.insertText("\n\n分屏试写标记。\n");
  await page.getByLabel("实时预览").getByText("分屏试写标记。", { exact: true }).waitFor();
  await button("查看改动").click();
  assert.ok((await page.locator(".vpie-diff").innerText()).includes("分屏试写标记。"));
  assert.equal(await button("确认投稿").count(), 0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await button("编辑此页").click();
  await button("查看改动").click();
  assert.ok((await page.locator(".vpie-diff").innerText()).includes("分屏试写标记。"));
  assert.deepEqual(accountRequests, []);
});
