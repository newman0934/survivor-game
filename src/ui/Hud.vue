<script setup lang="ts">
/**
 * Hud.vue — 遊戲中抬頭顯示（等級 / 時間 / 擊殺數 + 血條 / 經驗條）。
 * 純讀取元件：只從 store 讀 summary 數值並衍生顯示值，不送出任何事件、不碰引擎。
 */
import { computed, ref, watch } from 'vue'
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
// 升級彈跳：偵測等級上升沿，重觸發一次縮放動畫。
const levelPop = ref(false)
watch(() => store.level, (n, o) => {
  if (n > o) {
    levelPop.value = false
    requestAnimationFrame(() => { levelPop.value = true })
  }
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
    <div class="topbar">
      <span class="lv" :class="{ pop: levelPop }" @animationend="levelPop = false">Lv {{ store.level }}</span>
      <span class="time">{{ mmss }}</span>
      <span>擊殺 {{ store.kills }}</span>
    </div>
    <div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /></div>
    <div class="bar hp" :class="{ hurt }" @animationend="hurt = false"><div class="fill" :style="{ width: hpPct + '%' }" /></div>
  </div>
</template>

<style scoped>
.hud { position: absolute; inset: 0; pointer-events: none; color: #fff;
  font-family: sans-serif; display: flex; flex-direction: column; }
.topbar { display: flex; justify-content: space-between; padding: 0.5rem 1rem;
  /* 右側預留靜音鈕（2.4rem + 右距 0.5rem）空間，避免蓋住「擊殺」 */
  padding-right: 3.4rem;
  font-size: 1.1rem; text-shadow: 0 1px 2px #000; }
.time { font-size: 1.4rem; font-weight: bold; }
.bar { height: 8px; margin: 2px 1rem; background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
.bar.xp { order: 3; margin-top: auto; }
.bar.hp { order: 4; margin-bottom: 0.6rem; height: 12px; }
.xp .fill { background: #6bff6b; height: 100%; border-radius: 4px; }
.hp .fill { background: #ff5252; height: 100%; border-radius: 4px; }
.bar .fill { transition: width 0.25s ease-out; }
.lv.pop { display: inline-block; animation: levelpop 0.4s ease-out; }
@keyframes levelpop {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); filter: drop-shadow(0 0 6px #ffd54a); }
  100% { transform: scale(1); }
}
.bar.hp.hurt { animation: hurtflash 0.3s ease-out; }
@keyframes hurtflash {
  0% { box-shadow: 0 0 0 0 rgba(255, 40, 40, 0); }
  30% { box-shadow: 0 0 10px 3px rgba(255, 40, 40, 0.8); }
  100% { box-shadow: 0 0 0 0 rgba(255, 40, 40, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .bar .fill { transition: none; }
  .lv.pop { animation: none; }
  .bar.hp.hurt { animation: none; }
}
</style>
