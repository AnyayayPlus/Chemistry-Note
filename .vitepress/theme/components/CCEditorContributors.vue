<script setup lang="ts">
import type { EditorContributor } from "../composables/useEditorContributors";
defineProps<{ items: EditorContributor[]; detailed?: boolean }>();
</script>

<template>
  <section v-if="items.length" class="cc-editor-credits" aria-label="外部贡献者">
    <h2>外部贡献者</h2>
    <ul>
      <li v-for="item in items" :key="item.id" :title="item.contributions + ' 次投稿已合并'">
        {{ item.name }}<small v-if="detailed"> · {{ item.contributions }} 次投稿</small>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.cc-editor-credits {
  margin-block: 1.5rem;
}
.cc-editor-credits h2 {
  font-weight: 600;
  margin-bottom: 0.65rem;
}
.cc-editor-credits ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
}
.cc-editor-credits li {
  margin: 0;
  padding: 0.2rem 0.6rem;
  border-radius: 0.4rem;
  background: var(--vp-c-bg-soft);
  overflow-wrap: anywhere;
}
.cc-editor-credits small {
  color: var(--vp-c-text-2);
}
</style>
