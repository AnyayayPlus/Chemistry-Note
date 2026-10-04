import type { Plugin, ViteDevServer } from "vite-plus";

import path from "node:path";

import type { ContentCatalog } from "./content.ts";

import { matchesAnyPattern } from "../shared/page.ts";
import { buildShortUrlMap } from "../theme/components/shortUrl/mapShortUrl.ts";
import { CONTENT_EXCLUDES } from "./content.ts";

/** Reload config on structural changes; article edits retain normal Markdown HMR. */
export const contentPlugin = (rootDir: string, getCatalog: () => ContentCatalog): Plugin => {
  let server: ViteDevServer;
  return {
    name: "chemistry-content-catalog",
    apply: "serve",
    configureServer(devServer) {
      server = devServer;
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/shortmap.json") return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(buildShortUrlMap(getCatalog())));
      });
    },
    hotUpdate({ file, type }) {
      if (this.environment.name !== "client" || type === "update" || !file.endsWith(".md")) return;
      const relativePath = path.relative(rootDir, file).replace(/\\/g, "/");
      if (relativePath.startsWith("../") || matchesAnyPattern(relativePath, CONTENT_EXCLUDES))
        return;
      // VitePress handles config changes by rescanning and rebuilding its site data.
      // Request that same reload without modifying the user's config file.
      server.watcher.emit("change", path.join(rootDir, ".vitepress/config.mts"));
      return [];
    },
  };
};
