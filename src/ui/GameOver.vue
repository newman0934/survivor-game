<script setup lang="ts">
/**
 * GameOver.vue — 結束畫面 overlay（phase === 'over' 時顯示）。
 * 從 store 讀本場戰績；最佳存活與破紀錄旗標由 App.vue 以 props 傳入。
 * 「再玩一次」發出 restart（同角色/地圖快速重開）；「回主選單」發出 menu（重選角色/地圖）。
 */
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'

const props = defineProps<{
  /** 歷史最佳存活秒數（已含本場）。0 代表尚無紀錄。 */
  bestTime: number
  /** 本場是否刷新存活紀錄。 */
  isNewBestTime: boolean
  /** 本場是否刷新擊殺紀錄。 */
  isNewBestKills: boolean
}>()
const store = useGameStore()
// 把秒數格式化為 m:ss（與 Hud 一致）。
function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
const mmss = computed(() => fmt(store.time))
const bestText = computed(() => (props.bestTime > 0 ? fmt(props.bestTime) : '—'))
// restart：同角色/地圖快速重開；menu：回主選單重選。皆無 payload，由 App.vue 監聽。
const emit = defineEmits<{ restart: []; menu: [] }>()
</script>

<template>
  <Overlay>
    <Panel class="go-panel">
      <h1>你倒下了</h1>
      <p>存活時間 {{ mmss }}</p>
      <p>擊殺 {{ store.kills }} · 等級 {{ store.level }}</p>
      <p v-if="isNewBestTime" class="record">🏆 存活新紀錄！</p>
      <p v-if="isNewBestKills" class="record">🏆 擊殺新紀錄！</p>
      <p class="best">最佳存活：{{ bestText }}</p>
      <div class="actions">
        <button class="ui-btn ui-btn-primary" @click="emit('restart')">再玩一次</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('menu')">回主選單</button>
      </div>
    </Panel>
  </Overlay>
</template>

<style scoped>
.go-panel { gap: 1rem; animation: gopop 0.35s ease-out both; }
h1 { font-family: var(--font-display); }
@keyframes gopop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) { .go-panel { animation: none; } }
.actions { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; }
.actions .ui-btn { font-size: 1.3rem; padding: 0.5rem 1.5rem; }
.record { color: var(--antigen); font-weight: bold; margin: 0; animation: gopop 0.35s ease-out both; }
.best { opacity: 0.85; margin: 0; }
@media (prefers-reduced-motion: reduce) { .record { animation: none; } }
</style>
