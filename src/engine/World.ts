/**
 * 核心模擬：World。
 *
 * ECS 架構的中樞——持有所有 entity 與可變的執行期狀態（計時器、等級、經驗、擊殺數…），
 * 並在每個 `step(dt)` 依固定順序呼叫無狀態的 system 函式推進一格模擬。
 * 純 TypeScript，執行期不依賴 Vue/Pinia。
 *
 * 唯一對 store 的參照是 `import type { Summary }`（型別專用，編譯後抹除）：
 * World 本身不推送資料，只透過 `summary()` 產生一小包唯讀快照供上層（Game）轉交給 store。
 *
 * 確定性：所有隨機都走建構時以 seed 建立的 `rng`，絕不呼叫 `Math.random()`。
 */
import type { Entity, PlayerStats, Weapon, WeaponLevelStats, UpgradeContext, EnemyKind, EliteAffix, Passive, CharacterKind, MapKind, SoundEvent, FxEvent, PickupKind, GameEventKind, PlayerState } from './types'
import type { Vec2 } from './core/vector'
import { distance } from './core/vector'
import { createRng, type Rng } from './core/rng'
import { createPlayer, createEnemy, createGem, createOrbit, createChest, createEnemyProjectile, createPickup } from './entities/factory'
import { applyVelocity } from './systems/movement'
import { spawnInterval, spawnPositionAround, pickEnemyKind } from './systems/spawn'
import { steerEnemy, spitterTick } from './systems/enemyAI'
import { ENEMY_DEFS, ENEMY_ORDER } from './systems/enemyDefs'
import { SpatialGrid } from './core/spatialGrid'
import { CHARACTER_DEFS } from './systems/characterDefs'
import { PASSIVE_DEFS } from './systems/passiveDefs'
import { MAP_DEFS } from './systems/mapDefs'
import { fireWand, fireKnife, orbitPositions, garlicTick,
  phagocyteSweep, chainTargets, novaBurst, PHAGOCYTE_HALF_ANGLE, CASCADE_FALLOFF } from './systems/weapons'
import { WEAPON_DEFS } from './systems/weaponDefs'
import { ELITE_AFFIX_DEFS } from './systems/eliteDefs'
import { pickEvent, pickAffix } from './systems/events'
import { GAME_EVENT_DEFS } from './systems/eventDefs'
import { circlesOverlap } from './systems/collision'
import { attractGem } from './systems/pickup'
import { xpForLevel, applyUpgradeById } from './systems/leveling'
import type { Summary, LoadoutSnapshot } from '../stores/game'

/** 敵人生成的距離：在玩家周圍此半徑的圓上隨機生怪（畫面外）。 */
const SPAWN_RADIUS = 700
/** 寶石進入感應範圍後，朝玩家飛行的吸取速度。 */
const GEM_PULL_SPEED = 350
const VACUUM_DURATION = 1.5      // 全場吸取持續秒數（期間不分距離吸引全部寶石）
const VACUUM_PULL_SPEED = 1100   // 全場吸取期間寶石飛向玩家的速度（比一般快、手感俐落）
const HEAL_FRAC = 0.3            // 回血回復 maxHp 比例
const HEAL_DROP_HP_FRAC = 0.5    // 血量低於 maxHp 此比例才可能掉回血（mercy）
const HEAL_DROP_CHANCE = 0.025   // 每次擊殺掉回血機率（低血時）
const VACUUM_DROP_CHANCE = 0.012 // 每次擊殺掉全場吸取機率
/** Boss 生成週期（秒）。 */
const BOSS_INTERVAL = 60
/** 終局 Boss 出現時間（秒）。 */
const FINAL_BOSS_TIME = 900
/** 地圖事件週期（秒）與觸發前預警時間（秒）。 */
const EVENT_INTERVAL = 150
const EVENT_WARNING_LEAD = 5
/** 隨機精英：開局多少秒後啟用，以及每次一般生怪變精英的機率。 */
const ELITE_MIN_TIME = 60
const ELITE_RANDOM_CHANCE = 0.02
/** 事件生怪數量。 */
const ELITE_PACK_COUNT = 3
const SWARM_RUSH_COUNT = 12
const ENCIRCLE_COUNT = 16
/** 敵人空間網格的方格邊長（碰撞鄰近查詢用）。 */
const CELL_SIZE = 100
/** 最大敵人半徑（由 ENEMY_DEFS 推得）；查詢半徑須加上它以免漏接重疊敵人。 */
const MAX_ENEMY_RADIUS = Math.max(...ENEMY_ORDER.map((k) => ENEMY_DEFS[k].radius))

export class World {
  /** 全部玩家（index 0 為單人/本地玩家）。 */
  players: PlayerState[] = []

