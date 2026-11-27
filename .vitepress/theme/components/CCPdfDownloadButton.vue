<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

import type { SiteThemeConfig } from "../../shared/theme.ts";

import { htmlToPdfPath, isPdfExportable, sourceToHtmlPath } from "../../shared/page.ts";
import { PDF_BASE_URL } from "../../shared/site.ts";
import { trackUmamiEvent } from "../utils/umami";
import CCPdfDownloadLink from "./CCPdfDownloadLink.vue";

const { page, theme } = useData<SiteThemeConfig>();

const pdfUrl = computed(() => {
  const htmlPath = sourceToHtmlPath(page.value.relativePath || "");
  const rules = theme.value.pdfExport;
  if (!rules || !isPdfExportable(htmlPath, rules)) return "";
  const pdfPath = htmlToPdfPath(htmlPath);
  return `${PDF_BASE_URL}${encodeURI(pdfPath)}?download=true`;
});

const shouldShow = computed(
  () => (page.value.frontmatter?.layout ?? "doc") === "doc" && Boolean(pdfUrl.value),
);

const trackPageDownload = () => {
  trackUmamiEvent("pdf_download_page", {
    page_path: page.value.relativePath || page.value.filePath || "",
    page_title: page.value.title || "",
    source: "nav_download",
  });
};
</script>

<template>
  <div class="CCPdfDownloadButton">
    <a
      v-if="shouldShow"
      class="CCPdfDownloadButtonBtn"
      :href="pdfUrl"
      target="_blank"
      rel="noopener"
      @click="trackPageDownload"
    >
      <span class="CCPdfDownloadButtonBtnLabel">下载本页</span>
      <span class="CCPdfDownloadButtonBtnHint">PDF</span>
    </a>
    <CCPdfDownloadLink class="CCPdfDownloadButtonBtn" source="nav_download">
      <span class="CCPdfDownloadButtonBtnLabel">下载全部</span>
      <span class="CCPdfDownloadButtonBtnHint">PDF</span>
    </CCPdfDownloadLink>
  </div>
</template>

<style scoped>
.CCPdfDownloadButton {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.CCPdfDownloadButtonBtn {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  transition:
    border-color 0.25s,
    background-color 0.25s,
    color 0.25s;
  cursor: pointer;
}

.CCPdfDownloadButtonBtn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft-hover);
  color: var(--vp-c-text-1);
}

.CCPdfDownloadButtonBtnLabel {
  font-weight: 600;
}

.CCPdfDownloadButtonBtnHint {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: color-mix(in srgb, var(--vp-c-bg-elv) 70%, transparent);
}

@media (max-width: 640px) {
  .CCPdfDownloadButton {
    width: 100%;
  }

  .CCPdfDownloadButtonBtn {
    justify-content: center;
    flex: 1 1 calc(50% - 6px);
    min-width: 0;
  }
}
</style>
