import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, watch, onMounted } from "vue";

import "./custom.css";
import "./style.css";
import "@waline/client/style";

import CCChapterOverview from "./components/CCChapterOverview.vue";
import CCpdfDownloadButton from "./components/CCpdfDownloadButton.vue";
import layout from "./layout.vue";

export default {
  extends: DefaultTheme,
  Layout: layout,
  setup() {
    const route = useRoute();
    let mask = null;

    function openPreview(src) {
      if (mask) return;
      mask = document.createElement("div");
      mask.id = "img-preview-mask";
      mask.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.85);
        z-index:9999; display:flex; align-items:center; justify-content:center;
        cursor:zoom-out;
      `;
      const previewImg = document.createElement("img");
      previewImg.src = src;
      previewImg.style.cssText = `
        max-width:90vw; max-height:90vh; object-fit:contain;
      `;
      mask.appendChild(previewImg);
      document.body.appendChild(mask);

      // 点击遮罩关闭
      mask.onclick = () => {
        mask.remove();
        mask = null;
      };
      // ESC关闭
      function escHandler(ev) {
        if (ev.key === "Escape" && mask) {
          mask.remove();
          mask = null;
          document.removeEventListener("keydown", escHandler);
        }
      }
      document.addEventListener("keydown", escHandler);
    }

    function bindPreview() {
      const main = document.querySelector(".main");
      if (!main) return;
      // 先移除旧监听，防止重复
      main.onclick = null;
      // 事件委托：监听main容器，判断点击目标是不是图片
      main.onclick = function (e) {
        const img = e.target.closest("img");
        if (img) {
          e.preventDefault();
          e.stopPropagation();
          openPreview(img.src);
        }
      };
    }

    onMounted(() => {
      bindPreview();
    });

    watch(
      () => route.path,
      async () => {
        await nextTick();
        bindPreview();
      },
    );
  },
  enhanceApp({ app }) {
    app.component("CCpdfDownloadButton", CCpdfDownloadButton);
    app.component("CCChapterOverview", CCChapterOverview);
  },
};
