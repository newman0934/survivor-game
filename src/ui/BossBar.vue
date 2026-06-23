<script setup lang="ts">
/**
 * BossBar.vue — Boss 血條（純讀取元件）。
 * Boss 存在時於畫面頂部顯示一條紫色血條，寬度隨剩餘 hp 變化；不存在時隱藏。
 * 只從 store 讀 summary 資料，不送事件、不碰引擎。
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
// Boss 血量百分比；bossMaxHp 為 0 時回 0 以避免除以零。
const pct = computed(() => (store.bossMaxHp ? (store.bossHp / store.bossMaxHp) * 100 : 0))
</script>

<template>
  <Transition name="boss">
    <div v-if="store.bossActive" class="bossbar">
      <div class="label">BOSS</div>
      <div class="bar"><div class="fill" :class="{ low: pct < 25 }" :style="{ width: pct + '%' }" /></div>
    </div>
  </Transition>
</template>

<style scoped>
.bossbar { position: absolute; top: 3rem; left: 50%; transform: translateX(-50%);
  width: min(80%, 640px); pointer-events: none; color: #fff; font-family: sans-serif;
  text-align: center; }
.label { font-size: 0.9rem; font-weight: bold; letter-spacing: 0.2em;
  text-shadow: 0 1px 2px #000; margin-bottom: 2px; }
.bar { height: 14px; background: rgba(255, 255, 255, 0.15); border-radius: 7px; overflow: hidden; }
.fill { background: #9c27b0; height: 100%; border-radius: 7px; transition: width 0.1s linear; }
.boss-enter-active, .boss-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.boss-enter-from, .boss-leave-to { opacity: 0; transform: translate(-50%, -12px); }
.fill.low { animation: bosslow 0.6s ease-in-out infinite; }
@keyframes bosslow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(229, 115, 246, 0); }
  50% { box-shadow: 0 0 10px 2px rgba(229, 115, 246, 0.9); }
}
@media (prefers-reduced-motion: reduce) {
  .boss-enter-active, .boss-leave-active { transition: none; }
  .fill.low { animation: none; }
}
</style>
