<script setup lang="ts">
interface Feedbacker {
  name: string;
  email?: string;
}

defineProps<{
  items: Feedbacker[];
}>();
</script>

<template>
  <div class="CCFeedbackers">
    <div
      v-for="item in items"
      :key="item.name"
      :title="item.email || undefined"
      class="CCFeedbackersItem"
    >
      {{ item.name }}
    </div>
  </div>
</template>

<style scoped>
.CCFeedbackers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.CCFeedbackersItem {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  transition:
    border-color 0.25s,
    background-color 0.25s;
  white-space: nowrap;
}

.CCFeedbackersItem:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft-hover);
}
</style>
