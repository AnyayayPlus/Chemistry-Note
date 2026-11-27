import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

import { isPdfExportable, sourceToHtmlPath } from "../.vitepress/shared/page.ts";
import { pageAliases } from "../.vitepress/siteData/pageAliases.ts";

const defaults = {
  include: ["**/*.html"],
  exclude: ["404.html", "**/index.html", "s.html", "README.html", "hidePage/**"],
};
const redirectPages = Object.keys(pageAliases).map(sourceToHtmlPath);

/** @param {unknown} value @param {string[]} fallback */
const patterns = (value, fallback) => {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item) => typeof item === "string" && item.length > 0);
  return items.length > 0 ? items : fallback;
};

export const loadProjectConfig = (cwd = process.cwd()) => {
  const configPath = path.resolve(cwd, "config.yml");
  const pdf = fs.existsSync(configPath)
    ? YAML.parse(fs.readFileSync(configPath, "utf8"))?.export?.pdf
    : undefined;
  return {
    export: {
      pdf: {
        include: patterns(pdf?.include, defaults.include),
        exclude: [...patterns(pdf?.exclude, defaults.exclude), ...redirectPages],
      },
    },
  };
};

/** @param {string} filePath @param {ReturnType<typeof loadProjectConfig>} config */
export const shouldExportPdfPage = (filePath, config) =>
  isPdfExportable(filePath, config.export.pdf);
