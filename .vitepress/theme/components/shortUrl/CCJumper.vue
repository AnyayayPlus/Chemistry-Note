<!-- 参考自 https://notes.linho.cc/s?q=adaf352048 -->

<script setup lang="ts">
import axios from "axios";
import { onMounted } from "vue";
import { useRouter } from "vitepress";
const router = useRouter();
onMounted(() => {
  const id = window.location.search.match(/\?q=(.{10})$/)?.[1];
  if (!id) return router.go(`/404`);
  axios.get("/shortmap.json").then(
    (res) =>
      res.data[id] !== undefined ? router.go(`/${encodeURI(res.data[id])}`) : router.go(`/404`),
    () => router.go(`/404`),
  );
});
</script>
