import type { EditorAccountClient } from "vitepress-inline-editor/vue";

export const communityAccount: EditorAccountClient = {
  signIn(returnTo) {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "/api/account/login?" + new URLSearchParams({ returnTo });
    document.body.append(form);
    form.submit();
    form.remove();
  },
  async current() {
    const response = await fetch("/api/account/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error("暂时无法读取投稿身份");
    return response.json();
  },
  async setName(name) {
    const response = await fetch("/api/account/profile", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.status === 401) return; // The submission will reopen login with the saved draft.
    if (!response.ok) throw new Error("无法保存公开署名，请重试");
  },
};
