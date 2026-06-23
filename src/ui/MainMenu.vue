<script setup lang="ts">
/**
 * MainMenu.vue — 主選單 overlay（phase === 'menu' 時顯示）。
 * 顯示角色與地圖選擇卡，按開始時向 App.vue 發出 start 事件並帶 { character, map }。
 */
import { ref } from 'vue'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../engine/systems/characterDefs'
import { MAP_ORDER, MAP_DEFS } from '../engine/systems/mapDefs'
import type { CharacterKind, MapKind } from '../engine/types'

const emit = defineEmits<{ start: [opts: { character: CharacterKind; map: MapKind }] }>()
const character = ref<CharacterKind>('macrophage')
const map = ref<MapKind>('vessel')

/** 把顏色數字轉成 CSS hex 字串。 */
function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}
</script>

<template>
  <div class="overlay">
    <h1>Survivor</h1>

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

    <button class="start" @click="emit('start', { character, map })">開始遊戲</button>
    <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.6rem;
  color: #fff; font-family: sans-serif; background: rgba(16, 16, 24, 0.85); overflow: auto;
}
h1 { font-size: 3rem; margin: 0 0 0.5rem; letter-spacing: 0.1em; }
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
.start {
  font-size: 1.4rem; padding: 0.6rem 2rem; margin-top: 0.6rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff;
}
.hint { opacity: 0.7; }

@media (max-width: 600px) {
  .overlay { gap: 0.4rem; padding: 0.5rem; }
  h1 { font-size: 2rem; margin-bottom: 0.2rem; }
  .row { gap: 0.5rem; }
  .card { width: 6.8rem; padding: 0.5rem; }
  .name { font-size: 0.95rem; }
  .desc { font-size: 0.72rem; }
  .start { font-size: 1.2rem; padding: 0.5rem 1.6rem; }
}
</style>
