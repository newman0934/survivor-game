<script setup lang="ts">
/**
 * Panel.vue — 共用「免疫膜質」面板容器（無狀態 slot 元件、純呈現）。
 * 半透明深色面 + 1px 發光細邊 + 柔外發光 + 頂緣膜光澤 + 圓角；內容超高可捲、不溢出。
 */
</script>

<template>
  <div class="ui-panel"><slot /></div>
</template>

<style scoped>
.ui-panel {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-2);
  max-width: min(92vw, 720px);
  max-height: 88vh;
  overflow-y: auto;
  padding: var(--space-4);
  border-radius: var(--panel-radius);
  border: 1px solid var(--panel-border);
  background: var(--panel-surface);
  backdrop-filter: blur(var(--panel-blur));
  -webkit-backdrop-filter: blur(var(--panel-blur));
  box-shadow: var(--panel-glow), var(--panel-shadow);
}
/* 頂緣膜光澤 */
.ui-panel::before {
  content: ''; position: absolute; inset: 0;
  border-radius: var(--panel-radius);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 32%);
  pointer-events: none;
}
/* backdrop-filter 不支援時退回不透明面（內容仍清楚可讀） */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .ui-panel { background: var(--panel-surface-solid); }
}
</style>
