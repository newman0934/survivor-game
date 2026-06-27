<script setup lang="ts">
/** MultiUpgradeOverlay.vue — 多人非阻塞升級浮層：本地玩家有待選時顯示限時卡列 + 倒數條。
 *  不暫停世界、不擋遊戲輸入（pointer-events 僅卡片）。 */
import { computed } from 'vue'
import { useGameStore } from '../../stores/game'
import GameIcon from '../common/GameIcon.vue'
import { resolveOptionIcon } from '../icons/iconRegistry'
import { UPGRADE_TIMEOUT } from '../../engine/World'

const store = useGameStore()
const pct = computed(() => Math.max(0, Math.min(100, (store.multiOfferTimeLeft / UPGRADE_TIMEOUT) * 100)))
// 每張卡的圖示解析一次（對齊 UpgradeModal 的 cardIcons 模式，避免 template 重複呼叫）。
const cardIcons = computed(() => store.multiOffer?.map((o) => resolveOptionIcon(o.id)) ?? [])
</script>

<template>
  <div v-if="store.multiOffer" class="multi-upgrade">
    <div class="hint">升級！選一張（{{ Math.ceil(store.multiOfferTimeLeft) }}s）</div>
    <div class="timer"><div class="fill" :style="{ width: pct + '%' }" /></div>
    <div class="cards">
      <button v-for="(o, i) in store.multiOffer" :key="o.id" class="card ui-btn" @click="store.pickMultiUpgrade(o.id)">
        <GameIcon v-if="cardIcons[i]" :category="cardIcons[i]!.category" :kind="cardIcons[i]!.kind" :size="28" />
        <span class="label">{{ o.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.multi-upgrade {
  position: absolute; left: 50%; bottom: 6.5rem; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  pointer-events: none; /* 容器不擋輸入；卡片自行開啟 */
}
.hint { font-family: var(--font-display, sans-serif); font-size: 0.85rem; color: #ffd54a; text-shadow: 0 1px 2px #000; }
.timer { width: min(70vw, 360px); height: 5px; border-radius: 3px; background: rgba(0,0,0,0.45); overflow: hidden; }
.timer .fill { height: 100%; background: #ffd54a; transition: width 0.1s linear; }
.cards { display: flex; gap: 0.5rem; }
.card { pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.4rem 0.6rem; min-width: 88px; }
.label { font-size: 0.75rem; }
</style>
