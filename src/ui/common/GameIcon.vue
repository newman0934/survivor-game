<script setup lang="ts">
/**
 * GameIcon.vue — 武器/被動主題圖示（無狀態純呈現）。
 * 查 registry 渲染內聯單色 SVG（描邊 currentColor，色取 IconDef.color）；查無對應安全不渲染。
 */
import { computed } from 'vue'
import { WEAPON_ICONS, PASSIVE_ICONS, CHARACTER_ICONS, type IconDef } from '../icons/iconRegistry'

const props = withDefaults(defineProps<{
  category: 'weapon' | 'passive' | 'character'
  kind: string
  size?: number
}>(), { size: 20 })

const REG = { weapon: WEAPON_ICONS, passive: PASSIVE_ICONS, character: CHARACTER_ICONS }
const def = computed<IconDef | undefined>(() => REG[props.category][props.kind as never])
</script>

<template>
  <svg v-if="def" class="game-icon" :width="size" :height="size"
    :viewBox="def.viewBox ?? '0 0 24 24'" :style="{ color: def.color }"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(d, i) in def.paths" :key="'s' + i" :d="d" />
    <path v-for="(d, i) in def.fills ?? []" :key="'f' + i" :d="d" fill="currentColor" stroke="none" />
  </svg>
</template>

<style scoped>
.game-icon { flex-shrink: 0; display: inline-block; vertical-align: middle; }
</style>
