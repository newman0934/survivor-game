<script setup lang="ts">
/**
 * MainMenu.vue — 主選單 overlay（phase === 'menu' 時顯示）。
 * 純呈現元件，不讀 store；按下開始時向上層（App.vue）發出 start 事件，由其負責啟動遊戲。
 */
// 開始遊戲事件，無 payload；由 App.vue 監聽並呼叫 startGame。
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div class="overlay">
    <h1>Survivor</h1>
    <button @click="emit('start')">開始遊戲</button>
    <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
  color: #fff; font-family: sans-serif; background: rgba(16, 16, 24, 0.85);
}
h1 { font-size: 4rem; margin: 0; letter-spacing: 0.1em; }
button { font-size: 1.5rem; padding: 0.6rem 2rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff; }
.hint { opacity: 0.7; }
</style>
