<script setup lang="ts">
/**
 * UpgradeModal.vue — 升級三選一彈窗（phase === 'upgrading' 時顯示）。
 * 讀 store.upgradeOptions 渲染卡片；點選時呼叫 store.pickUpgrade(id)，
 * 即升級握手的第二步——觸發引擎 callback 並讓遊戲恢復進行。
 */
import { useGameStore } from '../stores/game'
const store = useGameStore()
</script>

<template>
  <div class="overlay">
    <h2>選擇升級</h2>
    <div class="cards">
      <!-- 逐一渲染引擎提供的升級選項；點擊送出該升級 id 並恢復遊戲 -->
      <button v-for="opt in store.upgradeOptions" :key="opt.id" class="card"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.5rem;
  background: rgba(16, 16, 24, 0.8); color: #fff; font-family: sans-serif; }
.cards { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; max-width: 92vw; }
.card { width: 160px; height: 120px; font-size: 1.2rem; cursor: pointer; padding: 0.4rem;
  border: 2px solid #4aa3ff; border-radius: 12px; background: #1c2030; color: #fff; }
.card:hover { background: #283050; }

@media (max-width: 600px) {
  .cards { gap: 0.6rem; }
  .card { width: 28vw; height: 96px; font-size: 0.95rem; }
}
</style>
