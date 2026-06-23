<script setup lang="ts">
/**
 * MainMenu.vue — 主選單 overlay（phase === 'menu' 時顯示）。
 * 顯示角色選擇卡，按開始時向 App.vue 發出 start 事件並帶選定角色。
 */
import { ref } from 'vue'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../engine/systems/characterDefs'
import type { CharacterKind } from '../engine/types'

// 開始遊戲事件，帶選定角色；由 App.vue 監聽並以該角色啟動遊戲。
const emit = defineEmits<{ start: [character: CharacterKind] }>()
const selected = ref<CharacterKind>('warrior')

/** 把顏色數字轉成 CSS hex 字串。 */
function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
</script>

<template>
  <div class="overlay">
    <h1>Survivor</h1>
    <div class="chars">
      <button
        v-for="kind in CHARACTER_ORDER"
        :key="kind"
        class="card"
        :class="{ active: selected === kind }"
        :style="selected === kind ? { borderColor: css(CHARACTER_DEFS[kind].color) } : {}"
        @click="selected = kind"
      >
        <span class="name" :style="{ color: css(CHARACTER_DEFS[kind].color) }">{{ CHARACTER_DEFS[kind].name }}</span>
        <span class="desc">{{ CHARACTER_DEFS[kind].description }}</span>
      </button>
    </div>
    <button class="start" @click="emit('start', selected)">開始遊戲</button>
    <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.2rem;
  color: #fff; font-family: sans-serif; background: rgba(16, 16, 24, 0.85);
}
h1 { font-size: 3.5rem; margin: 0; letter-spacing: 0.1em; }
.chars { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.card {
  display: flex; flex-direction: column; gap: 0.3rem; width: 9rem; padding: 0.8rem;
  cursor: pointer; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 10px;
  background: rgba(255, 255, 255, 0.06); color: #fff; text-align: left;
}
.card.active { background: rgba(255, 255, 255, 0.14); }
.name { font-size: 1.2rem; font-weight: bold; }
.desc { font-size: 0.85rem; opacity: 0.8; }
.start {
  font-size: 1.5rem; padding: 0.6rem 2rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff;
}
.hint { opacity: 0.7; }
</style>
