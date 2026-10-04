import md5 from "blueimp-md5";
import fg from "fast-glob";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getPageKind,
  getSectionKey,
  htmlToPdfPath,
  isPdfExportable,
  sourceToHtmlPath,
  sourceToPublicPath,
  sourceToRoutePath,
  sourceToShortLinkPath,
} from "../.vitepress/shared/page.ts";
import { scanContent } from "../.vitepress/siteData/content.ts";
import { buildNavItems } from "../.vitepress/siteData/nav.ts";
import { pageAliases } from "../.vitepress/siteData/pageAliases.ts";
import { buildSidebarItems } from "../.vitepress/siteData/sidebar.ts";
import { buildShortUrlMap } from "../.vitepress/theme/components/shortUrl/mapShortUrl.ts";
import { loadProjectConfig, shouldExportPdfPage } from "./project-config.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const rules = loadProjectConfig(root).export.pdf;
const article = "01 原子结构与元素性质/01 核外电子排布方式.md";

await test("Chinese source paths, navigation, canonical URL and PDF path agree", () => {
  const html = sourceToHtmlPath(`./${article.replaceAll("/", "\\")}`);
  assert.equal(html, article.replace(/\.md$/, ".html"));
  assert.equal(sourceToPublicPath(article), `/${encodeURI(html)}`);
  assert.equal(sourceToRoutePath(article), `/${encodeURI(article.slice(0, -3))}`);
  assert.equal(htmlToPdfPath(html), article.replace(/\.md$/, ".pdf"));
  assert.equal(sourceToPublicPath("index.md"), "/");
  assert.equal(sourceToHtmlPath("README.md"), "README.html");
  assert.equal(getSectionKey(`${sourceToPublicPath(article)}?x=1#heading`), article.split("/")[0]);
  assert.doesNotThrow(() => getSectionKey("/%E0%A4%A"));
});

await test("page classification separates content and utility pages", () => {
  for (const [source, kind] of [
    ["index.md", "home"],
    ["01 原子结构与元素性质/index.md", "chapter"],
    [article, "article"],
    ["README.md", "utility"],
    ["404.md", "utility"],
    ["hidePage/shortUrl.md", "utility"],
    ["s.md", "utility"],
    ["scripts/README.md", "utility"],
  ])
    assert.equal(getPageKind(source), kind);
});

await test("PDF links follow the actual configured export scope", () => {
  assert.equal(isPdfExportable(sourceToHtmlPath(article), rules), true);
  for (const source of [
    "index.md",
    "README.md",
    "01 原子结构与元素性质/index.md",
    "00 说明/贡献指南.md",
    "00 说明/向明天 · 2026 高考.md",
    "hidePage/shortUrl.md",
    "s.md",
    "scripts/README.md",
    ...Object.keys(pageAliases),
  ])
    assert.equal(isPdfExportable(sourceToHtmlPath(source), rules), false, source);
  // The browser receives these exact serializable rules through themeConfig.
  assert.equal(isPdfExportable(sourceToHtmlPath(article), JSON.parse(JSON.stringify(rules))), true);
  assert.equal(shouldExportPdfPage(sourceToHtmlPath(article), loadProjectConfig(root)), true);
});

await test("all existing source pages retain their short-link keys and old aliases", () => {
  const shortMap = buildShortUrlMap(scanContent(root));
  const pages = fg.sync("**/*.md", {
    cwd: root,
    ignore: [".vitepress/**", "node_modules/**", "public/**", "data/**", "export/**", "PDF文件/**"],
  });
  for (const source of pages) {
    const legacy = source
      .replace(/\\/g, "/")
      .replace(/^\//, "")
      .replace(/(index)?\.md$/, "");
    assert.equal(sourceToShortLinkPath(source), legacy, source);
    assert.equal(shortMap[md5(legacy).slice(0, 10)], legacy, source);
  }
  for (const [oldSource, newSource] of Object.entries(pageAliases)) {
    const key = md5(sourceToShortLinkPath(oldSource)).slice(0, 10);
    assert.equal(shortMap[key], sourceToShortLinkPath(newSource));
  }
});

await test("catalog consumers refresh together after adding, renaming and deleting content", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chemistry-content-"));
  const write = (source: string) => {
    const file = path.join(temp, source);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "# Test\n");
  };
  try {
    for (const source of [
      "index.md",
      "02 第二章/index.md",
      "01 第一章/index.md",
      "01 第一章/02 第二节.md",
      "01 第一章/01 第一节.md",
      "01 第一章/子目录/补充.md",
      "hidePage/shortUrl.md",
      "data/generated.md",
      "public/example.md",
      "pdf-repo/README.md",
    ])
      write(source);
    const initial = scanContent(temp);
    assert.deepEqual(
      initial.sections.map((section) => section.name),
      ["01 第一章", "02 第二章"],
    );
    assert.deepEqual(
      initial.sections[0].pages.map((page) => page.title),
      ["01 第一节", "02 第二节"],
    );
    assert.ok(initial.pages.some((page) => page.sourcePath === "hidePage/shortUrl.md"));
    assert.ok(initial.pages.some((page) => page.sourcePath === "01 第一章/子目录/补充.md"));
    assert.ok(!initial.pages.some((page) => /^(data|public|pdf-repo)\//.test(page.sourcePath)));
    const added = "03 第三章/01 新文章.md";
    write("03 第三章/index.md");
    write(added);
    const refreshed = scanContent(temp);
    assert.equal(refreshed.sections.length, 3);
    assert.ok(JSON.stringify(buildNavItems(refreshed)).includes("03 第三章"));
    assert.ok(JSON.stringify(buildSidebarItems(refreshed)).includes("01 新文章"));
    const key = md5(sourceToShortLinkPath(added)).slice(0, 10);
    assert.equal(buildShortUrlMap(refreshed)[key], sourceToShortLinkPath(added));
    fs.renameSync(path.join(temp, added), path.join(temp, "03 第三章/02 改名.md"));
    const renamed = scanContent(temp);
    assert.ok(!JSON.stringify(buildSidebarItems(renamed)).includes("01 新文章"));
    assert.ok(JSON.stringify(buildSidebarItems(renamed)).includes("02 改名"));
    assert.equal(buildShortUrlMap(renamed)[key], undefined);
    fs.rmSync(path.join(temp, "03 第三章"), { recursive: true });
    const deleted = scanContent(temp);
    assert.equal(deleted.sections.length, 2);
    assert.ok(!JSON.stringify(buildNavItems(deleted)).includes("03 第三章"));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
