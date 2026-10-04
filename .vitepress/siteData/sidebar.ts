import type { DefaultTheme } from "vitepress";

import type { ContentCatalog } from "./content.ts";

export const buildSidebarItems = (catalog: ContentCatalog): DefaultTheme.SidebarItem[] =>
  catalog.sections.map((section) => ({
    text: section.name,
    link: section.routePath,
    items: section.pages.map((page) => ({ text: page.title, link: page.routePath })),
    collapsed: true,
  }));
