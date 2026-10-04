// 参考自 https://notes.linho.cc/s?q=adaf352048

import type { SiteConfig } from "vitepress";

import md5 from "blueimp-md5";
import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";

import { pageAliases } from "../../../siteData/pageAliases";

type ShortUrlMap = {
  [key: string]: string;
};

const normalizePagePath = (pagePath: string): string =>
  pagePath
    .replace(/\\/g, "/")
    .replace(/^\//, "")
    .replace(/(index)?\.md$/, "");

const buildShortUrlMap = (pages: string[]): ShortUrlMap => {
  const shortMap: ShortUrlMap = {};
  for (const page of pages) {
    const normalizedPath = normalizePagePath(page);
    shortMap[md5(normalizedPath).slice(0, 10)] = normalizedPath;
  }
  for (const [oldPage, newPage] of Object.entries(pageAliases)) {
    if (!pages.includes(newPage)) continue;
    shortMap[md5(normalizePagePath(oldPage)).slice(0, 10)] = normalizePagePath(newPage);
  }
  return shortMap;
};

const writeShortMap = (targetFile: string, shortMap: ShortUrlMap) => {
  fs.writeFileSync(targetFile, JSON.stringify(shortMap));
};

export const generateShortMapFromRoot = (rootDir: string, targetFile: string) => {
  const pages = fg.sync("**/*.md", {
    cwd: rootDir,
    onlyFiles: true,
    ignore: [".vitepress/**", "node_modules/**", "public/**", "data/**", "export/**", "PDF文件/**"],
  });
  const shortMap = buildShortUrlMap(pages);
  writeShortMap(targetFile, shortMap);
};

/** 生成生产构建使用的短链接哈希表 */
export default async function mapShortUrl(siteConfig: SiteConfig) {
  try {
    const shortMap = buildShortUrlMap(siteConfig.pages);
    writeShortMap(path.join(siteConfig.outDir, "shortmap.json"), shortMap);
    for (const [oldPage, newPage] of Object.entries(pageAliases)) {
      if (!siteConfig.pages.includes(newPage)) {
        throw new Error(`Missing redirect target: ${newPage}`);
      }
      const oldHtml = oldPage.replace(/\.md$/, ".html");
      const newUrl = `/${encodeURI(newPage.replace(/\.md$/, ".html"))}`;
      const targetFile = path.join(siteConfig.outDir, oldHtml);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(
        targetFile,
        `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">` +
          `<title>页面已迁移</title><link rel="canonical" href="${newUrl}">` +
          `<meta http-equiv="refresh" content="0;url=${newUrl}">` +
          `<script>location.replace(${JSON.stringify(newUrl)} + location.search + location.hash)</script>` +
          `</head><body><a href="${newUrl}">前往新的文章地址</a></body></html>`,
      );
    }
  } catch (err) {
    throw new Error("Failed to generate short links and page redirects", { cause: err });
  }
}
