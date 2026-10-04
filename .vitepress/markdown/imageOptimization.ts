import type { RenderRule } from "markdown-it/lib/renderer.mjs";
import type { MarkdownRenderer } from "vitepress";

const LOCAL_RASTER_IMAGE = /\.(?:avif|bmp|jpe?g|jfif|png|tiff?|webp)(?:[?#]|$)/i;
const IMAGE_TAG = /<img\b[^>]*>/gi;
const SOURCE_ATTRIBUTE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;
const ESA_RESIZE = "image_process=resize,l_1440";

type MarkdownEnvironment = Record<string, unknown> & {
  __ccHasPriorityImage?: boolean;
};

function addEsaResize(source: string): string {
  if (
    !LOCAL_RASTER_IMAGE.test(source) ||
    /^(?:data:|https?:|\/\/)/i.test(source) ||
    /(?:^|[?&])image_process=/.test(source)
  ) {
    return source;
  }

  return `${source}${source.includes("?") ? "&" : "?"}${ESA_RESIZE}`;
}

function addAttribute(tag: string, name: string, value: string): string {
  if (new RegExp(`\\s${name}\\s*=`, "i").test(tag)) return tag;
  return tag.replace(/\s*\/?\s*>$/, (ending) => ` ${name}="${value}"${ending}`);
}

function optimizeImageTag(tag: string, env: MarkdownEnvironment): string {
  const sourceMatch = tag.match(SOURCE_ATTRIBUTE);
  if (sourceMatch) {
    const source = sourceMatch[1] ?? sourceMatch[2] ?? sourceMatch[3];
    const optimizedSource = addEsaResize(source);

    if (optimizedSource !== source) {
      const quote = sourceMatch[1] !== undefined ? '"' : sourceMatch[2] !== undefined ? "'" : '"';
      tag = tag.replace(SOURCE_ATTRIBUTE, `src=${quote}${optimizedSource}${quote}`);
      tag = addAttribute(tag, "data-esa-optimized", "true");
    }
  }

  tag = addAttribute(tag, "decoding", "async");

  if (!env.__ccHasPriorityImage) {
    env.__ccHasPriorityImage = true;
    tag = addAttribute(tag, "loading", "eager");
    tag = addAttribute(tag, "fetchpriority", "high");
  } else {
    tag = addAttribute(tag, "loading", "lazy");
  }

  return tag;
}

function optimizeRenderedImages(html: string, env: MarkdownEnvironment): string {
  return html.replace(IMAGE_TAG, (tag) => optimizeImageTag(tag, env));
}

function wrapRule(md: MarkdownRenderer, ruleName: "html_block" | "html_inline" | "image"): void {
  const fallbackRule = md.renderer.rules[ruleName];

  md.renderer.rules[ruleName] = ((tokens, index, options, env, self) => {
    const html = fallbackRule
      ? fallbackRule(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options);

    return optimizeRenderedImages(html, env as MarkdownEnvironment);
  }) satisfies RenderRule;
}

/** Adds ESA resizing and browser-native loading hints to images rendered from Markdown. */
export function configureImageOptimization(md: MarkdownRenderer): void {
  wrapRule(md, "image");
  wrapRule(md, "html_inline");
  wrapRule(md, "html_block");
}
