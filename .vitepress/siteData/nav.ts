import type { DefaultTheme } from "vitepress";

import { sourceToRoutePath } from "../shared/page.ts";
import { getSections } from "./sidebar";

export const buildNavItems = (rootDir: string): DefaultTheme.NavItem[] => {
  const sections = getSections(rootDir);

  const items: DefaultTheme.NavItemWithLink[] = sections.map((sectionName) => {
    return { text: sectionName, link: sourceToRoutePath(`${sectionName}/index.md`) };
  });

  return [
    { text: "首页", link: "/" },
    {
      text: "目录",
      items,
    },
    {
      text: "分享",
      items: [{ component: "CCShare" }],
    },
    {
      text: "下载",
      items: [{ component: "CCPdfDownloadButton" }],
    },
    { component: "CCSiteSettings" },
  ];
};
