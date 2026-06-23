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
import { ref, watch, onBeforeUnmount } from 'vue'
import { useGameStore } from './stores/game'
import { Game } from './engine/Game'
import MainMenu from './ui/MainMenu.vue'
import Hud from './ui/Hud.vue'
import UpgradeModal from './ui/UpgradeModal.vue'
import GameOver from './ui/GameOver.vue'

const store = useGameStore()
// PixiJS 畫布要掛載的 DOM 容器（由 template 中的 ref 綁定）。
const canvasParent = ref<HTMLDivElement | null>(null)
// 目前的引擎實例；尚未開始或已停止時為 null。
let game: Game | null = null
// 每場遊戲遞增的亂數種子，確保不同場次有不同（但可重現）的隨機序列。
let seed = 1

// 開始一場新遊戲：先把 store 重置為 playing，再非同步啟動引擎並掛上畫布。
async function startGame() {
  store.start()
  if (!canvasParent.value) return
  game = await Game.start(canvasParent.value, seed++)
}

// 重新開始：先停掉舊引擎（Game.stop 為冪等）並清空參照，再開新的一場。
function restart() {
  game?.stop()
  game = null
  startGame()
}

// 監聽 phase：升級彈窗出現時暫停引擎迴圈，回到遊戲時恢復——即升級暫停握手的 UI 端。
watch(
  () => store.phase,
  (phase) => {
    if (!game) return
    if (phase === 'upgrading') game.pause()
    else if (phase === 'playing') game.resume()
  },
)

// 元件卸載時停掉引擎，避免 raf 迴圈與 Pixi 資源外洩（Game.stop 冪等，重複呼叫安全）。
onBeforeUnmount(() => game?.stop())
</script>

<template>
  <div class="root">
    <!-- PixiJS 畫布的宿主容器；引擎 start 時會把 canvas 插入這裡 -->
    <div ref="canvasParent" class="canvas-host" />
    <!-- 只要不在主選單就顯示 HUD（playing / upgrading / over 皆顯示） -->
    <Hud v-if="store.phase !== 'menu'" />
    <!-- 以下三個 overlay 依 phase 互斥顯示 -->
    <MainMenu v-if="store.phase === 'menu'" @start="startGame" />
    <UpgradeModal v-if="store.phase === 'upgrading'" />
    <GameOver v-if="store.phase === 'over'" @restart="restart" />
  </div>
</template>

<style scoped>
.root, .canvas-host { position: absolute; inset: 0; }
</style>
