/**
 * Pinia 橋接 store — Vue(DOM UI) 與引擎(純 TS) 之間唯一的溝通管道。
 *
 * 設計原則：這裡只存「純資料」——一小包 summary（hp/time/level/kills/xp…）與
 * 升級選項的 {id, label} 描述。**絕不**存放引擎的 entity 物件或任何會被 Vue 響應式系統
 * 包裹的重物件（那會在每幀更新數百個物件時拖垮效能）。
 *
 * 資料流：
 *  - 引擎 → store：引擎在需要時呼叫 updateSummary / offerUpgrades / gameOver 推資料進來。
 *  - store → 引擎：UI 透過 pickUpgrade 觸發引擎事先註冊的 onUpgradePicked callback。
 */
import { defineStore } from 'pinia'
import type { WeaponKind, PassiveKind, CharacterKind } from '../engine/types'

/** 遊戲整體狀態階段；App.vue 依此切換要顯示的 UI overlay。 */
export type Phase = 'menu' | 'playing' | 'upgrading' | 'over' | 'paused' | 'won'

/** 引擎每隔一段時間推給 UI 的精簡狀態快照（HUD 渲染所需的全部數值）。 */
export interface Summary {
  hp: number
  maxHp: number
  time: number
  level: number
  kills: number
  xp: number
  xpNeeded: number
  /** 場上是否有存活 Boss（決定血條顯示）。 */
  bossActive: boolean
  /** Boss 目前 hp（取整）；無 Boss 時為 0。 */
  bossHp: number
  /** Boss 最大 hp；無 Boss 時為 0。 */
  bossMaxHp: number
  /** 目前 Boss 是否為終局 Boss（HUD 標示用）。 */
  isFinalBoss: boolean
  /** 目前地圖事件預警字串（無則 undefined）；HUD 顯示橫幣用。 */
  eventWarning?: string
}

/** 玩家目前持有的武器與被動快照（升級彈窗顯示用，純資料）。 */
export interface LoadoutSnapshot {
  weapons: { kind: WeaponKind; level: number; evolved: boolean }[]
  passives: { kind: PassiveKind; level: number }[]
}

/** 一張升級卡的 UI 描述；不含任何引擎邏輯，apply 行為留在引擎端。 */
export interface UpgradeDescriptor {
  id: string
  label: string
}

/** store 完整狀態：summary 數值 + UI 階段 + 升級握手所需的暫存資料。 */
interface State extends Summary {
  /** 目前的遊戲階段。 */
  phase: Phase
  /** 升級時要呈現給玩家的三選一卡片；非升級階段為空陣列。 */
  upgradeOptions: UpgradeDescriptor[]
  /**
   * 由引擎在 offerUpgrades 前設定的 callback；玩家選定後由 pickUpgrade 呼叫，
   * 進而觸發引擎的 world.applyUpgrade。這是「store → 引擎」唯一的回呼通道。
   */
  onUpgradePicked: ((id: string) => void) | null
  /** 目前持有的武器/被動快照；升級彈窗開啟時更新。 */
  loadout: LoadoutSnapshot
  /** 目前角色（顯示用：HUD 頭像）。 */
  character: CharacterKind
}

/** 取得遊戲橋接 store 的 composable（Pinia 自動生成）。 */
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
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    isFinalBoss: false,
    upgradeOptions: [],
    onUpgradePicked: null,
    loadout: { weapons: [], passives: [] },
    character: 'macrophage',
  }),
  actions: {
    /** 開始新的一場：切到 playing 並把所有 summary/升級狀態歸零。由 App.vue 在啟動引擎前呼叫。 */
    start() {
      this.phase = 'playing'
      this.hp = 0
      this.maxHp = 0
      this.time = 0
      this.level = 1
      this.kills = 0
      this.xp = 0
      this.xpNeeded = 0
      this.bossActive = false
      this.bossHp = 0
      this.bossMaxHp = 0
      this.isFinalBoss = false
      this.eventWarning = undefined
      this.upgradeOptions = []
      this.onUpgradePicked = null
      this.loadout = { weapons: [], passives: [] }
    },
    /** 引擎 → store：把最新一份 summary 推進來供 HUD 渲染。不更動 phase。 */
    updateSummary(s: Summary) {
      this.hp = s.hp
      this.maxHp = s.maxHp
      this.time = s.time
      this.level = s.level
      this.kills = s.kills
      this.xp = s.xp
      this.xpNeeded = s.xpNeeded
      this.bossActive = s.bossActive
      this.bossHp = s.bossHp
      this.bossMaxHp = s.bossMaxHp
      this.isFinalBoss = s.isFinalBoss
      this.eventWarning = s.eventWarning
    },
    /** 引擎 → store：更新目前持有快照（升級彈窗顯示用）。 */
    setLoadout(l: LoadoutSnapshot) {
      this.loadout = l
    },
    /** 設定目前角色（App 開賽時呼叫，供 HUD 頭像顯示）。 */
    setCharacter(kind: CharacterKind) {
      this.character = kind
    },
    /**
     * 升級握手（步驟 1）：引擎升級時呼叫此 action 提供三選一選項並切到 upgrading 階段。
     * 引擎應在呼叫前先設好 onUpgradePicked。phase 變為 upgrading 後，App.vue 會暫停引擎迴圈。
     */
    offerUpgrades(options: UpgradeDescriptor[]) {
      this.upgradeOptions = options
      this.phase = 'upgrading'
    },
    /**
     * 升級握手（步驟 2）：UpgradeModal 中玩家點選卡片時呼叫。
     * 觸發引擎註冊的 onUpgradePicked（→ world.applyUpgrade）、清空選項並切回 playing
     * （App.vue 偵測到 phase 回到 playing 後恢復引擎迴圈）。
     */
    pickUpgrade(id: string) {
      this.onUpgradePicked?.(id)
      this.upgradeOptions = []
      this.phase = 'playing'
    },
    /** 引擎 → store：玩家死亡，切到結束畫面。 */
    gameOver() {
      this.phase = 'over'
    },
    /** 引擎 → store：擊敗終局 Boss，切到勝利畫面。 */
    victory() {
      this.phase = 'won'
    },
    /** 回到主選單。 */
    toMenu() {
      this.phase = 'menu'
    },
    /** 遊戲中暫停（僅 playing 生效，切到 paused）。 */
    pauseGame() {
      if (this.phase === 'playing') this.phase = 'paused'
    },
    /** 從暫停恢復（僅 paused 生效，切回 playing）。 */
    resumeGame() {
      if (this.phase === 'paused') this.phase = 'playing'
    },
  },
})
