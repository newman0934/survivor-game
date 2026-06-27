<script setup lang="ts">
/** PlayerAvatar.vue — 左上玩家頭像框（純讀取）。角色圖示 + 主題色發光邊 + Lv 徽章。 */
import { computed } from 'vue'
import { useGameStore } from '../../stores/game'
import { CHARACTER_DEFS } from '../../engine/systems/characterDefs'
import GameIcon from '../common/GameIcon.vue'

const store = useGameStore()
const color = computed(() => {
  const c = CHARACTER_DEFS[store.character]?.color
  return c === undefined ? '#ffffff' : '#' + c.toString(16).padStart(6, '0')
})
</script>

<template>
  <div class="avatar" :style="{ '--char-color': color }">
    <div class="frame"><GameIcon category="character" :kind="store.character" :size="32" /></div>
    <div class="lv">Lv {{ store.level }}</div>
  </div>
</template>

<style scoped>
.avatar { position: absolute; top: 0.6rem; left: 0.6rem; display: flex; align-items: center; gap: 0.5rem; pointer-events: none; }
.frame { width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;
  border: 2px solid var(--char-color); background: var(--panel-surface); backdrop-filter: blur(var(--panel-blur));
  box-shadow: 0 0 14px color-mix(in srgb, var(--char-color) 45%, transparent); }
.lv { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; color: #fff; text-shadow: 0 1px 2px #000; }
@media (max-width: 600px) { .frame { width: 2.4rem; height: 2.4rem; } .lv { font-size: 0.95rem; } }
</style>
