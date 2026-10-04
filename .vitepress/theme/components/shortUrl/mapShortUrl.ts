// 参考自 https://notes.linho.cc/s?q=adaf352048

import type { SiteConfig } from "vitepress";

import md5 from "blueimp-md5";
import fs from "node:fs";
import path from "node:path";

import type { ContentCatalog } from "../../../siteData/content.ts";

import {
  sourceToHtmlPath,
  sourceToPublicPath,
  sourceToShortLinkPath,
} from "../../../shared/page.ts";
import { pageAliases } from "../../../siteData/pageAliases.ts";

type ShortUrlMap = {
  [key: string]: string;
};

export const buildShortUrlMap = (catalog: ContentCatalog): ShortUrlMap => {
  const shortMap: ShortUrlMap = {};
  for (const page of catalog.pages) {
    const normalizedPath = page.shortLinkPath;
    shortMap[md5(normalizedPath).slice(0, 10)] = normalizedPath;
  }
  for (const [oldPage, newPage] of Object.entries(pageAliases)) {
    if (!catalog.pages.some((page) => page.sourcePath === newPage)) continue;
    shortMap[md5(sourceToShortLinkPath(oldPage)).slice(0, 10)] = sourceToShortLinkPath(newPage);
  }
  return shortMap;
};

const writeShortMap = (targetFile: string, shortMap: ShortUrlMap) => {
  fs.writeFileSync(targetFile, JSON.stringify(shortMap));
};

/** 生成生产构建使用的短链接哈希表 */
export default async function mapShortUrl(siteConfig: SiteConfig, catalog: ContentCatalog) {
  try {
    const shortMap = buildShortUrlMap(catalog);
    writeShortMap(path.join(siteConfig.outDir, "shortmap.json"), shortMap);
    for (const [oldPage, newPage] of Object.entries(pageAliases)) {
      if (!siteConfig.pages.includes(newPage)) {
        throw new Error(`Missing redirect target: ${newPage}`);
      }
      const oldHtml = sourceToHtmlPath(oldPage);
      const newUrl = sourceToPublicPath(newPage);
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
