// 参考自 https://notes.linho.cc/s?q=adaf352048

import type { SiteConfig } from "vitepress";

import md5 from "blueimp-md5";
import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";

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
  } catch (err) {
    console.error("Create shortmap.json failed!", err);
  }
}
