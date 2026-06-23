<script setup lang="ts">
/**
 * Hud.vue — 遊戲中抬頭顯示（等級 / 時間 / 擊殺數 + 血條 / 經驗條）。
 * 純讀取元件：只從 store 讀 summary 數值並衍生顯示值，不送出任何事件、不碰引擎。
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
// 血量百分比；maxHp 為 0（尚未初始化）時回傳 0 以避免除以零。
const hpPct = computed(() => (store.maxHp ? (store.hp / store.maxHp) * 100 : 0))
// 經驗百分比；同樣對 xpNeeded 為 0 做保護。
const xpPct = computed(() => (store.xpNeeded ? (store.xp / store.xpNeeded) * 100 : 0))
// 把存活秒數格式化為 m:ss。
const mmss = computed(() => {
  const m = Math.floor(store.time / 60)
  const s = store.time % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
</script>

<template>
  <div class="hud">
    <div class="topbar">
      <span>Lv {{ store.level }}</span>
      <span class="time">{{ mmss }}</span>
      <span>擊殺 {{ store.kills }}</span>
    </div>
    <div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /></div>
    <div class="bar hp"><div class="fill" :style="{ width: hpPct + '%' }" /></div>
  </div>
</template>

<style scoped>
.hud { position: absolute; inset: 0; pointer-events: none; color: #fff;
  font-family: sans-serif; display: flex; flex-direction: column; }
.topbar { display: flex; justify-content: space-between; padding: 0.5rem 1rem;
  font-size: 1.1rem; text-shadow: 0 1px 2px #000; }
.time { font-size: 1.4rem; font-weight: bold; }
.bar { height: 8px; margin: 2px 1rem; background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
.bar.xp { order: 3; margin-top: auto; }
.bar.hp { order: 4; margin-bottom: 0.6rem; height: 12px; }
.xp .fill { background: #6bff6b; height: 100%; border-radius: 4px; }
.hp .fill { background: #ff5252; height: 100%; border-radius: 4px; }
</style>
