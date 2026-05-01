<script setup>
import { pageviewCount } from "@waline/client";
import { onBeforeUnmount, onMounted, watch } from "vue";
import { useWalineBase } from "./useWalineBase";

const { serverURL, route } = useWalineBase();
let abortPageview = null;

const runPageview = (path) => {
  if (abortPageview) abortPageview();
  abortPageview = pageviewCount({ serverURL, path });
};

onMounted(() => {
  runPageview(route.path);
});

watch(
  () => route.path,
  (path) => {
    if (typeof window === "undefined") return;
    runPageview(path);
  },
);

onBeforeUnmount(() => {
  if (abortPageview) abortPageview();
});
</script>

<template>
  <span class="waline-pageview"> <span class="waline-pageview-count"></span> views </span>
</template>

<style scoped>
.waline-pageview {
  display: inline-flex;
  gap: 0.25em;
  align-items: baseline;
  white-space: nowrap;
  font-size: 14px;
}
</style>
