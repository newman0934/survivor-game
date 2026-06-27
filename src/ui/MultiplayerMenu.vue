<script setup lang="ts">
/** MultiplayerMenu.vue — 多人：建立或加入房間（輸入邀請碼）。真連線屬 4C。 */
import { ref } from 'vue'
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'

const emit = defineEmits<{ create: []; join: [code: string]; back: [] }>()
const code = ref('')
</script>

<template>
  <Overlay>
    <Panel class="mp-panel">
      <h1>多人遊玩</h1>
      <button class="ui-btn ui-btn-primary" @click="emit('create')">建立房間</button>
      <div class="join">
        <input v-model="code" class="code-input" placeholder="輸入邀請碼" maxlength="8" />
        <button class="ui-btn ui-btn-primary" :disabled="!code" @click="emit('join', code.trim())">加入</button>
      </div>
      <button class="ui-btn ui-btn-ghost" @click="emit('back')">返回</button>
    </Panel>
  </Overlay>
</template>

<style scoped>
.mp-panel { gap: 1rem; }
h1 { font-family: var(--font-display); letter-spacing: 0.08em; }
.join { display: flex; gap: 0.5rem; }
.code-input { padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.06); color: #fff; font-size: 1rem; text-transform: uppercase; }
</style>
