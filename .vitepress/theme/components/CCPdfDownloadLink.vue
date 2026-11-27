<script setup lang="ts">
import { VPButton } from "vitepress/theme";
import { onMounted, ref } from "vue";

import { PDF_LEGACY_URL } from "../../shared/site.ts";
import { latestPdfUrl } from "../utils/latestPdf";
import { trackUmamiEvent } from "../utils/umami";

defineProps<{
  source: string;
  hero?: boolean;
  fallback?: string;
}>();

const latestUrl = ref<string>();

onMounted(async () => {
  latestUrl.value = await latestPdfUrl();
});

async function download(event: MouseEvent, source: string) {
  trackUmamiEvent("pdf_download_all", { source });
  if (latestUrl.value || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  window.location.assign(await latestPdfUrl());
}
</script>

<template>
  <component
    :is="hero ? VPButton : 'a'"
    :tag="hero ? 'a' : undefined"
    :theme="hero ? 'alt' : undefined"
    :target="hero ? '_self' : undefined"
    :href="latestUrl ?? fallback ?? PDF_LEGACY_URL"
    @click="download($event, source)"
  >
    <slot />
  </component>
</template>