  // ── 相容存取器：一律作用於 players[0]，使既有單人呼叫端/測試零改動 ──
  get player(): Entity { return this.players[0].entity }
  get stats(): PlayerStats { return this.players[0].stats }
  get weapons(): Weapon[] { return this.players[0].weapons }
  set weapons(v: Weapon[]) { this.players[0].weapons = v }
  get passives(): Passive[] { return this.players[0].passives }
  get playerColor(): number { return this.players[0].color }
  get playerCharacter(): CharacterKind { return this.players[0].character }
  get moveInput(): Vec2 { return this.players[0].moveInput }
  set moveInput(v: Vec2) { this.players[0].moveInput = v }
  get lastMoveDir(): Vec2 { return this.players[0].lastMoveDir }
  set lastMoveDir(v: Vec2) { this.players[0].lastMoveDir = v }
  private get vacuumTimer(): number { return this.players[0].vacuumTimer }
  private set vacuumTimer(v: number) { this.players[0].vacuumTimer = v }
  private get bibleAngle(): number { return this.players[0].bibleAngle }
  private set bibleAngle(v: number) { this.players[0].bibleAngle = v }
  private get orbitEntities(): Entity[] { return this.players[0].orbitEntities }
  private set orbitEntities(v: Entity[]) { this.players[0].orbitEntities = v }
  private get bibleHitTimers(): Map<Entity, number> { return this.players[0].bibleHitTimers }
  private get level(): number { return this.players[0].level }
  private set level(v: number) { this.players[0].level = v }
  private get xp(): number { return this.players[0].xp }
  private set xp(v: number) { this.players[0].xp = v }
  private get pendingLevelUps(): number { return this.players[0].pendingLevelUps }
  private set pendingLevelUps(v: number) { this.players[0].pendingLevelUps = v }

  /** 場上所有敵人（含本格剛死、待篩除者）。 */
  enemies: Entity[] = []
  /** 場上所有 projectile（含本格剛失效、待篩除者）。 */
  projectiles: Entity[] = []
  /** 場上所有敵方投射物（毒液彈）；與玩家 projectiles 分離。 */
  enemyProjectiles: Entity[] = []
  /** 場上所有經驗寶石。 */
  gemEntities: Entity[] = []
  /** 場上所有寶箱（Boss 掉落）。 */
  chestEntities: Entity[] = []
  /** 場上所有撿取物（回血／全場吸取）。 */
  pickupEntities: Entity[] = []

  /** 所選地圖種類（供 renderer 決定背景地貌）。 */
  mapKind: MapKind = 'vessel'
  /** 背景底色（取自所選地圖）；供 renderer 取用。 */
  mapBgColor = 0x0c0c12
  /** 背景網格線顏色（取自所選地圖）。 */
  mapGridColor = 0xffffff
  /** 背景網格線透明度（取自所選地圖）。 */
  mapGridAlpha = 0.04
  /** 生怪間隔倍率（取自所選地圖）。 */
  mapSpawnIntervalMult = 1
  /** 敵人 hp 倍率（取自所選地圖）。 */
  mapEnemyHpMult = 1

  /** 本格累積的語意音效事件；由上層每幀 consumeSoundEvents 排空。 */
  private soundEventQueue: SoundEvent[] = []
  /** 本格累積的武器視覺事件；由上層每幀 consumeFxEvents 排空。 */
  private fxEventQueue: FxEvent[] = []

  /** 確定性亂數來源（seeded）；模擬內所有隨機都走這裡。 */
  private rng: Rng
  /** 撿取物掉落專用 rng（自 seed 衍生，獨立於 spawn/combat 串流，避免擾動既有確定性）。 */
  private pickupRng: Rng
  /** 累積遊戲時間（秒）。 */
  private elapsed = 0
  /** 生怪倒數計時器（秒）；歸零即生怪並重置。 */
  private spawnTimer = 0
  /** Boss 生成倒數計時器（秒）。 */
  private bossTimer = BOSS_INTERVAL
  /** 已生成的 Boss 數量；用來讓每隻 Boss 比前一隻硬。 */
  private bossCount = 0
  /** 終局 Boss 出現時間（秒）；預設 FINAL_BOSS_TIME，可由建構子注入（測試加速用）。 */
  private finalBossTime = FINAL_BOSS_TIME
  /** 終局 Boss 是否已生成（確保只生一隻、並閘住 60s Boss 與事件）。 */
  private finalBossSpawned = false
  /** 是否已通關（擊敗終局 Boss）。 */
  private won = false
  /** 地圖事件倒數（秒）。 */
  private eventTimer = EVENT_INTERVAL
  /** 已挑定、預警中即將觸發的事件（在預警窗鎖定，確保預警文字與觸發事件一致）。 */
  private pendingEvent?: GameEventKind
  /** 目前 HUD 預警字串（無則 undefined）。 */
  private eventWarning?: string
  /** 敵人空間網格；每格在敵人移動後重建，供碰撞鄰近查詢。 */
  private enemyGrid = new SpatialGrid<Entity>(CELL_SIZE)
  /** 累計擊殺數。 */
  private kills = 0

  /** 目前玩家等級（唯讀，供 renderer 偵測升級上升沿）。 */
  get currentLevel(): number {
    return this.level
  }

  /** 依角色建立一位玩家的初始 PlayerState（起始武器/數值/血/被動/顏色）。 */
  private static makePlayerState(character: CharacterKind): PlayerState {
    const def = CHARACTER_DEFS[character]
    const entity = createPlayer({ x: 0, y: 0 })
    entity.maxHp = def.maxHp
    entity.hp = def.maxHp
    const stats: PlayerStats = {
      moveSpeed: 200, pickupRadius: 120, damageMult: 1, cooldownMult: 1,
      projectileSpeedMult: 1, areaMult: 1, regen: 0, armor: 0, xpGain: 1,
    }
    Object.assign(stats, def.statMods)
    return {
      entity, character, color: def.color, stats,
      weapons: [{ kind: def.startWeapon, level: 1, cooldownTimer: 0 }],
      passives: [], level: 1, xp: 0, pendingLevelUps: 0,
      lastMoveDir: { x: 1, y: 0 }, moveInput: { x: 0, y: 0 }, vacuumTimer: 0, alive: true,
      bibleAngle: 0, orbitEntities: [], bibleHitTimers: new Map(),
    }
  }

