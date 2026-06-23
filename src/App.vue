<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useGameStore } from './stores/game'
import { Game } from './engine/Game'
import MainMenu from './ui/MainMenu.vue'
import Hud from './ui/Hud.vue'
import UpgradeModal from './ui/UpgradeModal.vue'
import GameOver from './ui/GameOver.vue'

const store = useGameStore()
const canvasParent = ref<HTMLDivElement | null>(null)
let game: Game | null = null
let seed = 1

async function startGame() {
  store.start()
  if (!canvasParent.value) return
  game = await Game.start(canvasParent.value, seed++)
}

function restart() {
  game?.stop()
  game = null
  startGame()
}

watch(
  () => store.phase,
  (phase) => {
    if (!game) return
    if (phase === 'upgrading') game.pause()
    else if (phase === 'playing') game.resume()
  },
)

onBeforeUnmount(() => game?.stop())
</script>

<template>
  <div class="root">
    <div ref="canvasParent" class="canvas-host" />
    <Hud v-if="store.phase !== 'menu'" />
    <MainMenu v-if="store.phase === 'menu'" @start="startGame" />
    <UpgradeModal v-if="store.phase === 'upgrading'" />
    <GameOver v-if="store.phase === 'over'" @restart="restart" />
  </div>
</template>

<style scoped>
.root, .canvas-host { position: absolute; inset: 0; }
</style>
