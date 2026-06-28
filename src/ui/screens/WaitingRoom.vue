<script setup lang="ts">
/** WaitingRoom.vue — 等待室（phase==='lobby'）：玩家列表/角色/就緒；房主選圖 + 開始。 */
import { ref } from 'vue'
import { useGameStore } from '../../stores/game'
import { CHARACTER_ORDER, CHARACTER_DEFS } from '../../engine/systems/defs/characterDefs'
import { MAP_ORDER, MAP_DEFS } from '../../engine/systems/defs/mapDefs'
import type { CharacterKind, MapKind } from '../../engine/types'
import Overlay from '../common/Overlay.vue'
import Panel from '../common/Panel.vue'

const store = useGameStore()
const emit = defineEmits<{
  'set-character': [kind: CharacterKind]
  'set-ready': [ready: boolean]
  'set-map': [kind: MapKind]
  start: []
  leave: []
}>()
const ready = ref(false)
function css(c: number): string { return '#' + c.toString(16).padStart(6, '0') }
function toggleReady() { ready.value = !ready.value; emit('set-ready', ready.value) }
</script>

<template>
  <Overlay>
    <Panel class="wr-panel">
      <h1>等待室</h1>
      <div class="code">邀請碼：<b>{{ store.roomCode }}</b></div>

      <div class="section-label">玩家（{{ store.lobbyPlayers.length }}/4）</div>
      <div class="players">
        <div v-for="p in store.lobbyPlayers" :key="p.id" class="player" :class="{ ready: p.ready }">
          <span class="name" :style="{ color: css(CHARACTER_DEFS[p.character].color) }">{{ CHARACTER_DEFS[p.character].name }}</span>
          <span class="badge">{{ p.ready ? '就緒' : '未就緒' }}</span>
        </div>
      </div>

      <div class="section-label">選擇角色</div>
      <div class="row">
        <button v-for="kind in CHARACTER_ORDER" :key="kind" class="card"
          :style="{ borderColor: css(CHARACTER_DEFS[kind].color) }" @click="emit('set-character', kind)">
          {{ CHARACTER_DEFS[kind].name }}
        </button>
      </div>

      <template v-if="store.isHost">
        <div class="section-label">地圖（房主）</div>
        <div class="row">
          <button v-for="kind in MAP_ORDER" :key="kind" class="card"
            :class="{ active: store.lobbyMap === kind }" @click="emit('set-map', kind)">
            {{ MAP_DEFS[kind].name }}
          </button>
        </div>
      </template>

      <div class="actions">
        <button class="ui-btn ui-btn-primary" @click="toggleReady">{{ ready ? '取消就緒' : '我已就緒' }}</button>
        <button v-if="store.isHost" class="ui-btn ui-btn-primary" :disabled="!store.canStart" @click="emit('start')">開始</button>
        <button class="ui-btn ui-btn-ghost" @click="emit('leave')">離開</button>
      </div>
    </Panel>
  </Overlay>
</template>

<style scoped>
.wr-panel { gap: 0.6rem; }
h1 { font-family: var(--font-display); letter-spacing: 0.08em; }
.code b { color: var(--immune-accent-strong, #ffd54a); letter-spacing: 0.2em; }
.section-label { font-size: 0.85rem; opacity: 0.7; letter-spacing: 0.2em; margin-top: 0.3rem; }
.players { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.player { display: flex; flex-direction: column; align-items: center; padding: 0.4rem 0.7rem;
  border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; }
.player.ready { border-color: #5bff8c; }
.badge { font-size: 0.7rem; opacity: 0.8; }
.row { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; max-width: 90vw; }
.card { padding: 0.4rem 0.7rem; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px;
  background: rgba(255,255,255,0.06); color: #fff; cursor: pointer; }
.card.active { background: rgba(255,255,255,0.16); }
.actions { display: flex; gap: 0.6rem; margin-top: 0.5rem; }
</style>
