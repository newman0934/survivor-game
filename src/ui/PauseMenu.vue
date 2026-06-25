<script setup lang="ts">
/** PauseMenu.vue — 暫停選單 overlay（phase==='paused'）。重用 Overlay/Panel + .ui-btn。 */
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'

const emit = defineEmits<{ resume: []; restart: []; menu: [] }>()
</script>

<template>
  <Overlay>
    <Panel class="pause-panel">
      <h1>暫停</h1>
      <div class="actions">
        <button class="ui-btn ui-btn-primary" @click="emit('resume')">繼續</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('restart')">重新開始</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('menu')">回主選單</button>
      </div>
    </Panel>
  </Overlay>
</template>

<style scoped>
.pause-panel { gap: 1.2rem; }
h1 { font-family: var(--font-display); margin: 0; letter-spacing: 0.08em; }
.actions { display: flex; flex-direction: column; gap: 0.7rem; align-items: stretch; }
.actions .ui-btn { font-size: 1.2rem; padding: 0.55rem 2rem; }
</style>