  /**
   * @param seed      本場的亂數種子，決定生怪位置等隨機序列（可重現）。
   * @param character 起始角色（預設巨噬細胞）；可傳陣列以啟用多玩家模式。
   */
  constructor(seed: number, character: CharacterKind | CharacterKind[] = 'macrophage', map: MapKind = 'vessel', finalBossTime: number = FINAL_BOSS_TIME) {
    this.rng = createRng(seed)
    this.finalBossTime = finalBossTime
    this.pickupRng = createRng(seed ^ 0x5bd1e995)
    const characters = Array.isArray(character) ? character : [character]
    this.players = characters.map((c) => World.makePlayerState(c))
    for (const p of this.players) {
      for (const pk of CHARACTER_DEFS[p.character].startPassives) {
        p.passives.push({ kind: pk, level: 1 })
        PASSIVE_DEFS[pk].apply(this.upgradeContextFor(p))
      }
    }
    const m = MAP_DEFS[map]
    this.mapKind = map
    this.mapBgColor = m.bgColor
    this.mapGridColor = m.gridColor
    this.mapGridAlpha = m.gridAlpha
    this.mapSpawnIntervalMult = m.spawnIntervalMult
    this.mapEnemyHpMult = m.enemyHpMult
  }

  /** @returns 目前存活的敵人（過濾掉 `active === false`）。 */
  activeEnemies(): Entity[] {
    return this.enemies.filter((e) => e.active)
  }
  /** @returns 所有寶石 entity。 */
  gems(): Entity[] {
    return this.gemEntities
  }
  /** @returns 所有寶箱 entity（供 renderer 顯示）。 */
  chests(): Entity[] {
    return this.chestEntities
  }
  /** @returns 場上的撿取物 entity（供 renderer 顯示）。 */
  pickups(): Entity[] {
    return this.pickupEntities
  }

  /** 取走並清空本格累積的音效事件（供上層交給音訊層播放）。 */
  consumeSoundEvents(): SoundEvent[] {
    const out = this.soundEventQueue
    this.soundEventQueue = []
    return out
  }

  /** 取走並清空本格累積的武器視覺事件（供上層交給特效層繪製）。 */
  consumeFxEvents(): FxEvent[] {
    const out = this.fxEventQueue
    this.fxEventQueue = []
    return out
  }

  /**
   * 在指定位置生成一隻敵人並加入場上；可選 affix 使其成為精英。
   * @param pos 生成位置。
   * @param kind 敵種。
   * @param affix 選填精英詞綴；提供時額外套 hp×3/xp×5 與詞綴乘區。
   * @returns 新建立的敵人 entity。
   */
  spawnEnemyAt(pos: Vec2, kind: EnemyKind = 'virus', affix?: EliteAffix): Entity {
    const e = createEnemy(pos, kind)
    this.scaleEnemyHp(e)
    if (affix) {
      const a = ELITE_AFFIX_DEFS[affix]
      e.affix = affix
      e.hp = e.maxHp = e.maxHp * 3 * a.hpMult
      e.radius *= a.radiusMult
      e.speed *= a.speedMult
      e.damage *= a.damageMult
      e.xp *= 5
    }
    this.enemies.push(e)
    return e
  }

  /** 依地圖倍率縮放單一敵人的 hp/maxHp。 */
  private scaleEnemyHp(e: Entity): void {
    e.hp *= this.mapEnemyHpMult
    e.maxHp = e.hp
  }

  /**
   * 在指定位置附近一次生成一小群 swarm（4 隻，固定角度偏移，維持確定性）。
   * @param pos 群襲中心位置。
   */
  spawnSwarmAt(pos: Vec2): void {
    const offsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    const r = 24
    for (const a of offsets) {
      const e = createEnemy({ x: pos.x + Math.cos(a) * r, y: pos.y + Math.sin(a) * r }, 'bacteria')
      this.scaleEnemyHp(e)
      this.enemies.push(e)
    }
  }

