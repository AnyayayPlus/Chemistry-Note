import { defineConfig } from "vitepress";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSidebarItems } from "./siteData/sidebar";
import { buildNavItems } from "./siteData/nav";
import { buildTransformHead } from "./siteData/transformHead";
import mapShortUrl from "./theme/components/shortUrl/mapShortUrl";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(configDir, "..");
const siteUrl = "https://chemistry-note.seeridia.top";
const siteName = "Anyayay's Chemistry Note";
const defaultDescription =
  "免费高中化学笔记，覆盖原子结构、有机化学、元素化合物、化学实验等核心板块，适合课堂学习与高考复习。";
const navItems = buildNavItems(contentRoot);
const sidebarItems = buildSidebarItems(contentRoot);

export default defineConfig({
  title: siteName,
  description: defaultDescription,
  lang: "zh-CN",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/images/icon.svg" }],
    ["meta", { name: "author", content: "Seeridia" }],
    [
      "meta",
      {
        name: "keywords",
        content: "高中化学,化学笔记,高考化学,有机化学,化学实验",
      },
    ],
    ["meta", { name: "robots", content: "index, follow, max-image-preview:large" }],
    ["meta", { property: "og:site_name", content: siteName }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:locale", content: "zh_CN" }],
    ["meta", { property: "og:image", content: `${siteUrl}/images/og-image.png` }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:image", content: `${siteUrl}/images/og-image.png` }],
    ["meta", { name: "twitter:title", content: siteName }],
    ["meta", { name: "twitter:description", content: defaultDescription }],
    [
      "script",
      {
        defer: "",
        src: "https://umami.seeridia.top/script.js",
        "data-website-id": "6e0dca50-3236-4b50-86f1-39d18cc9fc54",
        "data-performance": "true",
      },
    ],
    [
      "script",
      {
        defer: "",
        src: "https://umami.seeridia.top/recorder.js",
        "data-website-id": "6e0dca50-3236-4b50-86f1-39d18cc9fc54",
        "data-sample-rate": "0.05",
        "data-mask-level": "moderate",
        "data-max-duration": "300000",
      },
    ],
  ],
  themeConfig: {
    logo: "/images/icon.svg",
    siteTitle: "Chemistry Note",
    nav: navItems,
    sidebar: { "/": sidebarItems },
    socialLinks: [{ icon: "github", link: "https://github.com/Seeridia/Chemistry-Note" }],
    search: {
      provider: "algolia",
      options: {
        appId: "78SSXF876P",
        apiKey: "7d9417f0dc128971ed3eacc5f4fbb2e0",
        indexName: "Chemistry Note",
        askAi: {
          assistantId: "gGugAZCzGHst",
        },
      },
    },
    editLink: {
      pattern: "https://github.com/Seeridia/Chemistry-Note/edit/master/:path",
      text: "在 GitHub 上查看此页",
    },
    footer: {
      message: "闽ICP备2025099091号",
      copyright: "Copyright © 2026 Seeridia",
    },
  },
  markdown: {
    math: true,
  },
  rewrites: {
    "hidePage/shortUrl.md": "s.md",
  },
  transformHead: buildTransformHead(siteUrl, siteName, defaultDescription),
  lastUpdated: true,
  sitemap: {
    hostname: siteUrl,
  },

  // 生成哈希 - 路径对应表
  buildEnd: (siteConfig) => {
    mapShortUrl(siteConfig);
  },
});
