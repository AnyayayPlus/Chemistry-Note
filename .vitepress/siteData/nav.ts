import type { DefaultTheme } from "vitepress";

import { encodeLink, getSections } from "./sidebar";

export const buildNavItems = (rootDir: string): DefaultTheme.NavItem[] => {
  const sections = getSections(rootDir);

  const items: DefaultTheme.NavItemWithLink[] = sections.map((sectionName) => {
    const link = `/${sectionName}/index`;
    return { text: sectionName, link: encodeLink(link) };
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
  ];
};
