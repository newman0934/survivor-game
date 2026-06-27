<script setup lang="ts">
/**
 * MainMenu.vue — 主選單 overlay（phase === 'menu' 時顯示）。
 * 顯示角色與地圖選擇卡，按開始時向 App.vue 發出 start 事件並帶 { character, map }。
 */
import { ref } from 'vue'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../../engine/systems/characterDefs'
import { MAP_ORDER, MAP_DEFS } from '../../engine/systems/mapDefs'
import type { CharacterKind, MapKind } from '../../engine/types'
import type { CumulativeStats } from '../../persistence/saveStore'
import { useGameStore } from '../../stores/game'
import Overlay from '../common/Overlay.vue'
import Panel from '../common/Panel.vue'

const store = useGameStore()

defineProps<{
  /** 跨場累積統計（由 App.vue loadSave 後傳入）。 */
  stats: CumulativeStats
}>()

const emit = defineEmits<{
  start: [opts: { character: CharacterKind; map: MapKind }]
  'open-leaderboard': []
  multiplayer: []
}>()
const character = ref<CharacterKind>('macrophage')
const map = ref<MapKind>('vessel')

/** 把顏色數字轉成 CSS hex 字串。 */
function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}

/** 把秒數格式化為 m:ss；0 顯示「—」。 */
function fmtBest(sec: number): string {
  if (sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <Overlay>
    <div v-if="store.notice" class="notice-banner" @click="store.clearNotice()">
      {{ store.notice }}（點擊關閉）
    </div>
    <Panel class="menu-panel">
      <h1>Survivor</h1>

      <div class="stats" v-if="stats.totalRuns > 0">
        <span>總擊殺 <b>{{ stats.totalKills }}</b></span>
        <span>場數 <b>{{ stats.totalRuns }}</b></span>
        <span>最佳存活 <b>{{ fmtBest(stats.bestTime) }}</b></span>
        <span>最高等級 <b>{{ stats.maxLevel }}</b></span>
      </div>

      <div class="section-label">角色</div>
      <div class="row">
        <button
          v-for="kind in CHARACTER_ORDER"
          :key="kind"
          class="card"
          :class="{ active: character === kind }"
          :style="character === kind ? { borderColor: css(CHARACTER_DEFS[kind].color) } : {}"
          @click="character = kind"
        >
          <span class="name" :style="{ color: css(CHARACTER_DEFS[kind].color) }">{{ CHARACTER_DEFS[kind].name }}</span>
          <span class="desc">{{ CHARACTER_DEFS[kind].description }}</span>
        </button>
      </div>

      <div class="section-label">地圖</div>
      <div class="row">
        <button
          v-for="kind in MAP_ORDER"
          :key="kind"
          class="card"
          :class="{ active: map === kind }"
          :style="map === kind ? { borderColor: css(MAP_DEFS[kind].gridColor) } : {}"
          @click="map = kind"
        >
          <span class="name" :style="{ color: css(MAP_DEFS[kind].gridColor) }">{{ MAP_DEFS[kind].name }}</span>
          <span class="desc">{{ MAP_DEFS[kind].description }}</span>
        </button>
      </div>

      <button class="ui-btn ui-btn-primary start" @click="emit('start', { character, map })">單人遊玩</button>
      <button class="ui-btn ui-btn-ghost" @click="emit('multiplayer')">多人遊玩</button>
      <button class="ui-btn ui-btn-ghost ranking" @click="emit('open-leaderboard')">排行榜</button>
      <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
    </Panel>
  </Overlay>
</template>

<style scoped>
.menu-panel { gap: 0.6rem; }
h1 { font-family: var(--font-display); font-size: var(--fs-title); margin: 0 0 0.5rem; letter-spacing: 0.1em; }
.section-label { font-size: 0.9rem; opacity: 0.7; letter-spacing: 0.2em; margin-top: 0.4rem; }
.row { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.card {
  display: flex; flex-direction: column; gap: 0.25rem; width: 8.5rem; padding: 0.7rem;
  cursor: pointer; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 10px;
  background: rgba(255, 255, 255, 0.06); color: #fff; text-align: left;
}
.card.active { background: rgba(255, 255, 255, 0.14); }
.name { font-size: 1.1rem; font-weight: bold; }
.desc { font-size: 0.8rem; opacity: 0.8; }
.start { font-size: 1.4rem; padding: 0.6rem 2rem; margin-top: 0.6rem; }
.ranking { font-size: 1.05rem; padding: 0.4rem 1.4rem; }
.hint { opacity: 0.7; }

@media (max-width: 600px) {
  .overlay { gap: 0.4rem; padding: 0.5rem; }
  h1 { font-size: 2rem; margin-bottom: 0.2rem; }
  .row { gap: 0.5rem; }
  .card { width: 6.8rem; padding: 0.5rem; }
  .name { font-size: 0.95rem; }
  .desc { font-size: 0.72rem; }
  .start { font-size: 1.2rem; padding: 0.5rem 1.6rem; }
  .ranking { font-size: 0.95rem; padding: 0.4rem 1.1rem; }
}
.stats { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;
  font-size: 0.85rem; opacity: 0.85; margin-bottom: 0.4rem; }
.stats b { color: var(--immune-accent-strong); }
@media (max-width: 600px) { .stats { gap: 0.6rem; font-size: 0.78rem; } }
.notice-banner {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  background: rgba(255, 80, 80, 0.85); color: #fff;
  text-align: center; padding: 0.6rem 1rem; font-size: 0.95rem;
  cursor: pointer; letter-spacing: 0.05em;
  backdrop-filter: blur(4px);
}
</style>
