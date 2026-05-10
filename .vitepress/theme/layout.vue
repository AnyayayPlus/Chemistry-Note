<script setup>
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, onMounted, onBeforeUnmount, watch } from "vue";

import CCArticleContributors from "./components/CCArticleContributors.vue";
import Breadcrumb from "./components/CCBreadCrumb.vue";
import CCFooter from "./components/CCFooter.vue";
import PdfDownloadButton from "./components/CCPdfDownloadButton.vue";
import { CCPageviews, CCWaline } from "./components/waline";

const { Layout } = DefaultTheme;
const route = useRoute();

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
  document.addEventListener("click", onSectionTitleClick, true);
  runOnClientFrame(expandCurrentSidebarGroup);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onSectionTitleClick, true);
});

watch(
  () => route.path,
  async () => {
    await nextTick();
    runOnClientFrame(expandCurrentSidebarGroup);
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
      <ClientOnly>
        <CCWaline />
      </ClientOnly>
    </template>

    <!-- 浏览量 -->
    <template #aside-bottom>
      <ClientOnly>
        <CCPageviews />
      </ClientOnly>
      <ClientOnly>
        <CCArticleContributors />
      </ClientOnly>
    </template>

    <!-- 页脚信息 -->
    <template #doc-bottom>
      <CCFooter />
    </template>
  </Layout>
</template>
