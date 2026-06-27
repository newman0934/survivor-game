<script setup lang="ts">
/**
 * MuteButton.vue — 右上角靜音切換鈕（呈現層）。
 * 切換 soundManager 靜音；不讀 store、不碰引擎邏輯。
 */
import { ref } from 'vue'
import { soundManager } from '../../engine/audio/soundManager'

const muted = ref(false)
function toggle(): void {
  muted.value = !muted.value
  soundManager.resume() // 點擊也作為手勢啟動 AudioContext
  soundManager.setMuted(muted.value)
}
</script>

<template>
  <button class="mute" :aria-label="muted ? '取消靜音' : '靜音'" @click="toggle">
    {{ muted ? '🔇' : '🔊' }}
  </button>
</template>

<style scoped>
.mute {
  position: absolute; top: 0.5rem; right: 0.5rem; z-index: 10;
  width: 2.4rem; height: 2.4rem; font-size: 1.2rem; cursor: pointer; color: #fff;
  border: 1px solid var(--panel-border); border-radius: 10px;
  background: var(--panel-surface); backdrop-filter: blur(var(--panel-blur));
  transition: box-shadow var(--ui-med), border-color var(--ui-med), transform var(--ui-fast);
}
.mute:hover { border-color: var(--immune-accent-strong); box-shadow: 0 0 12px rgba(77, 208, 192, 0.5); }
.mute:active { transform: scale(0.94); }
.mute:focus-visible { outline: 2px solid var(--immune-accent-strong); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .mute:active { transform: none; } }
</style>
