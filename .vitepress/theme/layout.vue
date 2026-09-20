<script setup>
import mediumZoom from "medium-zoom";
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, onMounted, onBeforeUnmount, watch } from "vue";

import CCArticleContributors from "./components/CCArticleContributors.vue";
import Breadcrumb from "./components/CCBreadCrumb.vue";
import CCFooter from "./components/CCFooter.vue";
import { CCPageviews, CCWaline } from "./components/waline";
import { bootstrapSiteSettings } from "./composables/useSiteSettings";

const { Layout } = DefaultTheme;
const route = useRoute();
const contentImageSelector = ".vp-doc img:not([data-no-zoom])";
let imageZoom;

const normalizePath = (p) => p.replace(/\/$/, "");
const runOnClientFrame = (cb) => {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(cb);
};

const expandCurrentSidebarGroup = () => {
  if (typeof window === "undefined") return;
  const currentPath = normalizePath(window.location.pathname);
  const groups = document.querySelectorAll(".VPSidebarItem.level-0.collapsible.is-link");

  groups.forEach((group) => {
    const link = group.querySelector(":scope > .item > a.VPLink");
    const caret = group.querySelector(":scope > .item > .caret");
    if (!(link instanceof HTMLAnchorElement) || !(caret instanceof HTMLElement)) return;

    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    if (linkPath === currentPath && group.classList.contains("collapsed")) {
      caret.click();
    }
  });
};

const setupImageZoom = () => {
  if (!imageZoom) return;
  imageZoom.detach();
  document.querySelectorAll(`${contentImageSelector}[data-esa-optimized]`).forEach((image) => {
    if (!(image instanceof HTMLImageElement)) return;
    const originalUrl = new URL(image.currentSrc || image.src, window.location.href);
    originalUrl.searchParams.delete("image_process");
    image.dataset.zoomSrc = originalUrl.href;
  });
  imageZoom.attach(contentImageSelector);
};

const refreshPageEnhancements = () => {
  expandCurrentSidebarGroup();
  setupImageZoom();
};

const onSectionTitleClick = (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const titleLink = target.closest(".VPSidebarItem.level-0.collapsible.is-link > .item > a.VPLink");
  if (!(titleLink instanceof HTMLAnchorElement)) return;

  const group = titleLink.closest(".VPSidebarItem.level-0.collapsible.is-link");
  const caret = group?.querySelector(":scope > .item > .caret");
  if (group?.classList.contains("collapsed") && caret instanceof HTMLElement) {
    caret.click();
  }
};

onMounted(() => {
  imageZoom = mediumZoom({ background: "transparent" });
  bootstrapSiteSettings();
  document.addEventListener("click", onSectionTitleClick, true);
  runOnClientFrame(refreshPageEnhancements);
});

onBeforeUnmount(() => {
  imageZoom?.detach();
  imageZoom = undefined;
  document.removeEventListener("click", onSectionTitleClick, true);
});

watch(
  () => route.path,
  async () => {
    await nextTick();
    runOnClientFrame(refreshPageEnhancements);
  },
  { immediate: true },
);
</script>

<template>
  <Layout>
    <!-- 面包屑 -->
    <template #doc-before>
      <Breadcrumb />
    </template>

    <!-- 评论区 -->
    <template #doc-after>
      <div class="cc-comments-region">
        <ClientOnly>
          <CCWaline />
        </ClientOnly>
      </div>
    </template>

    <!-- 浏览量 -->
    <template #aside-bottom>
      <ClientOnly>
        <CCPageviews />
      </ClientOnly>
      <div class="cc-contributors-region">
        <ClientOnly>
          <CCArticleContributors />
        </ClientOnly>
      </div>
    </template>

    <!-- 页脚信息 -->
    <template #doc-bottom>
      <CCFooter />
    </template>
  </Layout>
</template>
