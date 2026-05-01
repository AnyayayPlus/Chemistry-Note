<script setup lang="ts">
import { computed } from "vue";
import { useData, useRoute } from "vitepress";
import type { DefaultTheme } from "vitepress";

type SidebarItem = DefaultTheme.SidebarItem;
type ChapterLinkItem = {
  text: string;
  link: string;
};

const { theme } = useData();
const route = useRoute();

const normalizePath = (value: string): string => {
  const decoded = decodeURI(value || "");
  const noHash = decoded.split("#")[0];
  const noQuery = noHash.split("?")[0];
  const noHtml = noQuery.replace(/\.html$/, "");
  return noHtml.endsWith("/") && noHtml !== "/" ? noHtml.slice(0, -1) : noHtml;
};

const getSectionKey = (value: string): string => {
  const segments = normalizePath(value).split("/").filter(Boolean);
  return segments[0] || "";
};

const currentSectionKey = computed(() => getSectionKey(route.path));

const rootSidebar = computed<SidebarItem[]>(() => {
  const sidebar = theme.value.sidebar;
  if (!sidebar || Array.isArray(sidebar)) return [];
  const root = sidebar["/"];
  return Array.isArray(root) ? root : [];
});

const currentChapter = computed<SidebarItem | undefined>(() => {
  const key = currentSectionKey.value;
  if (!key) return undefined;
  return rootSidebar.value.find((item) => getSectionKey(item.link || "") === key);
});

const chapterItems = computed<SidebarItem[]>(() => {
  return currentChapter.value?.items || [];
});

const toChapterLinkItem = (item: SidebarItem): ChapterLinkItem => ({
  text: item.text ?? "",
  link: item.link ?? "#",
});

const chapterLinkItems = computed<ChapterLinkItem[]>(() => {
  return chapterItems.value.map(toChapterLinkItem).filter((item) => item.text && item.link !== "#");
});

const isTopic = (item: ChapterLinkItem): boolean => item.text.startsWith("考点 ");

const mainItems = computed(() => chapterLinkItems.value.filter((item) => !isTopic(item)));
const topicItems = computed(() => chapterLinkItems.value.filter((item) => isTopic(item)));
</script>

<template>
  <section class="cc-chapter-overview">
    <template v-if="currentChapter">
      <div v-if="mainItems.length" class="card-grid">
        <a v-for="item in mainItems" :key="item.link" :href="item.link" class="chapter-card">
          <span class="card-title">{{ item.text }}</span>
          <span class="card-arrow">→</span>
        </a>
      </div>

      <template v-if="topicItems.length">
        <h3 class="section-title">考点专题</h3>
        <div class="card-grid topics">
          <a
            v-for="item in topicItems"
            :key="item.link"
            :href="item.link"
            class="chapter-card topic-card"
          >
            <span class="card-title">{{ item.text }}</span>
            <span class="card-arrow">→</span>
          </a>
        </div>
      </template>
    </template>

    <p v-else class="empty-state">未找到当前章节配置，请检查侧边栏生成规则。</p>
  </section>
</template>

<style scoped>
.cc-chapter-overview {
  margin: 1.25rem 0;
  padding: 1rem 1.125rem 1.125rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.section-title {
  margin: 1rem 0 0.55rem;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.chapter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 48px;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background-color 0.2s ease;
}

.chapter-card:hover {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 7%, var(--vp-c-bg));
}

.card-title {
  font-size: 0.92rem;
  line-height: 1.45;
}

.card-arrow {
  flex-shrink: 0;
  color: var(--vp-c-brand-1);
}

.topic-card {
  background: color-mix(in srgb, var(--vp-c-bg-soft) 78%, var(--vp-c-bg));
}

.empty-state {
  margin: 0;
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
