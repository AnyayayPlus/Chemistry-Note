import { onMounted, shallowRef, watch, type Ref } from "vue";

import { COMMUNITY_API } from "./useCommunity";

export interface EditorContributor {
  id: number;
  name: string;
  contributions: number;
}

// null requests the homepage list. An undefined path skips utility and hidden pages.
export function useEditorContributors(path: Readonly<Ref<string | null | undefined>>) {
  const contributors = shallowRef<EditorContributor[]>([]);
  onMounted(() =>
    watch(
      path,
      async (file, _, onCleanup) => {
        contributors.value = [];
        if (file === undefined) return;
        const controller = new AbortController();
        onCleanup(() => controller.abort());
        try {
          const url = new URL(
            import.meta.env.VITE_EDITOR_CONTRIBUTORS_API || COMMUNITY_API + "/editor-contributors",
            window.location.origin,
          );
          if (file !== null) url.searchParams.set("path", file);
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) return;
          const { contributors: rows } = await response.json();
          if (!controller.signal.aborted && Array.isArray(rows)) {
            contributors.value = rows.filter(
              (row) =>
                row &&
                Number.isSafeInteger(row.id) &&
                typeof row.name === "string" &&
                Number.isSafeInteger(row.contributions) &&
                row.contributions > 0,
            );
          }
        } catch {
          /* Keep the article readable if the community service is offline. */
        }
      },
      { immediate: true, flush: "sync" },
    ),
  );
  return contributors;
}
