<script setup lang="ts">
/**
 * Leaderboard.vue — 排行榜彈窗（純呈現）。
 * 由 App.vue 以 props 傳入 runs（已依存活時間降冪、最多 10 筆）；顯示前 N 名戰績。
 * 「關閉」發出 close 事件由 App 收起。不讀 store、不碰引擎/存檔。
 */
import type { RunRecord } from '../../persistence/saveStore'
import { CHARACTER_DEFS } from '../../engine/systems/characterDefs'
import { MAP_DEFS } from '../../engine/systems/mapDefs'
import type { CharacterKind, MapKind } from '../../engine/types'
import Overlay from '../common/Overlay.vue'
import Panel from '../common/Panel.vue'

defineProps<{ runs: RunRecord[] }>()
const emit = defineEmits<{ close: [] }>()

/** 秒數 → M:SS（與 Hud/GameOver 一致）。 */
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
/** 毫秒時間戳 → YYYY/MM/DD；非有限數回「—」。 */
function fmtDate(ts: number): string {
  if (!Number.isFinite(ts)) return '—'
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}/${mm}/${dd}`
}
/** 角色 kind → 顯示名；未知 kind 退回原字串。 */
function charName(kind: CharacterKind): string {
  return CHARACTER_DEFS[kind]?.name ?? kind
}
/** 角色 kind → 顏色 CSS hex；未知退回白色。 */
function charColor(kind: CharacterKind): string {
  const c = CHARACTER_DEFS[kind]?.color
  return c === undefined ? '#fff' : '#' + c.toString(16).padStart(6, '0')
}
/** 地圖 kind → 顯示名；未知 kind 退回原字串。 */
function mapName(kind: MapKind): string {
  return MAP_DEFS[kind]?.name ?? kind
}
</script>

<template>
  <Overlay>
    <Panel class="lb-panel">
      <h1>排行榜</h1>
      <p v-if="runs.length === 0" class="empty">尚無紀錄，快去存活看看！</p>
      <div v-else class="table-wrap">
        <table class="board">
          <thead>
            <tr><th>#</th><th>存活</th><th>擊殺</th><th>等級</th><th>角色</th><th>地圖</th><th>日期</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in runs" :key="i">
              <td class="rank">{{ i + 1 }}</td>
              <td>{{ fmtTime(r.time) }}<span v-if="r.cleared" class="cleared-mark"> ★</span></td>
              <td>{{ r.kills }}</td>
              <td>{{ r.level }}</td>
              <td :style="{ color: charColor(r.character) }">{{ charName(r.character) }}</td>
              <td>{{ mapName(r.map) }}</td>
              <td class="date">{{ fmtDate(r.date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="ui-btn ui-btn-primary" @click="emit('close')">關閉</button>
    </Panel>
  </Overlay>
</template>

<style scoped>
.lb-panel { gap: 1rem; animation: lbpop 0.3s ease-out both; }
@keyframes lbpop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .lb-panel { animation: none; } }
h1 { font-family: var(--font-display); margin: 0; letter-spacing: 0.08em; }
.empty { opacity: 0.8; }
.table-wrap { max-width: 92vw; overflow-x: auto; }
.board { border-collapse: collapse; font-size: 0.95rem; }
.board th, .board td { padding: 0.35rem 0.7rem; text-align: center; white-space: nowrap; }
.board thead th { color: var(--immune-accent-strong); border-bottom: 1px solid rgba(255, 255, 255, 0.25); }
.board tbody tr:nth-child(odd) { background: rgba(255, 255, 255, 0.05); }
.board .rank { color: var(--immune-accent-strong); font-weight: bold; }
.board .date { opacity: 0.75; }
.cleared-mark { color: #ffd54a; }
.lb-panel > .ui-btn { font-size: 1.2rem; padding: 0.5rem 1.6rem; }
@media (max-width: 600px) {
  .board { font-size: 0.82rem; }
  .board th, .board td { padding: 0.3rem 0.45rem; }
}
</style>
