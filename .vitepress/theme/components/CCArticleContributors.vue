<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";

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

const pagePath = computed(() => page.value.relativePath || "");
const isArticlePage = computed(() => {
  const relativePath = pagePath.value;
  if (!relativePath) return false;
  if (relativePath === "index.md" || relativePath === "README.md") return false;
  if (relativePath.startsWith("hidePage/")) return false;
  if (relativePath.endsWith("/index.md")) return false;
  return relativePath.endsWith(".md");
});

async function loadContributors() {
  if (!isArticlePage.value) {
    contributors.value = [];
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/Seeridia/Chemistry-Note/commits?path=${encodeURIComponent(pagePath.value)}&per_page=100`,
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

    <div class="cc-article-contributors__list">
      <a
        v-for="contributor in contributors"
        :key="contributor.login"
        class="cc-article-contributors__item"
        :href="contributor.profile"
        target="_blank"
        rel="noreferrer"
      >
        <img
          class="cc-article-contributors__avatar"
          :src="contributor.avatar"
          :alt="`&keep-color ${contributor.name}`"
        />
        <div class="cc-article-contributors__info">
          <span class="cc-article-contributors__name">{{ contributor.name }}</span>
          <span class="cc-article-contributors__meta">{{ contributor.commits }} commits</span>
        </div>
      </a>
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
