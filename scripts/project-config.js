import fs from "fs";
import path from "path";
import YAML from "yaml";

const defaultConfig = {
  export: {
    pdf: {
      distDir: ".vitepress/dist",
      outDir: "pdf-repo",
      concurrency: {
        default: 8,
        min: 1,
        max: 8,
      },
      include: ["**/*.html"],
      exclude: ["404.html", "**/index.html", "s.html", "README.html", "hidePage/**"],
      page: {
        format: "A4",
        margin: {
          top: "10mm",
          bottom: "10mm",
          left: "10mm",
          right: "10mm",
        },
      },
    },
    changedPages: {
      outDir: ".github/changed-pages",
      globalChange: [
        ".vitepress/**",
        "public/**",
        "data/**",
        "package.json",
        "pnpm-workspace.yaml",
        ".node-version",
        "vite.config.ts",
        "pnpm-lock.yaml",
        "config.yml",
      ],
      sourceExtensions: [".md"],
    },
  },
};

const configFileName = "config.yml";

/** @param {string} filePath */
const normalizePath = (filePath) => filePath.replace(/\\/g, "/").replace(/^\.\/+/, "");

/** @param {string} value */
const escapeRegExp = (value) => value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");

/** @param {string} pattern */
const globToRegExp = (pattern) => {
  const normalized = normalizePath(pattern);
  let source = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const nextChar = normalized[index + 1];

    if (char === "*") {
      if (nextChar === "*") {
        const afterGlobstar = normalized[index + 2];
        if (afterGlobstar === "/") {
          source += "(?:.*\\/)?";
          index += 2;
        } else {
          source += ".*";
          index += 1;
        }
      } else {
        source += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      source += "[^/]";
      continue;
    }

    source += escapeRegExp(char);
  }

  return new RegExp(`^${source}$`);
};

/** @param {string} filePath @param {string} pattern */
const matchesPattern = (filePath, pattern) => globToRegExp(pattern).test(normalizePath(filePath));

/** @param {unknown} value @param {string[]} fallback */
const asStringArray = (value, fallback) => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const items = value.filter((item) => typeof item === "string" && item.length > 0);
  return items.length > 0 ? items : fallback;
};

/** @param {unknown} value @param {string} fallback */
const asString = (value, fallback) => (typeof value === "string" && value ? value : fallback);

/** @param {unknown} value @param {number} fallback */
const asPositiveInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

/** @param {typeof defaultConfig} rawConfig */
const buildConcurrencyConfig = (rawConfig) => {
  const minConcurrency = asPositiveInteger(
    rawConfig.export?.pdf?.concurrency?.min,
    defaultConfig.export.pdf.concurrency.min,
  );
  const maxConcurrency = Math.max(
    minConcurrency,
    asPositiveInteger(
      rawConfig.export?.pdf?.concurrency?.max,
      defaultConfig.export.pdf.concurrency.max,
    ),
  );
  const defaultConcurrency = asPositiveInteger(
    rawConfig.export?.pdf?.concurrency?.default,
    defaultConfig.export.pdf.concurrency.default,
  );

  return {
    default: Math.max(minConcurrency, Math.min(maxConcurrency, defaultConcurrency)),
    min: minConcurrency,
    max: maxConcurrency,
  };
};

export const loadProjectConfig = (cwd = process.cwd()) => {
  const configPath = path.resolve(cwd, configFileName);
  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  const rawConfig = YAML.parse(fs.readFileSync(configPath, "utf8")) ?? {};
  return {
    export: {
      pdf: {
        distDir: asString(rawConfig.export?.pdf?.distDir, defaultConfig.export.pdf.distDir),
        outDir: asString(rawConfig.export?.pdf?.outDir, defaultConfig.export.pdf.outDir),
        concurrency: buildConcurrencyConfig(rawConfig),
        include: asStringArray(rawConfig.export?.pdf?.include, defaultConfig.export.pdf.include),
        exclude: asStringArray(rawConfig.export?.pdf?.exclude, defaultConfig.export.pdf.exclude),
        page: {
          format: asString(
            rawConfig.export?.pdf?.page?.format,
            defaultConfig.export.pdf.page.format,
          ),
          margin: {
            top: asString(
              rawConfig.export?.pdf?.page?.margin?.top,
              defaultConfig.export.pdf.page.margin.top,
            ),
            bottom: asString(
              rawConfig.export?.pdf?.page?.margin?.bottom,
              defaultConfig.export.pdf.page.margin.bottom,
            ),
            left: asString(
              rawConfig.export?.pdf?.page?.margin?.left,
              defaultConfig.export.pdf.page.margin.left,
            ),
            right: asString(
              rawConfig.export?.pdf?.page?.margin?.right,
              defaultConfig.export.pdf.page.margin.right,
            ),
          },
        },
      },
      changedPages: {
        outDir: asString(
          rawConfig.export?.changedPages?.outDir,
          defaultConfig.export.changedPages.outDir,
        ),
        globalChange: asStringArray(
          rawConfig.export?.changedPages?.globalChange,
          defaultConfig.export.changedPages.globalChange,
        ),
        sourceExtensions: asStringArray(
          rawConfig.export?.changedPages?.sourceExtensions,
          defaultConfig.export.changedPages.sourceExtensions,
        ),
      },
    },
  };
};

/** @param {string} filePath @param {string[]} patterns */
export const matchesAnyPattern = (filePath, patterns) =>
  patterns.some((pattern) => matchesPattern(filePath, pattern));

/** @param {string} filePath @param {typeof defaultConfig} config */
export const shouldExportPdfPage = (filePath, config) => {
  const normalized = normalizePath(filePath);
  return (
    matchesAnyPattern(normalized, config.export.pdf.include) &&
    !matchesAnyPattern(normalized, config.export.pdf.exclude)
  );
};

/** @param {string} filePath @param {typeof defaultConfig} config */
export const isTrackedSourcePage = (filePath, config) => {
  const normalized = normalizePath(filePath);
  return config.export.changedPages.sourceExtensions.some((extension) =>
    normalized.toLowerCase().endsWith(extension.toLowerCase()),
  );
};
