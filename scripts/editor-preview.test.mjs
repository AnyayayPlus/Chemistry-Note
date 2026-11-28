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
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
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

  const rich = page.getByRole("textbox", { name: "文章正文" });
  const dock = page.getByRole("group", { name: "文章编辑工具栏" });
  await rich.waitFor();
  assert.equal(await page.locator("main.main").isVisible(), false);
  assert.equal(await button("完成编辑").isEnabled(), false);
  assert.equal(await rich.getByRole("table").count(), 2);
  async function select(locator, value) {
    await locator.scrollIntoViewIfNeeded();
    await locator.evaluate((el, value) => {
      el.closest("[contenteditable=true]").focus({ preventScroll: true });
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode,
          at = text.textContent.indexOf(value);
        if (at < 0) continue;
        window.getSelection().setBaseAndExtent(text, at, text, at + value.length);
        document.dispatchEvent(new Event("selectionchange"));
        return;
      }
      throw Error("未找到正文文字 " + value);
    }, value);
  }
  const quote = rich.locator("blockquote p").filter({ hasText: /原子轨道总?数为/ });
  const merged = rich.locator('th[rowspan="2"]');
  const original = source.markdown;
  const expected = original
    .replace("> 原子轨道数为", "> 原子轨道总数为")
    .replace("| 小  |", "| 较小  |")
    .replace('rowspan="2"> 能层', 'rowspan="2"> 所属能层');
  for (const [node, before, after] of [
    [quote, "轨道数", "轨道总数"],
    [rich.getByRole("cell", { name: "小", exact: true }), "小", "较小"],
    [merged, "能层", "所属能层"],
  ]) {
    await select(node, before);
    await page.keyboard.insertText(after);
  }
  assert.ok(await quote.locator("mjx-container").count());
  assert.ok(await rich.locator('td[colspan="4"]').count());
  const draft = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith("vpie:"))),
        )?.draft,
    );
  assert.equal(await draft(), expected);

  const sentence = "量子力学把电子在原子核外的一个";
  const paragraph = rich.locator("p").filter({ hasText: sentence });
  await select(paragraph, sentence);
  await button("有序列表").click();
  await rich.locator("ol li").filter({ hasText: sentence }).waitFor();
  await button("无序列表").click();
  await rich.locator("ul li").filter({ hasText: sentence }).waitFor();
  await button("撤销").click();
  await rich.locator("ol li").filter({ hasText: sentence }).waitFor();
  await button("撤销").click();
  assert.equal(await draft(), expected);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await rich.getByRole("heading", { name: "原子轨道能量高低" }).scrollIntoViewIfNeeded();
    const bounds = await dock.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
    assert.ok(bounds.y >= viewport.height - 140 && bounds.y + bounds.height <= viewport.height);
    assert.ok(await button("完成编辑").isVisible());
    await button("源码").click();
    await page.locator(".cm-content").waitFor();
    assert.equal(await draft(), expected);
    await button("可视化").click();
    await rich.waitFor();
  }

  await button("分屏预览").click();
  const preview = page.getByLabel("实时预览");
  await preview.locator('th[rowspan="2"]').filter({ hasText: "所属能层" }).waitFor();
  await preview.getByRole("cell", { name: "较小", exact: true }).waitFor();
  await page.locator(".cm-content").press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("分屏试写标记。");
  await page.keyboard.press("Enter");
  await preview.getByText("分屏试写标记。", { exact: true }).waitFor();
  const finalDraft = await draft();
  assert.equal(finalDraft, expected + "\n分屏试写标记。\n");
  await button("完成编辑").click();
  const diff = await page.locator(".vpie-diff").innerText();
  assert.ok(diff.includes("分屏试写标记。") && diff.includes("原子轨道总数为"));
  assert.equal(await button("确认投稿").count(), 0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await button("编辑此页").click();
  await rich.locator("blockquote").filter({ hasText: "原子轨道总数为" }).waitFor();
  await rich.getByText("分屏试写标记。", { exact: true }).waitFor();
  assert.equal(await draft(), finalDraft);
  await button("完成编辑").click();
  assert.equal(await page.locator(".vpie-diff").innerText(), diff);
  assert.deepEqual(accountRequests, []);
  assert.deepEqual(pageErrors, []);
});
