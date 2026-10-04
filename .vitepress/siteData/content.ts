import fg from "fast-glob";

import type { PageKind } from "../shared/page.ts";

import {
  getPageKind,
  sourceToHtmlPath,
  sourceToPublicPath,
  sourceToRoutePath,
  sourceToShortLinkPath,
} from "../shared/page.ts";

// VitePress and this catalog share the same content boundary.
export const CONTENT_EXCLUDES = [
  ".vitepress/**",
  "**/node_modules/**",
  "**/dist/**",
  "public/**",
  "data/**",
  "export/**",
  "PDF文件/**",
  "pdf-repo/**",
  "pdf-repo-single/**",
];

export type ContentPage = {
  sourcePath: string;
  title: string;
  kind: PageKind;
  routePath: string;
  publicPath: string;
  htmlPath: string;
  shortLinkPath: string;
};

export type ContentSection = {
  name: string;
  routePath: string;
  pages: ContentPage[];
};

export type ContentCatalog = {
  pages: ContentPage[];
  sections: ContentSection[];
};

export const scanContent = (rootDir: string): ContentCatalog => {
  const entries = fg.sync(["*", "**/*.md"], {
    cwd: rootDir,
    onlyFiles: false,
    objectMode: true,
    followSymbolicLinks: false,
    ignore: CONTENT_EXCLUDES,
  });
  const pages = entries
    .filter((entry) => entry.dirent.isFile() && entry.path.endsWith(".md"))
    .map(({ path: sourcePath }): ContentPage => ({
      sourcePath,
      title: sourcePath.split("/").at(-1)!.slice(0, -3),
      kind: getPageKind(sourcePath),
      routePath: sourceToRoutePath(sourcePath),
      publicPath: sourceToPublicPath(sourcePath),
      htmlPath: sourceToHtmlPath(sourcePath),
      shortLinkPath: sourceToShortLinkPath(sourcePath),
    }))
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath, "zh-CN"));
  const sections = entries
    .filter((entry) => entry.dirent.isDirectory() && /^\d{2}\s[^/]+$/.test(entry.path))
    .map(({ path: name }): ContentSection => ({
      name,
      routePath: sourceToRoutePath(`${name}/index.md`),
      // Keep the current sidebar's direct-child scope and filename ordering.
      pages: pages.filter(
        (page) =>
          page.sourcePath.startsWith(`${name}/`) &&
          page.sourcePath.split("/").length === 2 &&
          page.title.toLowerCase() !== "index",
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return { pages, sections };
};
