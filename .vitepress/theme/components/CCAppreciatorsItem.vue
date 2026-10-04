<script setup lang="ts">
interface Appreciator {
  amount: string;
  name: string;
  message: string;
  date: string;
}

defineProps<{
  item: Appreciator;
}>();
</script>

<template>
  <div class="CCAppreciatorsItem">
    <div class="header">
      <h1 class="name">{{ item.name }}</h1>
      <span class="amount">{{ item.amount }}</span>
    </div>
    <p class="message">{{ item.message }}</p>
    <p class="date">{{ item.date }}</p>
  </div>
</template>

<style scoped>
.CCAppreciatorsItem {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 8px;
  width: 100%;
  height: 100%;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  transition:
    border-color 0.25s,
    background-color 0.25s;
}

.CCAppreciatorsItem:hover {
  border-color: var(--vp-c-brand-1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-text-1);
  line-height: normal;
}

.amount {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-alt);
  padding: 2px 8px;
  border-radius: 12px;
}

.message {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  flex-grow: 1;
}

.date {
  margin: 10px 0 0 0;
  font-size: 11px;
  color: var(--vp-c-text-3);
  text-align: right;
}
</style>
