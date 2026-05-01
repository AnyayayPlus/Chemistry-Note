import type { HeadConfig, TransformContext } from "vitepress";
import type {
  Article,
  BreadcrumbList,
  CollectionPage,
  LearningResource,
  ListItem,
  Thing,
  WebPage,
  WebSite,
  WithContext,
} from "schema-dts";

type JsonLd<T extends Thing> = WithContext<T>;

function toPublicPath(relativePath: string): string {
  if (relativePath === "index.md") return "/";
  return `/${encodeURI(relativePath.replace(/\.md$/i, ".html"))}`;
}

function isChapterIndexPath(relativePath: string): boolean {
  return /^\d{2}\s[^/]+\/index\.md$/i.test(relativePath);
}

function toBreadcrumbItemPath(pathParts: string[], index: number): string {
  if (index === 0) {
    return `/${pathParts[0]}/index.html`;
  }
  return `/${pathParts.slice(0, index + 1).join("/")}`;
}

function toBreadcrumbName(input: string): string {
  return input.replace(/^\d+\s*/, "").trim();
}

function normalizeDescription(input?: string): string | undefined {
  if (!input) return undefined;
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function toIsoDate(input: unknown): string | undefined {
  if (typeof input === "number") {
    if (input <= 0) return undefined;
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof input === "string" && input.trim()) {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? undefined : input.toISOString();
  }
  return undefined;
}

export function buildTransformHead(siteUrl: string, siteName: string, defaultDescription: string) {
  return function transformHead({ pageData }: TransformContext): HeadConfig[] {
    const relativePath = pageData.relativePath;
    const canonicalUrl = `${siteUrl}${toPublicPath(relativePath)}`;
    const websiteId = `${siteUrl}/#website`;
    const webPageId = `${canonicalUrl}#webpage`;
    const defaultImageUrl = `${siteUrl}/images/og-image.png`;
    const pagePath = toPublicPath(relativePath);
    const pageDescription =
      normalizeDescription(pageData.description) ||
      normalizeDescription(pageData.frontmatter.description as string | undefined) ||
      defaultDescription;
    const pageTitle = pageData.title ? `${pageData.title} | ${siteName}` : siteName;
    const isHomePage = relativePath === "index.md";
    const is404Page = relativePath === "404.md";
    const isHiddenUtilityPage = /^hidePage\//i.test(relativePath);
    const isChapterIndex = isChapterIndexPath(relativePath);
    const publishedTime = toIsoDate((pageData.frontmatter as Record<string, unknown>)?.date);
    const modifiedTime =
      toIsoDate((pageData as { lastUpdated?: unknown }).lastUpdated) ||
      toIsoDate((pageData.frontmatter as Record<string, unknown>)?.lastUpdated);

    const websiteJsonLd: JsonLd<WebSite> = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": websiteId,
      name: siteName,
      url: `${siteUrl}/`,
      inLanguage: "zh-CN",
      description: defaultDescription,
    };

    const webPageJsonLd: JsonLd<WebPage> = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": webPageId,
      name: pageTitle,
      url: canonicalUrl,
      description: pageDescription,
      image: defaultImageUrl,
      isPartOf: {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteName,
        url: `${siteUrl}/`,
      },
      inLanguage: "zh-CN",
      ...(publishedTime ? { datePublished: publishedTime } : {}),
      ...(modifiedTime ? { dateModified: modifiedTime } : {}),
    };

    const pathParts = pagePath
      .replace(/^\/|\/$/g, "")
      .split("/")
      .filter(Boolean);
    const breadcrumbItems: ListItem[] = [
      {
        "@type": "ListItem" as const,
        position: 1,
        name: "首页",
        item: `${siteUrl}/`,
      },
      ...pathParts
        .map((part, index): ListItem => {
          const itemPath = toBreadcrumbItemPath(pathParts, index);
          return {
            "@type": "ListItem" as const,
            position: index + 2,
            name: toBreadcrumbName(decodeURIComponent(part).replace(/\.html$/i, "")),
            item: `${siteUrl}${itemPath}`,
          };
        })
        .filter((item) => typeof item.name === "string" && item.name.toLowerCase() !== "index"),
    ];

    const tags: HeadConfig[] = [
      ["link", { rel: "canonical", href: canonicalUrl }],
      ["meta", { property: "og:url", content: canonicalUrl }],
      ["meta", { property: "og:title", content: pageTitle }],
      ["meta", { property: "og:description", content: pageDescription }],
      ["meta", { name: "twitter:title", content: pageTitle }],
      ["meta", { name: "twitter:description", content: pageDescription }],
    ];
    if (isHiddenUtilityPage) {
      tags.push(["meta", { name: "robots", content: "noindex, nofollow, noarchive" }]);
      tags.push(["meta", { name: "googlebot", content: "noindex, nofollow, noarchive" }]);
    }
    if (!is404Page && !isHiddenUtilityPage) {
      tags.push(["script", { type: "application/ld+json" }, JSON.stringify(webPageJsonLd)]);
    }

    if (isHomePage && !isHiddenUtilityPage) {
      tags.push(["script", { type: "application/ld+json" }, JSON.stringify(websiteJsonLd)]);
    }

    if (!is404Page && !isHiddenUtilityPage && breadcrumbItems.length > 1) {
      const breadcrumbJsonLd: JsonLd<BreadcrumbList> = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        name: `${pageData.title || siteName} 导航`,
        itemListElement: breadcrumbItems,
      };
      tags.push(["script", { type: "application/ld+json" }, JSON.stringify(breadcrumbJsonLd)]);
    }

    if (!isHomePage && !is404Page && !isHiddenUtilityPage && isChapterIndex) {
      const collectionJsonLd: JsonLd<CollectionPage> = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collectionpage`,
        name: pageTitle,
        url: canonicalUrl,
        description: pageDescription,
        image: defaultImageUrl,
        inLanguage: "zh-CN",
        isPartOf: {
          "@type": "WebSite",
          "@id": websiteId,
          name: siteName,
          url: `${siteUrl}/`,
        },
        ...(publishedTime ? { datePublished: publishedTime } : {}),
        ...(modifiedTime ? { dateModified: modifiedTime } : {}),
      };

      tags.push(["script", { type: "application/ld+json" }, JSON.stringify(collectionJsonLd)]);
    }

    if (!isHomePage && !is404Page && !isHiddenUtilityPage && !isChapterIndex) {
      const isLearningResource =
        /^\d{2}\s/.test(relativePath) ||
        ["考点", "复习", "实验", "基础", "概念"].some((keyword) =>
          (pageData.title || "").includes(keyword),
        );
      const sharedArticleFields = {
        "@context": "https://schema.org" as const,
        "@id": `${canonicalUrl}#article`,
        name: pageData.title || siteName,
        headline: pageData.title || siteName,
        description: pageDescription,
        url: canonicalUrl,
        image: defaultImageUrl,
        inLanguage: "zh-CN",
        mainEntityOfPage: {
          "@type": "WebPage" as const,
          "@id": webPageId,
          name: pageTitle,
          url: canonicalUrl,
        },
        author: {
          "@type": "Person" as const,
          name: "Seeridia",
        },
        publisher: {
          "@type": "Organization" as const,
          "@id": `${siteUrl}/#organization`,
          name: siteName,
          logo: {
            "@type": "ImageObject" as const,
            url: `${siteUrl}/images/icon.svg`,
          },
        },
        ...(publishedTime ? { datePublished: publishedTime } : {}),
        ...(modifiedTime ? { dateModified: modifiedTime } : {}),
      };

      tags.push([
        "script",
        { type: "application/ld+json" },
        JSON.stringify(
          isLearningResource
            ? ({
                ...sharedArticleFields,
                "@type": "LearningResource",
                learningResourceType: "StudyGuide",
                educationalLevel: "High school",
                educationalUse: "SelfStudy",
                teaches: pageData.title || pageDescription,
              } satisfies JsonLd<LearningResource>)
            : ({
                ...sharedArticleFields,
                "@type": "Article",
              } satisfies JsonLd<Article>),
        ),
      ]);
    }

    return tags;
  };
}