  /**
   * 在指定位置生成一隻 Boss，hp 依目前 bossCount 縮放（每隻比前一隻硬），並遞增 bossCount。
   * @param pos 生成位置。
   * @returns 新建立的 Boss entity。
   */
  spawnBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'superbug')
    const scale = 1 + 0.5 * this.bossCount
    b.hp = ENEMY_DEFS.superbug.hp * scale
    b.maxHp = b.hp
    this.scaleEnemyHp(b)
    this.bossCount += 1
    this.enemies.push(b)
    this.soundEventQueue.push('boss')
    return b
  }

  /**
   * 生成終局 Boss（固定數值、不套地圖 enemyHpMult、不參與 bossCount 縮放）。
   * @param pos 生成位置。
   * @returns 新建立的終局 Boss entity。
   */
  spawnFinalBossAt(pos: Vec2): Entity {
    const b = createEnemy(pos, 'finalboss')
    // 確保 hp 未被套用地圖倍率（createEnemy 從 ENEMY_DEFS 直接讀取）
    b.hp = ENEMY_DEFS.finalboss.hp
    b.maxHp = ENEMY_DEFS.finalboss.hp
    this.enemies.push(b)
    this.soundEventQueue.push('boss')
    return b
  }

  /**
   * 觸發一個地圖事件：依種類生成對應的一波敵人（全走 seeded rng）。
   * @param kind 事件種類。
   */
  triggerEvent(kind: GameEventKind): void {
    if (kind === 'swarm-rush') {
      const baseT = this.rng.next()
      for (let i = 0; i < SWARM_RUSH_COUNT; i++) {
        const t = baseT + (i - SWARM_RUSH_COUNT / 2) * 0.02
        this.spawnEnemyAt(spawnPositionAround(this.player.pos, SPAWN_RADIUS, t), 'virus')
      }
    } else if (kind === 'elite-pack') {
      for (let i = 0; i < ELITE_PACK_COUNT; i++) {
        const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
        this.spawnEnemyAt(pos, pickEnemyKind(this.elapsed, this.rng), pickAffix(this.rng))
      }
    } else if (kind === 'encircle') {
      for (let i = 0; i < ENCIRCLE_COUNT; i++) {
        const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, i / ENCIRCLE_COUNT)
        this.spawnEnemyAt(pos, pickEnemyKind(this.elapsed, this.rng))
      }
    } else {
      const _exhaustive: never = kind
      void _exhaustive
    }
  }

  /** 強制下一格立即開火（重置所有武器的開火計時器）。 */
  forceFire(): void {
    for (const w of this.weapons) w.cooldownTimer = 0
  }

  /** @returns 目前的聖經環繞物（供 renderer 顯示）。 */
  orbits(): Entity[] {
    return this.orbitEntities
  }

  /** 指定玩家的升級上下文（leveling/passive 就地修改）。 */
  upgradeContextFor(p: PlayerState): UpgradeContext {
    return {
      stats: p.stats, weapons: p.weapons, passives: p.passives, player: p.entity,
      heal: (amount: number) => { p.entity.hp = Math.min(p.entity.maxHp, p.entity.hp + amount) },
    }
  }

  /** 相容：players[0] 的升級上下文。 */
  upgradeContext(): UpgradeContext { return this.upgradeContextFor(this.players[0]) }

  /** 玩家數。 */
  get playerCount(): number { return this.players.length }

  /** 設定指定玩家的移動輸入方向。 */
  setMoveInput(playerIndex: number, dir: Vec2): void {
    const p = this.players[playerIndex]
    if (p) p.moveInput = dir
  }

  /** 全部玩家皆不存活（hp<=0）＝本局失敗。 */
  hasLost(): boolean { return this.players.every((p) => p.entity.hp <= 0) }

  /** 目前存活玩家（hp>0），固定 index 升冪。 */
  private livingPlayers(): PlayerState[] { return this.players.filter((p) => p.entity.hp > 0) }

  /** 離指定座標最近的存活玩家（無存活玩家時回 players[0]）。 */
  nearestLivingPlayer(pos: Vec2): PlayerState {
    const living = this.livingPlayers()
    if (living.length === 0) return this.players[0]
    let best = living[0], bestD = distance(best.entity.pos, pos)
    for (let i = 1; i < living.length; i++) {
      const d = distance(living[i].entity.pos, pos)
      if (d < bestD) { bestD = d; best = living[i] }
    }
    return best
  }

  /**
   * @returns 目前大蒜場域半徑（已套乘區）；未持有大蒜則回 0。供 renderer 畫場域圓。
   */
  garlicRadius(): number {
    const g = this.weapons.find((w) => w.kind === 'inflammation')
    if (!g) return 0
    const lvl = WEAPON_DEFS.inflammation.levels[g.level - 1]
    return (lvl.radius ?? 0) * this.stats.areaMult
  }

  /**
   * 給予經驗值，並結算可能連續觸發的升級。
   * @param amount 增加的經驗值。
   */
  grantXp(amount: number): void {
    this.xp += amount
    // 一次拾取可能跨越多個等級門檻，故用 while 迴圈把多餘經驗結算掉，
    // 每升一級就累加一次待處理升級（讓上層逐一彈出選卡）。
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level)
      this.level += 1
      this.pendingLevelUps += 1
      this.soundEventQueue.push('levelup')
    }
  }

  /**
   * 取走一次待處理的升級。
   * @returns 若有待處理升級則扣 1 並回傳 true；否則回傳 false。
   */
  consumeLevelUp(): boolean {
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps -= 1
      return true
    }
    return false
  }

  /**
   * 套用指定 id 的升級效果（升級握手的最後一步）。委派給 leveling.applyUpgradeById。
   * @param id 升級選項 id；未知 id 安靜略過。
   */
  applyUpgrade(id: string): void {
    applyUpgradeById(id, this.upgradeContext())
  }

  /** 取武器的生效數值：進化則用 evolution.level，否則用當前等級值。 */
  private effectiveLevel(weapon: Weapon): WeaponLevelStats {
    const def = WEAPON_DEFS[weapon.kind]
    return weapon.evolved && def.evolution ? def.evolution.level : def.levels[weapon.level - 1]
  }

  /**
   * 推進一格固定步長的模擬。systems 以固定順序執行，順序具語意（移動→生怪→敵人追擊
   * →開火→子彈飛行與命中→寶石吸取與拾取→敵人接觸傷害→篩除死亡 entity）。
   * @param dt 固定步長秒數（呼叫端固定傳入 1/60）。
   */
  step(dt: number): void {
    this.elapsed += dt

    // 1) 玩家移動：依輸入方向與移動速度設定速度，再套用位移。
    this.player.vel = { x: this.moveInput.x * this.stats.moveSpeed, y: this.moveInput.y * this.stats.moveSpeed }
    applyVelocity(this.player, dt)

    // 記錄最後非零移動方向（飛刀發射方向用）。
    if (this.moveInput.x !== 0 || this.moveInput.y !== 0) {
      const len = Math.hypot(this.moveInput.x, this.moveInput.y) || 1
      this.lastMoveDir = { x: this.moveInput.x / len, y: this.moveInput.y / len }
    }

    // 2) 生怪：計時器歸零時，依目前時間決定下次間隔（難度曲線），並在玩家周圍隨機生一隻。
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed) * this.mapSpawnIntervalMult
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      const kind = pickEnemyKind(this.elapsed, this.rng)
      if (kind === 'bacteria') this.spawnSwarmAt(pos)
      else {
        const affix = (this.elapsed >= ELITE_MIN_TIME && this.rng.next() < ELITE_RANDOM_CHANCE)
          ? pickAffix(this.rng) : undefined
        this.spawnEnemyAt(pos, kind, affix)
      }
    }

    // 2b/2c) 終局 Boss 出現前才推進 60s Boss 與地圖事件。
    if (!this.finalBossSpawned) {
      // 2b) Boss：獨立計時器，到點在環上生成一隻（隨次數變強）。
      this.bossTimer -= dt
      if (this.bossTimer <= 0) {
        this.bossTimer = BOSS_INTERVAL
        const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
        this.spawnBossAt(pos)
      }

      // 2c) 地圖事件：到預警窗鎖定事件並顯示警告；倒數歸零時觸發、重置計時。
      this.eventTimer -= dt
      if (this.eventTimer <= EVENT_WARNING_LEAD && this.eventTimer > 0) {
        if (!this.pendingEvent) this.pendingEvent = pickEvent(this.rng)
        this.eventWarning = GAME_EVENT_DEFS[this.pendingEvent].warning
      }
      if (this.eventTimer <= 0) {
        const kind = this.pendingEvent ?? pickEvent(this.rng)
        this.triggerEvent(kind)
        this.pendingEvent = undefined
        this.eventWarning = undefined
        this.eventTimer = EVENT_INTERVAL
      }
    }

    // 2d) 終局 Boss：到 finalBossTime 生成一隻（只生一次），之後閘住上方 Boss/事件。
    if (this.elapsed > this.finalBossTime - dt && !this.finalBossSpawned) {
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnFinalBossAt(pos)
      this.finalBossSpawned = true
      this.eventWarning = undefined // 清掉殘留預警
      this.pendingEvent = undefined // 終局 Boss 起，事件排程閘住，清掉殘留挑選
    }

    // 3) 敵人 AI：每隻朝玩家轉向後位移。
    for (const e of this.enemies) {
      if (!e.active) continue
      if (e.affix === 'regen') {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ELITE_AFFIX_DEFS.regen.regenPerSec * dt)
      }
      steerEnemy(e, this.player.pos, dt)
      applyVelocity(e, dt)
      // 噴吐病原：固定間隔朝玩家當前位置吐一發毒液彈。
      if (e.enemyKind === 'spitter') {
        const spit = ENEMY_DEFS.spitter.spit!
        if (spitterTick(e, dt, spit.interval)) {
          const dx = this.player.pos.x - e.pos.x, dy = this.player.pos.y - e.pos.y
          const len = Math.hypot(dx, dy) || 1
          this.enemyProjectiles.push(
            createEnemyProjectile(e.pos, { x: dx / len, y: dy / len }, spit.projSpeed, spit.projDamage),
          )
          this.soundEventQueue.push('shoot')
        }
      }
    }

    // 3b) 重建敵人空間網格（敵人移動後、碰撞查詢前），供本格鄰近查詢使用。
    this.rebuildEnemyGrid()

    // 4) 武器：遍歷每把武器，各自倒數冷卻並結算行為（生效值 = 等級值 × 全域乘區）。
    for (const weapon of this.weapons) {
      const def = WEAPON_DEFS[weapon.kind]
      const lvl = this.effectiveLevel(weapon)
      const evo = weapon.evolved ? def.evolution : undefined
      const damage = lvl.damage * this.stats.damageMult

      if (weapon.kind === 'antibody' || weapon.kind === 'perforin') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 0.5) * this.stats.cooldownMult
          const speed = (lvl.projectileSpeed ?? 400) * this.stats.projectileSpeedMult
          const count = lvl.count ?? 1
          const projs =
            weapon.kind === 'antibody'
              ? fireWand(this.player.pos, this.enemies, count, damage, speed)
              : fireKnife(this.player.pos, this.lastMoveDir, count, damage, speed)
          if (evo) {
            for (const p of projs) {
              p.evolved = true
              if (evo.pierce) { p.pierce = evo.pierce; p.hitEnemies = [] }
            }
          }
          this.projectiles.push(...projs)
          if (projs.length > 0) this.soundEventQueue.push('shoot')
        }
      } else if (weapon.kind === 'inflammation') {
        // 大蒜：每格對範圍內敵人連續扣血（dmg*dt），命中後結算死亡。
        const radius = (lvl.radius ?? 70) * this.stats.areaMult
        const cands = this.enemyGrid.queryRadius(
          this.player.pos.x, this.player.pos.y, radius + MAX_ENEMY_RADIUS,
        )
        garlicTick(this.player.pos, cands, radius, damage, dt)
        if (evo?.fieldRegen && this.player.hp > 0) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + evo.fieldRegen * dt)
        }
        this.checkKills()
      } else if (weapon.kind === 'phagocyte') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 0.7) * this.stats.cooldownMult
          const radius = (lvl.radius ?? 70) * this.stats.areaMult
          const cands = this.enemyGrid.queryRadius(
            this.player.pos.x, this.player.pos.y, radius + MAX_ENEMY_RADIUS,
          )
          const halfAngle = evo?.halfAngle ?? PHAGOCYTE_HALF_ANGLE
          const hits = phagocyteSweep(this.player.pos, this.lastMoveDir, cands, radius, halfAngle, damage)
          if (hits.length > 0) {
            this.checkKills()
            this.soundEventQueue.push('hit')
            this.fxEventQueue.push({
              kind: 'sweep', x: this.player.pos.x, y: this.player.pos.y,
              angle: Math.atan2(this.lastMoveDir.y, this.lastMoveDir.x), radius, halfAngle,
            })
          }
        }
      } else if (weapon.kind === 'cascade') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 1.0) * this.stats.cooldownMult
          const jumps = lvl.count ?? 3
          const range = (lvl.radius ?? 160) * this.stats.areaMult
          const targets = chainTargets(this.player.pos, this.enemies, jumps, range)
          if (targets.length > 0) {
            const falloff = evo?.noFalloff ? 1 : CASCADE_FALLOFF
            for (let k = 0; k < targets.length; k++) targets[k].hp -= damage * Math.pow(falloff, k)
            this.checkKills()
            this.soundEventQueue.push('hit')
            this.fxEventQueue.push({
              kind: 'chain',
              points: [{ x: this.player.pos.x, y: this.player.pos.y }, ...targets.map((t) => ({ x: t.pos.x, y: t.pos.y }))],
            })
          }
        }
      } else if (weapon.kind === 'nova') {
        weapon.cooldownTimer -= dt
        if (weapon.cooldownTimer <= 0) {
          weapon.cooldownTimer = (lvl.cooldown ?? 1.6) * this.stats.cooldownMult
          const radius = (lvl.radius ?? 120) * this.stats.areaMult
          const cands = this.enemyGrid.queryRadius(
            this.player.pos.x, this.player.pos.y, radius + MAX_ENEMY_RADIUS,
          )
          const hits = novaBurst(this.player.pos, cands, radius, damage)
          if (hits.length > 0) {
            this.checkKills()
            this.soundEventQueue.push('hit')
            this.fxEventQueue.push({ kind: 'nova', x: this.player.pos.x, y: this.player.pos.y, radius })
          }
        }
      }
      // bible 的位置與命中於下方步驟 4b 統一處理
    }

    // 4b) 聖經：依目前持有的聖經（若有）重建環繞物、更新位置並結算命中。
    this.updateBible(dt)

    // 5) 子彈飛行與命中：先位移、再倒數壽命；命中第一隻敵人即扣血並讓子彈失效，
    //    敵人血量歸零則記擊殺並在原地掉落經驗寶石。
    for (const p of this.projectiles) {
      if (!p.active) continue
      applyVelocity(p, dt)
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      const cands = this.enemyGrid.queryRadius(p.pos.x, p.pos.y, p.radius + MAX_ENEMY_RADIUS)
      for (const e of cands) {
        if (!e.active) continue
        if (p.hitEnemies && p.hitEnemies.includes(e)) continue // 已穿透過此敵，不重複命中
        if (circlesOverlap(p, e)) {
          e.hp -= p.damage
          this.soundEventQueue.push('hit')
          if (e.hp <= 0) this.killEnemy(e)
          // 穿透：記下此敵，仍有 pierce 額度則續飛、否則消耗
          if (p.pierce && p.pierce > 0) { p.pierce -= 1; p.hitEnemies!.push(e) }
          else p.active = false
          break // 每幀單發最多命中一隻
        }
      }
    }

    // 5b) 敵方投射物：飛行 + 壽命；與玩家重疊即扣血（套護甲）後消耗。
    for (const p of this.enemyProjectiles) {
      if (!p.active) continue
      applyVelocity(p, dt)
      p.life -= dt
      if (p.life <= 0) { p.active = false; continue }
      if (circlesOverlap(p, this.player)) {
        this.player.hp -= Math.max(0, p.damage - this.stats.armor)
        this.soundEventQueue.push('hurt')
        p.active = false
      }
    }

    // 6) 寶石：進入感應半徑後朝玩家吸取並位移；碰到玩家本體即拾取並給經驗。
    // 全場吸取（vacuum）啟動期間：不分距離吸引全部寶石、加速飛向玩家。
    if (this.vacuumTimer > 0) this.vacuumTimer = Math.max(0, this.vacuumTimer - dt)
    const gemRadius = this.vacuumTimer > 0 ? Infinity : this.stats.pickupRadius
    const gemPull = this.vacuumTimer > 0 ? VACUUM_PULL_SPEED : GEM_PULL_SPEED
    for (const g of this.gemEntities) {
      if (!g.active) continue
      attractGem(g, this.player.pos, gemRadius, gemPull)
      applyVelocity(g, dt)
      if (distance(g.pos, this.player.pos) <= this.player.radius) {
        g.active = false
        this.grantXp(g.xp * this.stats.xpGain)
        // 寶石收取不發音（每顆都響太頻繁）；heal/vacuum 撿取物仍有音效
      }
    }

    // 6b) 寶箱：吸取並位移；碰到玩家本體即收取並觸發一次免費升級（pendingLevelUps）。
    for (const c of this.chestEntities) {
      if (!c.active) continue
      attractGem(c, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(c, dt)
      if (distance(c.pos, this.player.pos) <= this.player.radius) {
        c.active = false
        this.pendingLevelUps += 1
        this.soundEventQueue.push('chest')
      }
    }

    // 6c) 撿取物：吸取並位移；碰玩家本體即拾取並套用效果。
    for (const pk of this.pickupEntities) {
      if (!pk.active) continue
      attractGem(pk, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(pk, dt)
      if (distance(pk.pos, this.player.pos) <= this.player.radius) {
        pk.active = false
        this.applyPickup(pk.pickupKind!)
      }
    }

    // 7) 敵人接觸傷害：與玩家重疊時持續扣血（乘 dt*10 換算成每秒傷害）；armor 固定減傷。
    const contactCands = this.enemyGrid.queryRadius(
      this.player.pos.x, this.player.pos.y, this.player.radius + MAX_ENEMY_RADIUS,
    )
    for (const e of contactCands) {
      if (!e.active) continue
      if (circlesOverlap(e, this.player)) {
        this.player.hp -= Math.max(0, e.damage - this.stats.armor) * dt * 10
        this.soundEventQueue.push('hurt')
      }
    }

    // 7b) 回復：每格依 regen 回血（僅存活時，夾 maxHp）。
    if (this.player.hp > 0 && this.stats.regen > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.stats.regen * dt)
    }

    // 7c) 補漏殺：掃描所有 hp<=0 但尚未結算的敵人（含外部設值、接觸傷害等非武器路徑）。
    this.checkKills()

    // 8) 清理：本格結束後一次篩除所有死亡／失效的 entity。
    this.enemies = this.enemies.filter((e) => e.active)
    this.projectiles = this.projectiles.filter((p) => p.active)
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => p.active)
    this.gemEntities = this.gemEntities.filter((g) => g.active)
    this.chestEntities = this.chestEntities.filter((c) => c.active)
    this.pickupEntities = this.pickupEntities.filter((p) => p.active)
  }

  /**
   * 聖經：依目前持有的聖經重建/更新環繞物位置，並結算對敵人的命中（含 per-enemy 命中冷卻）。
   * 未持有聖經時清空環繞物。
   * @param dt 固定步長秒數。
   */
  private updateBible(dt: number): void {
    const bible = this.weapons.find((w) => w.kind === 'complement')
    if (!bible) {
      this.orbitEntities = []
      return
    }
    const evo = bible.evolved ? WEAPON_DEFS.complement.evolution : undefined
    const lvl = evo ? evo.level : WEAPON_DEFS.complement.levels[bible.level - 1]
    const hitCooldown = evo?.hitCooldown ?? 0.5
    const count = lvl.count ?? 1
    const radius = (lvl.radius ?? 90) * this.stats.areaMult
    const damage = lvl.damage * this.stats.damageMult
    this.bibleAngle += (lvl.angularSpeed ?? 2.5) * dt

    // 重建環繞物數量以對齊 count，並更新位置與傷害。
    const pts = orbitPositions(this.player.pos, count, radius, this.bibleAngle)
    if (this.orbitEntities.length !== count) {
      this.orbitEntities = pts.map((p) => createOrbit(p, damage))
    } else {
      for (let i = 0; i < count; i++) {
        this.orbitEntities[i].pos = pts[i]
        this.orbitEntities[i].damage = damage
      }
    }

    // 命中冷卻倒數（過期或敵人失效即移除）。
    for (const [e, t] of this.bibleHitTimers) {
      const nt = t - dt
      if (nt <= 0 || !e.active) this.bibleHitTimers.delete(e)
      else this.bibleHitTimers.set(e, nt)
    }
    // 環繞物對重疊敵人扣血（冷卻外才扣）。
    for (const orb of this.orbitEntities) {
      const cands = this.enemyGrid.queryRadius(orb.pos.x, orb.pos.y, orb.radius + MAX_ENEMY_RADIUS)
      for (const e of cands) {
        if (!e.active) continue
        if (this.bibleHitTimers.has(e)) continue
        const dx = orb.pos.x - e.pos.x
        const dy = orb.pos.y - e.pos.y
        if (Math.hypot(dx, dy) <= orb.radius + e.radius) {
          e.hp -= orb.damage
          this.bibleHitTimers.set(e, hitCooldown) // 進化縮短命中冷卻
        }
      }
    }
    this.checkKills()
  }

  /** 重建敵人空間網格：清空後插入所有存活敵人（每格在敵人移動後呼叫）。 */
  private rebuildEnemyGrid(): void {
    this.enemyGrid.clear()
    for (const e of this.enemies) {
      if (e.active) this.enemyGrid.insert(e, e.pos.x, e.pos.y)
    }
  }

  /** 掃描敵人，凡 hp<=0 者記擊殺、掉寶並失效（供場域/環繞型武器命中後結算）。 */
  private checkKills(): void {
    for (const e of this.enemies) {
      if (e.active && e.hp <= 0) this.killEnemy(e)
    }
  }

  /**
   * 統一處理敵人死亡：失效、記擊殺、掉經驗寶石；Boss 額外掉寶箱。
   * 分裂敵人死亡時在原地生子體；爆炸敵人死亡時對玩家造成範圍傷害並推特效。
   * @param e 已判定 hp<=0 的敵人。
   */
  private killEnemy(e: Entity): void {
    e.active = false
    this.kills += 1
    if (e.enemyKind === 'finalboss') this.won = true
    this.gemEntities.push(createGem(e.pos, e.xp))
    if (e.enemyKind === 'superbug' || e.affix) this.chestEntities.push(createChest(e.pos))
    this.soundEventQueue.push('kill')
    this.maybeDropPickup(e.pos)
    const def = e.enemyKind ? ENEMY_DEFS[e.enemyKind] : undefined
    // 死亡分裂：在原地生 count 隻子體（小角度錯位，確定性）。
    // 子體刻意不繼承精英詞綴，避免精英分裂雪崩。
    if (def?.splitInto) {
      const { kind, count } = def.splitInto
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2
        this.spawnEnemyAt({ x: e.pos.x + Math.cos(a) * 14, y: e.pos.y + Math.sin(a) * 14 }, kind)
      }
    }
    // 死亡爆炸：exploder 敵種或 volatile 精英；玩家在半徑內扣血（套護甲）+ 推爆裂視覺。
    // exploder 敵種的 def.explode 數值優先於 volatile affix（?? 短路）；volatile 數值取自詞綴定義。
    const affixDef = e.affix ? ELITE_AFFIX_DEFS[e.affix] : undefined
    const explode = def?.explode
      ?? (affixDef?.explodeOnDeath ? { radius: affixDef.explodeRadius, damage: affixDef.explodeDamage } : undefined)
    if (explode) {
      const { radius, damage } = explode
      if (distance(e.pos, this.player.pos) <= radius) {
        this.player.hp -= Math.max(0, damage - this.stats.armor)
        this.soundEventQueue.push('hit')
      }
      this.fxEventQueue.push({ kind: 'nova', x: e.pos.x, y: e.pos.y, radius })
    }
  }

  /** 撿取物掉落：獨立 seeded rng；一次擊殺最多一個（heal/vacuum 互斥）；heal 僅低血 mercy。 */
  private maybeDropPickup(pos: Vec2): void {
    const r = this.pickupRng.next()
    if (this.player.hp < this.player.maxHp * HEAL_DROP_HP_FRAC && r < HEAL_DROP_CHANCE) {
      this.pickupEntities.push(createPickup(pos, 'heal'))
    } else if (r >= HEAL_DROP_CHANCE && r < HEAL_DROP_CHANCE + VACUUM_DROP_CHANCE) {
      this.pickupEntities.push(createPickup(pos, 'vacuum'))
    }
  }

  /** 套用撿取物效果：heal 回血（夾上限）；vacuum 收全場寶石轉經驗。 */
  private applyPickup(kind: PickupKind): void {
    if (kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * HEAL_FRAC)
    } else {
      // 全場吸取：啟動 vacuum 期間，寶石迴圈會把全部寶石加速吸向玩家、逐顆收取（保留飛行手感）。
      this.vacuumTimer = VACUUM_DURATION
    }
    this.soundEventQueue.push('pickup')
  }

  /** @returns 玩家是否已死亡（hp <= 0）。 */
  isPlayerDead(): boolean {
    return this.player.hp <= 0
  }

  /** @returns 是否已通關（擊敗終局 Boss）。 */
  hasWon(): boolean {
    return this.won
  }

  /**
   * 產生目前持有的武器/被動快照（純資料），供升級彈窗顯示。
   * @returns weapons（kind/level/evolved）與 passives（kind/level）的快照。
   */
  loadoutSnapshot(): LoadoutSnapshot {
    return {
      weapons: this.weapons.map((w) => ({ kind: w.kind, level: w.level, evolved: !!w.evolved })),
      passives: this.passives.map((p) => ({ kind: p.kind, level: p.level })),
    }
  }

  /**
   * 產生供 UI 顯示的唯讀摘要快照（HUD 需要的最小資料集）。
   * @returns 經四捨五入／取整的 `Summary`，由上層轉交給 store。
   */
  summary(): Summary {
    const boss = this.enemies.find((e) => e.active && (e.enemyKind === 'superbug' || e.enemyKind === 'finalboss'))
    return {
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      time: Math.floor(this.elapsed),
      level: this.level,
      kills: this.kills,
      xp: this.xp,
      xpNeeded: xpForLevel(this.level),
      bossActive: !!boss,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      isFinalBoss: boss?.enemyKind === 'finalboss',
      eventWarning: this.eventWarning,
    }
  }
}
