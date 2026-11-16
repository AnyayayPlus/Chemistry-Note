<script setup lang="ts">
import { useData } from "vitepress";
import { computed, onMounted, ref, watch } from "vue";

import { getPageKind } from "../../shared/page.ts";
import { GITHUB_REPOSITORY } from "../../shared/site.ts";
import { useSiteSettings } from "../composables/useSiteSettings";

type GithubCommit = {
  author?: {
    login?: string;
    avatar_url?: string;
    html_url?: string;
  } | null;
  commit?: {
    author?: {
      name?: string;
    } | null;
  } | null;
};

type Contributor = {
  login: string;
  name: string;
  avatar: string;
  profile: string;
  commits: number;
};

const { page } = useData();
const contributors = ref<Contributor[]>([]);
const { settings } = useSiteSettings();
const compact = computed(() => settings.contributorsDisplay === "compact");
const visibleContributors = computed(() =>
  compact.value && contributors.value.length > 8
    ? contributors.value.slice(0, 7)
    : contributors.value,
);
const remainingCount = computed(() => contributors.value.length - visibleContributors.value.length);

const pagePath = computed(() => page.value.relativePath || "");
const isArticlePage = computed(() => getPageKind(pagePath.value) === "article");

async function loadContributors() {
  if (!isArticlePage.value) {
    contributors.value = [];
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPOSITORY}/commits?path=${encodeURIComponent(pagePath.value)}&per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!response.ok) {
      return;
    }

    const commits = (await response.json()) as GithubCommit[];
    const contributorMap = new Map<string, Contributor>();

    for (const entry of commits) {
      const login = entry.author?.login?.trim();
      const avatar = entry.author?.avatar_url?.trim();
      const profile = entry.author?.html_url?.trim();
      const name = entry.author?.login?.trim() || entry.commit?.author?.name?.trim();

      if (!login || !avatar || !profile || !name) continue;

      const existing = contributorMap.get(login);
      if (existing) {
        existing.commits += 1;
        continue;
      }

      contributorMap.set(login, {
        login,
        name,
        avatar,
        profile,
        commits: 1,
      });
    }

    contributors.value = [...contributorMap.values()].sort((a, b) => {
      if (b.commits !== a.commits) return b.commits - a.commits;
      return a.login.localeCompare(b.login);
    });
  } catch (error) {
    contributors.value = [];
    console.error("[CCArticleContributors] Failed to load contributors", error);
  }
}

onMounted(loadContributors);
watch(pagePath, loadContributors);
</script>

<template>
  <section v-if="isArticlePage && contributors.length" class="cc-article-contributors">
    <h2 class="cc-article-contributors__title">本文贡献者</h2>

    <div class="cc-article-contributors__list" :class="{ 'is-compact': compact }">
      <a
        v-for="contributor in visibleContributors"
        :key="contributor.login"
        class="cc-article-contributors__item"
        :href="contributor.profile"
        target="_blank"
        rel="noreferrer"
        :aria-label="`${contributor.name}，${contributor.commits} 次提交`"
        :title="`${contributor.name} · ${contributor.commits} 次提交`"
      >
        <img class="cc-article-contributors__avatar avatar-img" :src="contributor.avatar" alt="" />
        <div v-if="!compact" class="cc-article-contributors__info">
          <span class="cc-article-contributors__name">{{ contributor.name }}</span>
          <span class="cc-article-contributors__meta">{{ contributor.commits }} commits</span>
        </div>
      </a>
      <span
        v-if="compact && remainingCount"
        class="cc-article-contributors__remaining"
        :aria-label="`还有 ${remainingCount} 位贡献者，切换至详细显示可查看`"
        :title="`还有 ${remainingCount} 位贡献者，可在设置中切换至详细显示`"
        >+{{ remainingCount }}</span
      >
    </div>
  </section>
</template>

<style scoped>
.cc-article-contributors {
  margin-top: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
  animation: fade-slide-up 0.3s ease-out;
}

@keyframes fade-slide-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.cc-article-contributors__title {
  margin: 0 0 16px;
  font-size: 20px;
  line-height: 1.3;
}

.cc-article-contributors__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.cc-article-contributors__list.is-compact {
  grid-template-columns: repeat(4, 40px);
  gap: 8px;
}

.is-compact .cc-article-contributors__item {
  padding: 0;
  border: 0;
  border-radius: 50%;
}

.is-compact .cc-article-contributors__item:hover {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.cc-article-contributors__remaining {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

.cc-article-contributors__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  text-decoration: none;
  transition:
    border-color 0.1s ease,
    background-color 0.1s ease;
}

.cc-article-contributors__item:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-default-soft);
}

.cc-article-contributors__avatar {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 999px;
  object-fit: cover;
}

.cc-article-contributors__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cc-article-contributors__name {
  color: var(--vp-c-text-1);
  font-weight: 600;
  line-height: 1.2;
}

.cc-article-contributors__meta {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

@media (max-width: 640px) {
  .cc-article-contributors__list {
    grid-template-columns: 1fr;
  }
}
</style>
