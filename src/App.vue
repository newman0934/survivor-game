<script setup lang="ts">
/**
 * App.vue — 根元件，扮演兩個角色：
 *
 * 1) 狀態機：依 store.phase（menu / playing / upgrading / over）切換要顯示哪個 UI overlay。
 * 2) 引擎宿主：把 PixiJS 畫布掛到 canvasParent，並掌控引擎生命週期（start / stop / pause / resume）。
 *
 * 資料流：本元件「讀」store.phase 來決定畫面，並驅動引擎；HUD/選單/彈窗各自直接讀 store。
 * 升級暫停的握手由 watch(store.phase) 完成——phase 變成 upgrading 就暫停引擎、變回 playing 就恢復。
 * 注意：引擎是純 TS，本元件僅透過 Game 的公開 API（start/stop/pause/resume）操作它。
 */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useGameStore } from './stores/game'
import { Game } from './engine/Game'
import type { CharacterKind, MapKind } from './engine/types'
import { loadSave, recordRun, type CumulativeStats, type RunRecord } from './persistence/saveStore'
import MainMenu from './ui/MainMenu.vue'
import Hud from './ui/Hud.vue'
import UpgradeModal from './ui/UpgradeModal.vue'
import GameOver from './ui/GameOver.vue'
import BossBar from './ui/BossBar.vue'
import MuteButton from './ui/MuteButton.vue'
import Leaderboard from './ui/Leaderboard.vue'
import PauseMenu from './ui/PauseMenu.vue'
import PauseButton from './ui/PauseButton.vue'

const store = useGameStore()
// PixiJS 畫布要掛載的 DOM 容器（由 template 中的 ref 綁定）。
const canvasParent = ref<HTMLDivElement | null>(null)
// 目前的引擎實例；尚未開始或已停止時為 null。
let game: Game | null = null
// 每場遊戲遞增的亂數種子，確保不同場次有不同（但可重現）的隨機序列。
let seed = 1
// 記住目前選定的角色與地圖（供「再玩一次」沿用）；預設戰士 + 平原。
let selected: { character: CharacterKind; map: MapKind } = { character: 'macrophage', map: 'vessel' }

// 開機讀取存檔：累積統計（主選單用）+ 戰績列表（排行榜用）；記錄一場後一併刷新。
const initialSave = loadSave()
const stats = ref<CumulativeStats>(initialSave.stats)
const runs = ref<RunRecord[]>(initialSave.runs)
// 排行榜彈窗開關。
const showLeaderboard = ref(false)
// 最近一場的破紀錄資訊；傳給結算畫面顯示。
const lastRun = ref<{ bestTime: number; isNewBestTime: boolean; isNewBestKills: boolean }>({
  bestTime: stats.value.bestTime,
  isNewBestTime: false,
  isNewBestKills: false,
})

// 開始一場新遊戲：先把 store 重置為 playing，再非同步啟動引擎並掛上畫布。
async function startGame(opts: { character: CharacterKind; map: MapKind } = selected) {
  selected = opts
  showLeaderboard.value = false // 開賽前收起排行榜，避免日後回主選單時殘留自動重開
  store.start()
  store.setCharacter(opts.character)
  if (!canvasParent.value) return
  game = await Game.start(canvasParent.value, seed++, opts.character, opts.map)
}

// 重新開始：先停掉舊引擎（Game.stop 為冪等）並清空參照，再以同角色+地圖開新的一場。
function restart() {
  game?.stop()
  game = null
  startGame(selected)
}

// 回主選單：停掉引擎並切回 menu，讓玩家重選角色/地圖（startGame 由 MainMenu 的 start 事件觸發）。
function toMenu() {
  game?.stop()
  game = null
  store.toMenu()
}

// 監聽 phase：升級暫停握手 + 進入 over 時記錄本場戰績。
watch(
  () => store.phase,
  (phase, prev) => {
    // game 為 null 時略過引擎暫停/恢復，但下方 over 記錄邏輯仍須執行，故不在此 early-return。
    if (game) {
      if (phase === 'upgrading' || phase === 'paused') game.pause()
      else if (phase === 'playing') game.resume()
    }
    // 進入結束畫面（上升沿）：以最終 summary + 當局角色/地圖記錄一場，並刷新統計與破紀錄旗標。
    if (phase === 'over' && prev !== 'over') {
      const res = recordRun({
        time: store.time,
        kills: store.kills,
        level: store.level,
        character: selected.character,
        map: selected.map,
        date: Date.now(),
      })
      stats.value = res.save.stats
      runs.value = res.save.runs
      lastRun.value = {
        bestTime: res.save.stats.bestTime,
        isNewBestTime: res.isNewBestTime,
        isNewBestKills: res.isNewBestKills,
      }
    }
  },
)

// ESC 切換暫停：playing→暫停、paused→恢復；其餘 phase 忽略。
function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  if (store.phase === 'playing') store.pauseGame()
  else if (store.phase === 'paused') store.resumeGame()
}
onMounted(() => window.addEventListener('keydown', onKeydown))

// 元件卸載時移除 ESC 監聽並停掉引擎（Game.stop 冪等，重複呼叫安全）。
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  game?.stop()
})
</script>

<template>
  <div class="root">
    <!-- PixiJS 畫布的宿主容器；引擎 start 時會把 canvas 插入這裡 -->
    <div ref="canvasParent" class="canvas-host" />
    <!-- 只要不在主選單就顯示 HUD（playing / upgrading / over 皆顯示） -->
    <Hud v-if="store.phase !== 'menu'" />
    <!-- Boss 血條：遊玩/升級暫停時，若場上有 Boss 則顯示 -->
    <BossBar v-if="store.phase === 'playing' || store.phase === 'upgrading'" />
    <MuteButton v-if="store.phase !== 'menu'" />
    <PauseButton v-if="store.phase === 'playing'" />
    <!-- 以下三個 overlay 依 phase 互斥顯示 -->
    <Transition name="fade"><MainMenu v-if="store.phase === 'menu'" :stats="stats" @start="startGame" @open-leaderboard="showLeaderboard = true" /></Transition>
    <Transition name="fade"><Leaderboard v-if="showLeaderboard && store.phase === 'menu'" :runs="runs" @close="showLeaderboard = false" /></Transition>
    <Transition name="fade"><UpgradeModal v-if="store.phase === 'upgrading'" /></Transition>
    <Transition name="fade"><GameOver v-if="store.phase === 'over'" :best-time="lastRun.bestTime" :is-new-best-time="lastRun.isNewBestTime" :is-new-best-kills="lastRun.isNewBestKills" @restart="restart" @menu="toMenu" /></Transition>
    <Transition name="fade"><PauseMenu v-if="store.phase === 'paused'" @resume="store.resumeGame()" @restart="restart" @menu="toMenu" /></Transition>
  </div>
</template>

<style scoped>
.root, .canvas-host { position: absolute; inset: 0; }
</style>

<style>
/* 免疫主題 UI 配色（全域 CSS 變數；scoped 元件可繼承取用）。 */
:root {
  --immune-accent: #4dd0c0;        /* 主色：免疫藍綠 */
  --immune-accent-strong: #6fe3d6; /* 主色亮版（hover/高亮邊框） */
  --antigen: #ffd54a;              /* 抗原黃（經驗） */
  --card-bg: #18221f;              /* 卡片底（去藍調的生物深色） */
  --card-bg-hover: #244038;        /* 卡片 hover */
}

/* phase overlay 淡入淡出（轉場類別套在子元件根節點，需非 scoped）。 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active { transition: none; }
}
</style>
