<script setup lang="ts">
/** PauseButton.vue — 戰鬥中右上角暫停鈕（呈現層）。點擊呼叫 store.pauseGame。 */
import { useGameStore } from '../stores/game'

const store = useGameStore()
</script>

<template>
  <button class="pause-btn" aria-label="暫停" @click="store.pauseGame()">⏸</button>
</template>

<style scoped>
.pause-btn {
  position: absolute; top: 0.5rem; right: 3.4rem; z-index: 10;
  width: 2.4rem; height: 2.4rem; font-size: 1.1rem; cursor: pointer; color: #fff;
  border: 1px solid var(--panel-border); border-radius: 10px;
  background: var(--panel-surface); backdrop-filter: blur(var(--panel-blur));
  transition: box-shadow var(--ui-med), border-color var(--ui-med), transform var(--ui-fast);
}
.pause-btn:hover { border-color: var(--immune-accent-strong); box-shadow: 0 0 12px rgba(77, 208, 192, 0.5); }
.pause-btn:active { transform: scale(0.94); }
.pause-btn:focus-visible { outline: 2px solid var(--immune-accent-strong); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .pause-btn:active { transform: none; } }
</style>
