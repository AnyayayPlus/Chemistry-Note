import type { Theme } from "vitepress";

import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, watch, onMounted, onUnmounted } from "vue";

import "./custom.css";
import "./style.css";
import "@waline/client/style";

import CCChapterOverview from "./components/CCChapterOverview.vue";
import CCpdfDownloadButton from "./components/CCpdfDownloadButton.vue";
import layout from "./layout.vue";

const theme: Theme = {
  extends: DefaultTheme,
  Layout: layout,

  setup() {
    const route = useRoute();
    let mask: HTMLDivElement | null = null;

    // 封装esc事件，加上onUnmounted销毁监听
    function escHandler(ev: KeyboardEvent) {
      if (ev.key === "Escape" && mask) {
        mask.remove();
        mask = null;
      }
    }

    function openPreview(src: string) {
      if (mask) return;

      mask = document.createElement("div");
      mask.id = "img-preview-mask";
      mask.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.85);
        z-index: 9999; display: flex; align-items: center;
        justify-content: center; cursor: zoom-out;
      `;

      const previewImg = document.createElement("img");
      previewImg.src = src;
      previewImg.style.cssText = `
        max-width: 90vw; max-height: 90vh; object-fit: contain;
      `;
      mask.appendChild(previewImg);
      document.body.appendChild(mask);

      mask.onclick = () => {
        mask?.remove();
        mask = null;
      };
      document.addEventListener("keydown", escHandler);
    }

    function bindPreview() {
      const main = document.querySelector<HTMLElement>(".main");
      if (!main) return;

      main.onclick = (e: MouseEvent) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const imgEl = target.closest("img");
        if (!imgEl) return;

        e.preventDefault();
        e.stopPropagation();
        openPreview(imgEl.src);
      };
    }

    onMounted(bindPreview);
    // 路由切换先移除旧的esc监听，防止堆积
    watch(
      () => route.path,
      async () => {
        await nextTick();
        bindPreview();
      },
    );

    // 组件销毁，清理键盘监听，避免内存泄漏 + TS类型报错
    onUnmounted(() => {
      document.removeEventListener("keydown", escHandler);
      if (mask) {
        mask.remove();
        mask = null;
      }
    });
  },

  enhanceApp({ app }) {
    app.component("CCpdfDownloadButton", CCpdfDownloadButton);
    app.component("CCChapterOverview", CCChapterOverview);
  },
};

export default theme;
