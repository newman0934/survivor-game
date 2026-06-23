<script setup lang="ts">
/**
 * GameOver.vue — 結束畫面 overlay（phase === 'over' 時顯示）。
 * 讀 store 顯示最終存活時間 / 擊殺 / 等級；按下「再玩一次」向 App.vue 發出 restart 事件。
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
const store = useGameStore()
// 重新開始事件，無 payload；由 App.vue 監聽以重啟引擎。
const emit = defineEmits<{ restart: [] }>()
// 把存活秒數格式化為 m:ss（與 Hud 一致）。
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
