<script setup lang="ts">
/** LoadoutBar.vue — 左下持有圖示列（純讀取）。武器+被動小圖示 + 等級 pip + 進化金邊。 */
import { useGameStore, type LoadoutSnapshot } from '../../stores/game'
import { WEAPON_DEFS } from '../../engine/systems/defs/weaponDefs'
import { PASSIVE_DEFS } from '../../engine/systems/defs/passiveDefs'
import GameIcon from '../common/GameIcon.vue'

const store = useGameStore()
type W = LoadoutSnapshot['weapons'][number]
type P = LoadoutSnapshot['passives'][number]
function wLv(w: W): string { return w.level >= WEAPON_DEFS[w.kind].maxLevel ? 'M' : String(w.level) }
function pLv(p: P): string { return p.level >= PASSIVE_DEFS[p.kind].maxLevel ? 'M' : String(p.level) }
</script>

<template>
  <div class="loadout-bar">
    <div v-for="w in store.loadout.weapons" :key="'w' + w.kind" class="slot" :class="{ evolved: w.evolved }">
      <GameIcon category="weapon" :kind="w.kind" :size="22" />
      <span class="pip">{{ wLv(w) }}</span>
    </div>
    <div v-for="p in store.loadout.passives" :key="'p' + p.kind" class="slot">
      <GameIcon category="passive" :kind="p.kind" :size="22" />
      <span class="pip">{{ pLv(p) }}</span>
    </div>
  </div>
</template>

<style scoped>
/* bottom 需清過底部血條(18px)+經驗條(12px)+間距(≈2.85rem)，避免持有列被經驗條蓋住 */
.loadout-bar { position: absolute; left: 0.6rem; bottom: 3.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;
  max-width: 60vw; pointer-events: none; }
.slot { position: relative; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; border: 1px solid var(--panel-border); background: var(--panel-surface);
  backdrop-filter: blur(var(--panel-blur)); }
.slot.evolved { border-color: var(--antigen); box-shadow: 0 0 8px rgba(255, 213, 74, 0.55); }
.pip { position: absolute; right: -2px; bottom: -4px; font-family: var(--font-display); font-size: 0.62rem; font-weight: 700;
  color: #fff; background: rgba(0, 0, 0, 0.6); border-radius: 4px; padding: 0 2px; line-height: 1.1; }
@media (max-width: 600px) { .slot { width: 1.7rem; height: 1.7rem; } .loadout-bar { bottom: 3.3rem; max-width: 72vw; } }
</style>
