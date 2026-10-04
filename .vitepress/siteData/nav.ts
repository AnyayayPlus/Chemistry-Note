import type { DefaultTheme } from "vitepress";

import type { ContentCatalog } from "./content.ts";

export const buildNavItems = (catalog: ContentCatalog): DefaultTheme.NavItem[] => {
  const items: DefaultTheme.NavItemWithLink[] = catalog.sections.map((section) => ({
    text: section.name,
    link: section.routePath,
  }));

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
