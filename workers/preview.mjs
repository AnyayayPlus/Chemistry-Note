import { serveEditorPreview } from "vitepress-inline-editor/preview";

export default {
  fetch(request, env) {
    return serveEditorPreview(request, env.ASSETS);
  },
};
