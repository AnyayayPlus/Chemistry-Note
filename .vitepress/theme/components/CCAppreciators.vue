<script setup lang="ts">
import CCAppreciatorsItem from "./CCAppreciatorsItem.vue";

interface Appreciator {
  amount: string;
  name: string;
  message: string;
  date: string;
}

defineProps<{
  items: Appreciator[];
}>();
</script>

<template>
  <div class="CCAppreciators">
    <div class="container">
      <div v-for="(item, index) in items.slice().reverse()" :key="index" class="item">
        <CCAppreciatorsItem :item="item" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.CCAppreciators {
  margin-top: 24px;
}

.container {
  display: grid;
  gap: 24px;
  margin: 0 auto;
  max-width: 1152px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
</style>
