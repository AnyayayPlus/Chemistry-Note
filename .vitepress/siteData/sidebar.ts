import type { DefaultTheme } from "vitepress";

import fs from "node:fs";
import path from "node:path";

const sectionDirPattern = /^\d{2}\s/;
const ignoredRootDirs = new Set([
  ".vitepress",
  "node_modules",
  "public",
  "data",
  "hidePage",
  "PDF文件",
]);

export const encodeLink = (link: string): string => encodeURI(link);

export const getSections = (rootDir: string): string[] =>
  fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        sectionDirPattern.test(dirent.name) &&
        !ignoredRootDirs.has(dirent.name),
    )
    .map((dirent) => dirent.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

export const getSectionFiles = (sectionPath: string): string[] =>
  fs
    .readdirSync(sectionPath, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md"))
    .map((dirent) => dirent.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

// Build sidebar from numbered top-level folders and their markdown files.
export const buildSidebarItems = (rootDir: string): DefaultTheme.SidebarItem[] => {
  const sections = getSections(rootDir);

  return sections.map((sectionName) => {
    const sectionPath = path.join(rootDir, sectionName);
    const files = getSectionFiles(sectionPath).filter((name) => name.toLowerCase() !== "index.md");

    const items: DefaultTheme.SidebarItem[] = files.map((filename) => {
      const name = filename.slice(0, -3);
      return {
        text: name,
        link: encodeLink(`/${sectionName}/${name}`),
      };
    });

    return {
      text: sectionName,
      link: encodeLink(`/${sectionName}/index`),
      items,
      collapsed: true,
    };
  });
};
