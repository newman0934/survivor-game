<script setup lang="ts">
/**
 * UpgradeModal.vue — 升級三選一彈窗（phase === 'upgrading' 時顯示）。
 * 讀 store.upgradeOptions 渲染卡片；點選時呼叫 store.pickUpgrade(id)，
 * 即升級握手的第二步——觸發引擎 callback 並讓遊戲恢復進行。
 *
 * 持有區：彈窗上方顯示目前武器/被動持有快照（名稱、等級、進化提示）。
 */
import { computed } from 'vue'
import { useGameStore, type LoadoutSnapshot } from '../stores/game'
import { WEAPON_DEFS } from '../engine/systems/weaponDefs'
import { PASSIVE_DEFS } from '../engine/systems/passiveDefs'
import { evolutionStatus } from '../engine/systems/loadout'
import Overlay from './Overlay.vue'
import Panel from './Panel.vue'
import GameIcon from './GameIcon.vue'
import { resolveOptionIcon } from './icons/iconRegistry'

const store = useGameStore()

/** 每個升級選項對應的圖示（武器/被動/或 null）；預算避免 template 內重複呼叫。 */
const cardIcons = computed(() => store.upgradeOptions.map((o) => resolveOptionIcon(o.id)))

type WeaponItem = LoadoutSnapshot['weapons'][number]
type PassiveItem = LoadoutSnapshot['passives'][number]

/** 目前持有的被動種類（供進化判定）。 */
const ownedPassiveKinds = computed(() => store.loadout.passives.map((p) => p.kind))

/** 武器顯示名（已進化顯示進化名；無進化定義則退回原名）。 */
function weaponName(w: WeaponItem): string {
  const def = WEAPON_DEFS[w.kind]
  return w.evolved ? (def.evolution?.label ?? def.label) : def.label
}
/** 武器等級顯示（滿級 MAX）。 */
function weaponLevel(w: WeaponItem): string {
  return w.level >= WEAPON_DEFS[w.kind].maxLevel ? 'MAX' : 'Lv' + w.level
}
/** 武器進化提示文字 + 樣式類別。 */
function weaponHint(w: WeaponItem): { text: string; cls: string } {
  const s = evolutionStatus(w, ownedPassiveKinds.value)
  if (s === 'evolved') return { text: '★ 已進化', cls: 'evolved' }
  if (s === 'ready') return { text: '可進化！', cls: 'ready' }
  const evo = WEAPON_DEFS[w.kind].evolution
  if (!evo) return { text: '', cls: 'pending' } // 無進化定義（防禦；現況 7 把皆有）
  return { text: '進化需：滿級＋' + PASSIVE_DEFS[evo.requires].label, cls: 'pending' }
}
/** 被動顯示名與等級。 */
function passiveName(p: PassiveItem): string {
  return PASSIVE_DEFS[p.kind].label
}
function passiveLevel(p: PassiveItem): string {
  return p.level >= PASSIVE_DEFS[p.kind].maxLevel ? 'MAX' : 'Lv' + p.level
}
</script>

<template>
  <Overlay>
    <Panel class="upgrade-panel">
      <h2 class="title">選擇升級</h2>
      <div class="loadout" v-if="store.loadout.weapons.length || store.loadout.passives.length">
        <div class="ld-col" v-if="store.loadout.weapons.length">
          <div class="ld-title">武器</div>
          <div v-for="w in store.loadout.weapons" :key="w.kind" class="ld-item">
            <span class="ld-name"><GameIcon category="weapon" :kind="w.kind" :size="15" /> {{ weaponName(w) }} {{ weaponLevel(w) }}</span>
            <span class="ld-hint" :class="weaponHint(w).cls">{{ weaponHint(w).text }}</span>
          </div>
        </div>
        <div class="ld-col" v-if="store.loadout.passives.length">
          <div class="ld-title">被動</div>
          <div v-for="p in store.loadout.passives" :key="p.kind" class="ld-item">
            <span class="ld-name"><GameIcon category="passive" :kind="p.kind" :size="15" /> {{ passiveName(p) }} {{ passiveLevel(p) }}</span>
          </div>
        </div>
      </div>
      <div class="cards">
        <!-- 逐一渲染引擎提供的升級選項；點擊送出該升級 id 並恢復遊戲 -->
        <button v-for="(opt, i) in store.upgradeOptions" :key="opt.id" class="card"
          :class="{ evolve: opt.id.startsWith('evolve:') }"
          :style="{ animationDelay: 0.06 * i + 's' }"
          @click="store.pickUpgrade(opt.id)">
          <GameIcon v-if="cardIcons[i]" :category="cardIcons[i]!.category" :kind="cardIcons[i]!.kind" :size="30" class="card-icon" />
          <span class="card-label">{{ opt.label }}</span>
        </button>
      </div>
    </Panel>
  </Overlay>
</template>

<style scoped>
.upgrade-panel { gap: 1.5rem; }
.title { font-family: var(--font-display); font-size: var(--fs-h2); }
.cards { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; max-width: 92vw; }
.card { width: 160px; height: 120px; font-size: 1.2rem; cursor: pointer; padding: 0.4rem;
  border: 2px solid var(--immune-accent); border-radius: 12px; background: var(--card-bg); color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem; }
.card-icon { display: block; }
.card-label { display: block; }
.card:hover { background: var(--card-bg-hover); border-color: var(--immune-accent-strong); }
.card.evolve { border-color: var(--antigen); box-shadow: 0 0 12px rgba(255, 213, 74, 0.6); }
.card.evolve:hover { border-color: var(--antigen); }
.title { animation: rise 0.3s ease-out backwards; }
.card { animation: rise 0.35s ease-out backwards; }
.card:active { transform: scale(0.96); }
@keyframes rise {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .title, .card { animation: none; }
}

@media (max-width: 600px) {
  /* 手機版：選項改為垂直排列，卡片橫向拉寬、高度依內容。 */
  .cards { flex-direction: column; gap: 0.6rem; width: 80vw; }
  .card { width: 100%; height: auto; min-height: 56px; padding: 0.8rem; font-size: 1rem; }
}

.loadout { display: flex; gap: 2rem; flex-wrap: wrap; justify-content: center; max-width: 92vw;
  font-size: 0.82rem; color: #fff; opacity: 0.95; }
.ld-col { display: flex; flex-direction: column; gap: 0.2rem; min-width: 9rem; }
.ld-title { font-size: 0.78rem; opacity: 0.6; letter-spacing: 0.15em; margin-bottom: 0.15rem; }
.ld-item { display: flex; justify-content: space-between; gap: 0.6rem; }
.ld-name { white-space: nowrap; display: inline-flex; align-items: center; gap: 0.3rem; }
.ld-hint { white-space: nowrap; opacity: 0.85; }
.ld-hint.ready { color: var(--immune-accent-strong); font-weight: bold; opacity: 1; }
.ld-hint.evolved { color: var(--antigen); font-weight: bold; opacity: 1; }
.ld-hint.pending { opacity: 0.55; }
@media (max-width: 600px) {
  .loadout { gap: 1rem; font-size: 0.74rem; max-height: 38vh; overflow-y: auto; }
  .ld-col { min-width: 7.5rem; }
}
</style>
