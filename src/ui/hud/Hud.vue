<script setup lang="ts">
/**
 * Hud.vue — 遊戲中抬頭顯示（等級 / 時間 / 擊殺數 + 血條 / 經驗條）。
 * 純讀取元件：只從 store 讀 summary 數值並衍生顯示值，不送出任何事件、不碰引擎。
 */
import { computed, ref, watch } from 'vue'
import { useGameStore } from '../../stores/game'
import PlayerAvatar from './PlayerAvatar.vue'
import LoadoutBar from './LoadoutBar.vue'

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
// 受傷紅閃：偵測血量下降，重觸發一次閃動。
const hurt = ref(false)
watch(() => store.hp, (n, o) => {
  if (n < o) {
    hurt.value = false
    requestAnimationFrame(() => { hurt.value = true })
  }
})
</script>

<template>
  <div class="hud">
    <PlayerAvatar />
    <div v-if="store.eventWarning" class="event-warning">{{ store.eventWarning }}</div>
    <div class="topbar">
      <span class="time">{{ mmss }}</span>
      <span class="kills">擊殺 {{ store.kills }}</span>
    </div>
    <LoadoutBar />
    <div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /><span class="readout">XP {{ Math.floor(xpPct) }}%</span></div>
    <div class="bar hp" :class="{ hurt }" @animationend="hurt = false"><div class="fill" :style="{ width: hpPct + '%' }" /><span class="readout">{{ Math.ceil(store.hp) }} / {{ store.maxHp }}</span></div>
  </div>
</template>

<style scoped>
.hud { position: absolute; inset: 0; pointer-events: none; color: #fff;
  font-family: sans-serif; display: flex; flex-direction: column; }
.topbar { display: flex; justify-content: center; padding: 0.5rem 1rem; position: relative;
  font-size: 1.1rem; text-shadow: 0 1px 2px #000; }
.time { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; }
/* 擊殺絕對定位右上、避開靜音鈕（2.4rem + 右距 0.5rem） */
/* right 需清過靜音鈕 + 暫停鈕兩顆（各 2.4rem + 間距） */
.kills { position: absolute; right: 6.3rem; top: 0.6rem; font-family: var(--font-display); }
.bar { position: relative; margin: 3px 1rem; border-radius: 6px; overflow: hidden;
  background: rgba(0, 0, 0, 0.45); box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
  /* 分段刻度：每約 10% 一道細分隔 */
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), rgba(0, 0, 0, 0.5) calc(10% - 1px), rgba(0, 0, 0, 0.5) 10%); }
.bar.xp { order: 3; margin-top: auto; height: 12px; }
.bar.hp { order: 4; margin-bottom: 0.6rem; height: 18px; }
.bar .fill { height: 100%; border-radius: 6px; transition: width 0.25s ease-out;
  /* 頂部光澤 */
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 55%); }
.xp .fill { background-color: var(--antigen); box-shadow: 0 0 8px rgba(255, 213, 74, 0.5); }
.hp .fill { background-color: #ff5252; box-shadow: 0 0 8px rgba(255, 82, 82, 0.5); }
.readout { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 0.72rem; font-weight: 700; color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9); letter-spacing: 0.03em; }
.bar.hp.hurt { animation: hurtflash 0.3s ease-out; }
@keyframes hurtflash {
  0% { box-shadow: 0 0 0 0 rgba(255, 40, 40, 0); }
  30% { box-shadow: 0 0 10px 3px rgba(255, 40, 40, 0.8); }
  100% { box-shadow: 0 0 0 0 rgba(255, 40, 40, 0); }
}
.event-warning {
  position: absolute;
  /* 移到 Boss 血條（top:3rem，約佔 3~4.6rem）下方，避免被血條蓋住。 */
  top: 6rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.3rem 1rem;
  font-family: var(--font-display, sans-serif);
  letter-spacing: 0.08em;
  color: #ffd54a;
  background: rgba(20, 6, 6, 0.6);
  border: 1px solid rgba(255, 213, 74, 0.6);
  border-radius: 6px;
  pointer-events: none;
  animation: warn-pulse 0.8s ease-in-out infinite alternate;
}
@keyframes warn-pulse { from { opacity: 0.6; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .bar .fill { transition: none; }
  .bar.hp.hurt { animation: none; }
  .event-warning { animation: none; }
}
</style>
