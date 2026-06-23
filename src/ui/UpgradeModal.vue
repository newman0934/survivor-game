<script setup lang="ts">
import { useGameStore } from '../stores/game'
const store = useGameStore()
</script>

<template>
  <div class="overlay">
    <h2>選擇升級</h2>
    <div class="cards">
      <button v-for="opt in store.upgradeOptions" :key="opt.id" class="card"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.5rem;
  background: rgba(16, 16, 24, 0.8); color: #fff; font-family: sans-serif; }
.cards { display: flex; gap: 1rem; }
.card { width: 160px; height: 120px; font-size: 1.2rem; cursor: pointer;
  border: 2px solid #4aa3ff; border-radius: 12px; background: #1c2030; color: #fff; }
.card:hover { background: #283050; }
</style>
