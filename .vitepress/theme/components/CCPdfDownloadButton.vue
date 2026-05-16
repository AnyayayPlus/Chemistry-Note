<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

import { trackUmamiEvent } from "../utils/umami";

const { page } = useData();

const PDF_BASE_URL = "https://cnb.cool/Seeridia/Chemistry-Note-File/-/git/raw/main/";

const pdfUrl = computed(() => {
  const filePath = page.value.filePath ?? "";
  if (!filePath.endsWith(".md")) return "";
  const pdfPath = filePath.replace(/\.md$/i, ".pdf");
  return `${PDF_BASE_URL}${encodeURI(pdfPath)}?download=true`;
});

// 只有在文档页面才显示下载 PDF 按钮
const isDocPage = computed(() => (page.value.frontmatter?.layout ?? "doc") === "doc");
const shouldShow = computed(() => isDocPage.value && pdfUrl.value);

const trackPdfDownload = (kind: "page" | "all") => {
  trackUmamiEvent(kind === "page" ? "pdf_download_page" : "pdf_download_all", {
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
      @click="trackPdfDownload('page')"
    >
      <span class="CCPdfDownloadButtonBtnLabel">下载本页</span>
      <span class="CCPdfDownloadButtonBtnHint">PDF</span>
    </a>
    <a
      class="CCPdfDownloadButtonBtn"
      href="https://umami.seeridia.top/q/e8e52FUHV"
      target="_blank"
      rel="noopener"
      @click="trackPdfDownload('all')"
    >
      <span class="CCPdfDownloadButtonBtnLabel">下载全部</span>
      <span class="CCPdfDownloadButtonBtnHint">PDF</span>
    </a>
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
