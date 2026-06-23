<script setup lang="ts">
/**
 * MuteButton.vue — 右上角靜音切換鈕（呈現層）。
 * 切換 soundManager 靜音；不讀 store、不碰引擎邏輯。
 */
import { ref } from 'vue'
import { soundManager } from '../engine/core/soundManager'

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
  width: 2.4rem; height: 2.4rem; font-size: 1.2rem; cursor: pointer;
  border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.12); color: #fff;
}
</style>
