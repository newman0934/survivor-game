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
    <h2 class="title">選擇升級</h2>
    <div class="cards">
      <!-- 逐一渲染引擎提供的升級選項；點擊送出該升級 id 並恢復遊戲 -->
      <button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
        :style="{ animationDelay: 0.06 * i + 's' }"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.5rem;
  background: rgba(18, 10, 14, 0.8); color: #fff; font-family: sans-serif; }
.cards { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; max-width: 92vw; }
.card { width: 160px; height: 120px; font-size: 1.2rem; cursor: pointer; padding: 0.4rem;
  border: 2px solid var(--immune-accent); border-radius: 12px; background: var(--card-bg); color: #fff; }
.card:hover { background: var(--card-bg-hover); border-color: var(--immune-accent-strong); }
.title { animation: rise 0.3s ease-out backwards; }
.card { animation: rise 0.35s ease-out backwards; }
.card:active { transform: scale(0.96); }
@keyframes rise {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .title, .card { animation: none; }
}

@media (max-width: 600px) {
  /* 手機版：選項改為垂直排列，卡片橫向拉寬、高度依內容。 */
  .cards { flex-direction: column; gap: 0.6rem; width: 80vw; }
  .card { width: 100%; height: auto; min-height: 56px; padding: 0.8rem; font-size: 1rem; }
}
</style>
