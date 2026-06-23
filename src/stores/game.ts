import { defineStore } from 'pinia'

export type Phase = 'menu' | 'playing' | 'upgrading' | 'over'

export interface Summary {
  hp: number
  maxHp: number
  time: number
  level: number
  kills: number
  xp: number
  xpNeeded: number
}

export interface UpgradeDescriptor {
  id: string
  label: string
}

interface State extends Summary {
  phase: Phase
  upgradeOptions: UpgradeDescriptor[]
  // set by the engine; called by UI when the player picks an upgrade
  onUpgradePicked: ((id: string) => void) | null
}

export const useGameStore = defineStore('game', {
  state: (): State => ({
    phase: 'menu',
    hp: 0,
    maxHp: 0,
    time: 0,
    level: 1,
    kills: 0,
    xp: 0,
    xpNeeded: 0,
    upgradeOptions: [],
    onUpgradePicked: null,
  }),
  actions: {
    start() {
      this.phase = 'playing'
      this.hp = 0
      this.maxHp = 0
      this.time = 0
      this.level = 1
      this.kills = 0
      this.xp = 0
      this.xpNeeded = 0
      this.upgradeOptions = []
      this.onUpgradePicked = null
    },
    updateSummary(s: Summary) {
      this.hp = s.hp
      this.maxHp = s.maxHp
      this.time = s.time
      this.level = s.level
      this.kills = s.kills
      this.xp = s.xp
      this.xpNeeded = s.xpNeeded
    },
    offerUpgrades(options: UpgradeDescriptor[]) {
      this.upgradeOptions = options
      this.phase = 'upgrading'
    },
    pickUpgrade(id: string) {
      this.onUpgradePicked?.(id)
      this.upgradeOptions = []
      this.phase = 'playing'
    },
    gameOver() {
      this.phase = 'over'
    },
    toMenu() {
      this.phase = 'menu'
    },
  },
})
