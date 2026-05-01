<template>
  <div class="share-panel">
    <noscript>需要启用 JavaScript 才能使用分享功能。</noscript>
    <QRCodeVue
      :value="link"
      :size="120"
      render-as="svg"
      level="L"
      background="transparent"
      :foreground="foreground"
    />
    <button class="copylink" @click="copyLink">
      复制链接
      <span class="copy-indicator-wrapper" :class="expand ? 'expanded' : 'folded'">
        <svg class="copy-indicator" viewBox="0 0 24 24" width="18" height="18">
          <path
            fill="currentColor"
            d="M9 18.25a.74.74 0 0 1-.53-.25l-5-5a.75.75 0 1 1 1.06-1L9 16.44L19.47 6a.75.75 0 0 1 1.06 1l-11 11a.74.74 0 0 1-.53.25"
          />
        </svg>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import QRCodeVue from "qrcode.vue";
import md5 from "blueimp-md5";
import { computed, onMounted, ref } from "vue";
import { useData } from "vitepress";
import { trackUmamiEvent } from "../../utils/umami";

const { page, isDark } = useData();
const origin = ref("");
const expand = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const foreground = computed(() => (isDark.value ? "#D3D3CC" : "#3C3C43"));

const link = computed(() => {
  const filePath = page.value.filePath ?? "";
  const normalizedPath = filePath.replace(/(index)?\.md$/, "");
  const encodedPath = encodeURI(normalizedPath);
  const baseUrl = origin.value;

  if (!baseUrl) return "";
  if (encodedPath.length < 10) return `${baseUrl}/${encodedPath}`;

  // Must match the short-link jump page route.
  return `${baseUrl}/s?q=${md5(normalizedPath).slice(0, 10)}`;
});

function copyLink() {
  if (!link.value || !navigator.clipboard) return;
  navigator.clipboard.writeText(link.value).then(() => {
    trackUmamiEvent("share_copy_link", {
      page_path: page.value.relativePath || page.value.filePath || "",
      page_title: page.value.title || "",
      is_short_link: link.value.includes("/s?q="),
    });
    expand.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      expand.value = false;
      timer = null;
    }, 1500);
  });
}

onMounted(() => {
  origin.value = window.location.origin;
});
</script>

<style>
.share-panel > svg {
  border-radius: 3px;
  margin: 0 auto;
  margin-bottom: 15px;
}

.share-panel .copy-indicator {
  display: inline-block;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 18px;
  color: var(--vp-c-green-1);
}

.share-panel .copy-indicator-wrapper {
  display: inline-block;
  overflow: hidden;
  vertical-align: middle;
  height: 18px;
  width: 18px;
  margin-bottom: 2px;
  position: relative;
  transition: max-width 0.3s cubic-bezier(0, 0.5, 0.5, 1);
}

.share-panel .copy-indicator-wrapper.folded {
  max-width: 0;
  transform: translateX(3px);
}

.share-panel .copy-indicator-wrapper.expanded {
  max-width: 18px;
  margin-left: 3px;
}

@media only screen and (min-width: 768px) {
  .share-panel {
    padding: 6px;
    height: 170px;
  }
  .share-panel .copylink {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 40px;

    color: var(--vp-c-text-1);
    background: #75798e10;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    border-top: var(--vp-c-divider) 1px solid;

    transition: background 0.2s;
  }
  .share-panel .copylink:hover {
    background: #c2c7e614;
  }
  .share-panel .copylink:active {
    background: #30323a10;
    transition: background 0.05s;
  }
}

@media only screen and (max-width: 768px) {
  .share-panel {
    margin-top: 10px;
  }
  .share-panel .copylink {
    display: inline-flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 12px;
    background: var(--vp-c-bg-alt);
    color: var(--vp-c-text-1);
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    transition:
      border-color 0.25s,
      background-color 0.25s,
      color 0.25s;
  }

  .share-panel .copylink:hover {
    border-color: var(--vp-c-brand-1);
    background: var(--vp-c-bg-soft-hover);
    color: var(--vp-c-text-1);
  }
}
</style>
