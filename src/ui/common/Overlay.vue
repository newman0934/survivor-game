<script setup lang="ts">
/**
 * Overlay.vue — 共用背景遮罩層（無狀態 slot 元件、純呈現）。
 * 毛玻璃模糊 + 中心徑向暈染 + 置中容納內容；面板樣式請另用 Panel.vue 包內容。
 */
</script>

<template>
  <div class="ui-overlay"><slot /></div>
</template>

<style scoped>
.ui-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: var(--overlay-bg);
  backdrop-filter: blur(var(--overlay-blur));
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  color: #fff;
  overflow: auto;
  padding: 1rem;
}
</style>
