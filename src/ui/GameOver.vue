<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
const store = useGameStore()
const emit = defineEmits<{ restart: [] }>()
const mmss = computed(() => {
  const m = Math.floor(store.time / 60)
  const s = store.time % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
</script>

<template>
  <div class="overlay">
    <h1>你倒下了</h1>
    <p>存活時間 {{ mmss }}</p>
    <p>擊殺 {{ store.kills }} · 等級 {{ store.level }}</p>
    <button @click="emit('restart')">再玩一次</button>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
  background: rgba(16, 16, 24, 0.9); color: #fff; font-family: sans-serif; }
button { font-size: 1.3rem; padding: 0.5rem 1.5rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff; }
</style>
