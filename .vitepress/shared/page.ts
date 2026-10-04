/** Shared by the theme, VitePress build and Node export scripts. */
export const normalizeSourcePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^(?:\.\/|\/)+/, "");

export const sourceToHtmlPath = (value: string): string =>
  normalizeSourcePath(value).replace(/\.md$/i, ".html");

/** Navigation keeps the existing extensionless /chapter/index links. */
export const sourceToRoutePath = (value: string): string => {
  const source = normalizeSourcePath(value);
  return source === "index.md" ? "/" : `/${encodeURI(source.replace(/\.md$/i, ""))}`;
};

export const sourceToPublicPath = (value: string): string => {
  const source = normalizeSourcePath(value);
  return source === "index.md" ? "/" : `/${encodeURI(sourceToHtmlPath(source))}`;
};

export const htmlToPdfPath = (value: string): string =>
  normalizeSourcePath(value).replace(/\.html$/i, ".pdf");

// Preserve the published MD5 input, including index-page trailing slashes.
export const sourceToShortLinkPath = (value: string): string =>
  normalizeSourcePath(value).replace(/(index)?\.md$/, "");

export const getSectionKey = (value: string): string => {
  const pathname = value.split(/[?#]/)[0];
  let decoded = pathname;
  try {
    decoded = decodeURI(pathname);
  } catch {
    // Malformed URL encoding must not break page rendering.
  }
  return normalizeSourcePath(decoded).split("/")[0] || "";
};

export type PageKind = "home" | "chapter" | "article" | "utility";

export const getPageKind = (value: string): PageKind => {
  const source = normalizeSourcePath(value);
  if (source === "index.md") return "home";
  if (/^\d{2}\s[^/]+\/index\.md$/i.test(source)) return "chapter";
  if (
    !source.endsWith(".md") ||
    /^(?:README|404|s)\.md$/i.test(source) ||
    /^(?:hidePage|scripts)\//.test(source) ||
    /\/index\.md$/i.test(source)
  )
    return "utility";
  return "article";
};

export type PdfExportRules = { include: string[]; exclude: string[] };

const globToRegExp = (pattern: string): RegExp => {
  const normalized = normalizeSourcePath(pattern);
  let source = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "*") {
      if (normalized[index + 1] === "*") {
        if (normalized[index + 2] === "/") {
          source += "(?:.*\\/)?";
          index += 2;
        } else {
          source += ".*";
          index += 1;
        }
      } else source += "[^/]*";
    } else if (char === "?") source += "[^/]";
    else source += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
};

export const matchesAnyPattern = (value: string, patterns: string[]): boolean =>
  patterns.some((pattern) => globToRegExp(pattern).test(normalizeSourcePath(value)));

export const isPdfExportable = (htmlPath: string, rules: PdfExportRules): boolean =>
  /\.html$/i.test(htmlPath) &&
  matchesAnyPattern(htmlPath, rules.include) &&
  !matchesAnyPattern(htmlPath, rules.exclude);
