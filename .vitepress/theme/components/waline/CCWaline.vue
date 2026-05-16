<script setup lang="ts">
import { Waline } from "@waline/client/component";
import { useData } from "vitepress";

import { useWalineBase } from "./useWalineBase";

const { isDark } = useData();
const { serverURL, path } = useWalineBase();
</script>

<template>
  <Waline
    :server-u-r-l="serverURL"
    :path="path"
    :dark="isDark"
    :meta="['nick', 'mail']"
    :no-rss="true"
    :locale="{
      placeholder: '可以在这边评论也可以反馈问题。如果反馈问题希望能留下昵称，方便在首页展示',
    }"
  />
</template>

<style scoped>
[data-waline] {
  --waline-theme-color: var(--vp-c-brand-1);
  --waline-active-color: var(--vp-c-brand-2);
  --waline-white: var(--vp-button-brand-text);
  --waline-color: var(--vp-c-text-1);
  --waline-dark-grey: var(--vp-c-text-1);
  --waline-info-bg-color: var(--vp-c-bg-soft);
  --waline-info-color: var(--vp-c-text-2);
  --waline-light-grey: var(--vp-c-text-2);
  --waline-border-color: var(--vp-c-divider);
  --waline-bg-color: transparent;
}

:deep(button) {
  --waline-theme-color: var(--vp-button-brand-bg);
  --waline-active-color: var(--vp-button-brand-hover-bg);
}

@media print {
  [data-waline] {
    display: none;
  }
}

:deep(.wl-comment) {
  align-items: flex-end;

  .wl-login-info {
    margin: 0.75em 0.75em;
  }

  .wl-panel {
    margin: 8px 0px;
    border-radius: 8px;

    .wl-header {
      border-bottom: 1px solid var(--waline-border-color);

      label,
      input {
        font-size: 12px;
      }
    }

    .wl-editor {
      padding: 0.75em;
    }

    .wl-footer {
      .wl-actions {
        a {
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }
    }
  }
}

:deep(.wl-cards) {
  .wl-card {
    border-bottom: 1px solid var(--waline-border-color);

    .wl-head {
      display: flex;
      align-items: center;
      justify-content: flex-start;

      .wl-badge {
        border-color: var(--vp-badge-tip-border);
        color: var(--vp-badge-tip-text);
        background-color: var(--vp-badge-tip-bg);
        white-space: nowrap;
        border-radius: 12px;
        padding: 0 8px;
        font-size: 10px;
        font-weight: 500;
        display: inline-block;
      }

      .wl-comment-actions {
        margin-left: auto;
        display: flex;
        gap: 0.5rem;
      }
    }

    .wl-quote {
      border: none;
    }
  }
}
</style>
