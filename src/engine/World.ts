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
import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind, EliteAffix, Passive, CharacterKind, MapKind, SoundEvent, FxEvent, GameEventKind, PlayerState } from './types'
import type { Vec2 } from './core/vector'
import { distance } from './core/vector'
import { createRng, type Rng } from './core/rng'
import { createPlayer, createGem, createEnemyProjectile } from './entities/factory'
import { applyVelocity } from './systems/movement'
import { spawnInterval, spawnPositionAround, pickEnemyKind } from './systems/spawn'
import { steerEnemy, spitterTick } from './systems/enemyAI'
import { ENEMY_DEFS, ENEMY_ORDER, MAX_ENEMY_RADIUS } from './systems/enemyDefs'
import { SpatialGrid } from './core/spatialGrid'
import { CHARACTER_DEFS } from './systems/characterDefs'
import { PASSIVE_DEFS, PASSIVE_ORDER } from './systems/passiveDefs'
import { MAP_DEFS } from './systems/mapDefs'
import { updateWeapons } from './systems/weaponFiring'
import { WEAPON_DEFS, WEAPON_ORDER } from './systems/weaponDefs'
import { ELITE_AFFIX_DEFS, ELITE_AFFIX_ORDER } from './systems/eliteDefs'
import { pickEvent, pickAffix } from './systems/events'
import { GAME_EVENT_DEFS } from './systems/eventDefs'
import { circlesOverlap } from './systems/collision'
import { SPAWN_RADIUS, spawnEnemy, spawnSwarm, spawnBoss, spawnFinalBoss, triggerGameEvent } from './systems/spawning'
import { killEnemy, checkKills, applyPickupTo } from './systems/enemyDeath'
import { attractGem } from './systems/pickup'
import { Checksum } from './core/checksum'
import { xpForLevel, applyUpgradeById } from './systems/leveling'
import { grantXpTo, processUpgrades, UPGRADE_TIMEOUT } from './systems/playerProgress'
import type { Summary, LoadoutSnapshot, UpgradeDescriptor } from '../stores/game'

// 多人非阻塞升級的待選逾時（秒）；定義於 systems/playerProgress，於此再匯出維持既有引用路徑。
export { UPGRADE_TIMEOUT }

/** 寶石進入感應範圍後，朝玩家飛行的吸取速度。 */
const GEM_PULL_SPEED = 350
const VACUUM_PULL_SPEED = 1100   // 全場吸取期間寶石飛向玩家的速度（比一般快、手感俐落）
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
/** 敵人空間網格的方格邊長（碰撞鄰近查詢用）。 */
const CELL_SIZE = 100

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
  private get level(): number { return this.players[0].level }
  private set level(v: number) { this.players[0].level = v }
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

  // ── 引擎內部模擬狀態（標記為公開以供 systems/* 函式存取；非對外 API） ──
  /** 確定性亂數來源（seeded）；模擬內所有隨機都走這裡。 */
  rng: Rng
  /** 撿取物掉落專用 rng（自 seed 衍生，獨立於 spawn/combat 串流，避免擾動既有確定性）。 */
  pickupRng: Rng
  /** 升級選項專用 rng（自 seed 衍生，獨立串流；使多人選項跨機一致、不擾動其他串流）。 */
  upgradeRng: Rng
  /** 累積遊戲時間（秒）。 */
  elapsed = 0
  /** 生怪倒數計時器（秒）；歸零即生怪並重置。 */
  private spawnTimer = 0
  /** Boss 生成倒數計時器（秒）。 */
  private bossTimer = BOSS_INTERVAL
  /** 已生成的 Boss 數量；用來讓每隻 Boss 比前一隻硬。 */
  bossCount = 0
  /** 終局 Boss 出現時間（秒）；預設 FINAL_BOSS_TIME，可由建構子注入（測試加速用）。 */
  private finalBossTime = FINAL_BOSS_TIME
  /** 終局 Boss 是否已生成（確保只生一隻、並閘住 60s Boss 與事件）。 */
  private finalBossSpawned = false
  /** 是否已通關（擊敗終局 Boss）。 */
  won = false
  /** 地圖事件倒數（秒）。 */
  private eventTimer = EVENT_INTERVAL
  /** 已挑定、預警中即將觸發的事件（在預警窗鎖定，確保預警文字與觸發事件一致）。 */
  private pendingEvent?: GameEventKind
  /** 目前 HUD 預警字串（無則 undefined）。 */
  private eventWarning?: string
  /** 敵人空間網格；每格在敵人移動後重建，供碰撞鄰近查詢。 */
  enemyGrid = new SpatialGrid<Entity>(CELL_SIZE)
  /** 累計擊殺數。 */
  kills = 0

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
      upgradeTimer: 0,
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
    this.upgradeRng = createRng(seed ^ 0x9e3779b9)
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

  /** 推一筆音效事件（供 systems/* 累積，queue 維持私有）。 */
  pushSound(e: SoundEvent): void { this.soundEventQueue.push(e) }
  /** 推一筆視覺事件（供 systems/* 累積，queue 維持私有）。 */
  pushFx(e: FxEvent): void { this.fxEventQueue.push(e) }

  // ── 生怪：委派給 systems/spawning（World 留薄殼，維持既有公開 API） ──
  /** 在指定位置生成一隻敵人並加入場上；可選 affix 使其成為精英。 */
  spawnEnemyAt(pos: Vec2, kind: EnemyKind = 'virus', affix?: EliteAffix): Entity {
    return spawnEnemy(this, pos, kind, affix)
  }
  /** 在指定位置附近一次生成一小群 swarm（4 隻）。 */
  spawnSwarmAt(pos: Vec2): void { spawnSwarm(this, pos) }
  /** 在指定位置生成一隻 Boss（依 bossCount 縮放）。 */
  spawnBossAt(pos: Vec2): Entity { return spawnBoss(this, pos) }
  /** 生成終局 Boss（固定數值、不參與縮放）。 */
  spawnFinalBossAt(pos: Vec2): Entity { return spawnFinalBoss(this, pos) }
  /** 觸發一個地圖事件：依種類生成對應的一波敵人。 */
  triggerEvent(kind: GameEventKind): void { triggerGameEvent(this, kind) }

  /** 強制下一格立即開火（重置所有玩家所有武器計時）。 */
  forceFire(): void { for (const p of this.players) for (const w of p.weapons) w.cooldownTimer = 0 }

  /** 全部玩家的聖經環繞物（供 renderer）。 */
  orbits(): Entity[] { return this.players.flatMap((p) => p.orbitEntities) }

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

  /** 全部玩家皆不存活（alive 旗標全為 false）＝本局失敗。 */
  hasLost(): boolean { return this.players.every((p) => !p.alive) }

  /** 目前存活玩家（alive 旗標為 true），固定 index 升冪。 */
  livingPlayers(): PlayerState[] { return this.players.filter((p) => p.alive) }

  /** 離指定座標最近的存活玩家（無存活玩家時回 players[0]）。供 World 與 systems 使用。 */
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
   * @returns 指定玩家的大蒜場域半徑（已套乘區）；未持有大蒜則回 0。供 renderer 畫場域圓。
   * @param playerIndex 玩家索引（預設 0，向後相容單人）。
   */
  garlicRadius(playerIndex = 0): number {
    const p = this.players[playerIndex] ?? this.players[0]
    const weapons = p?.weapons ?? this.players[0].weapons
    const g = weapons.find((w) => w.kind === 'inflammation')
    if (!g) return 0
    const lvl = WEAPON_DEFS.inflammation.levels[g.level - 1]
    const stats = p?.stats ?? this.players[0].stats
    return (lvl.radius ?? 0) * stats.areaMult
  }

  /** 測試輔助：在指定位置放一顆經驗寶石（直接進 gemEntities，繞過擊殺流程）。 */
  spawnGemForTest(pos: Vec2, xp: number): Entity {
    const g = createGem(pos, xp)
    this.gemEntities.push(g)
    return g
  }

  /** 給予經驗值（相容 API），對 players[0] 加經驗。委派給 systems/playerProgress。 */
  grantXp(amount: number): void { grantXpTo(this, this.players[0], amount) }

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

  /**
   * 指定玩家目前的待選升級卡（多人非阻塞流程）；無則 null。
   * @param playerIndex 玩家索引。
   */
  pendingOfferFor(playerIndex: number): UpgradeDescriptor[] | null {
    const p = this.players[playerIndex]
    if (!p || !p.pendingOffer) return null
    return p.pendingOffer.map((o) => ({ id: o.id, label: o.label }))
  }

  /** 指定玩家待選的剩餘秒數（無待選回 0）。 */
  upgradeTimeRemaining(playerIndex: number): number {
    const p = this.players[playerIndex]
    return p && p.pendingOffer ? Math.max(0, p.upgradeTimer) : 0
  }

  /**
   * 玩家於逾時前選定一張待選升級：套用後清待選、扣一次 pendingLevelUps。
   * id 不在該玩家待選中則安靜略過。
   * @param playerIndex 玩家索引。
   * @param id 選定的升級卡 id。
   */
  chooseUpgrade(playerIndex: number, id: string): void {
    const p = this.players[playerIndex]
    if (!p || !p.pendingOffer) return
    const opt = p.pendingOffer.find((o) => o.id === id)
    if (!opt) return
    applyUpgradeById(opt.id, this.upgradeContextFor(p))
    p.pendingOffer = undefined
    p.pendingLevelUps -= 1
  }

  /**
   * 推進一格固定步長的模擬。systems 以固定順序執行，順序具語意（移動→生怪→敵人追擊
   * →開火→子彈飛行與命中→寶石吸取與拾取→敵人接觸傷害→篩除死亡 entity）。
   * @param dt 固定步長秒數（呼叫端固定傳入 1/60）。
   */
  step(dt: number): void {
    this.elapsed += dt

    // 1) 玩家移動：每位存活玩家依自己輸入位移、更新各自 lastMoveDir。
    for (const p of this.livingPlayers()) {
      p.entity.vel = { x: p.moveInput.x * p.stats.moveSpeed, y: p.moveInput.y * p.stats.moveSpeed }
      applyVelocity(p.entity, dt)
      if (p.moveInput.x !== 0 || p.moveInput.y !== 0) {
        const len = Math.hypot(p.moveInput.x, p.moveInput.y) || 1
        p.lastMoveDir = { x: p.moveInput.x / len, y: p.moveInput.y / len }
      }
    }

    // 2) 生怪：計時器歸零時，依目前時間決定下次間隔（難度曲線），並在玩家周圍隨機生一隻。
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = (spawnInterval(this.elapsed) * this.mapSpawnIntervalMult) / this.playerCount
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

    // 3) 敵人 AI：每隻朝最近的存活玩家轉向後位移。
    for (const e of this.enemies) {
      if (!e.active) continue
      if (e.affix === 'regen') {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * ELITE_AFFIX_DEFS.regen.regenPerSec * dt)
      }
      const target = this.nearestLivingPlayer(e.pos).entity
      steerEnemy(e, target.pos, dt)
      applyVelocity(e, dt)
      // 噴吐病原：固定間隔朝最近存活玩家當前位置吐一發毒液彈。
      if (e.enemyKind === 'spitter') {
        const spit = ENEMY_DEFS.spitter.spit!
        if (spitterTick(e, dt, spit.interval)) {
          const dx = target.pos.x - e.pos.x, dy = target.pos.y - e.pos.y
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

    // 4) 武器 + 4b) 聖經：每位存活玩家各自更新武器與環繞物（委派給 systems/weaponFiring）。
    updateWeapons(this, dt)

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
          if (e.hp <= 0) killEnemy(this, e)
          // 穿透：記下此敵，仍有 pierce 額度則續飛、否則消耗
          if (p.pierce && p.pierce > 0) { p.pierce -= 1; p.hitEnemies!.push(e) }
          else p.active = false
          break // 每幀單發最多命中一隻
        }
      }
    }

    // 5b) 敵方投射物：飛行 + 壽命；與存活玩家重疊即扣血（套該玩家護甲）後消耗。
    for (const proj of this.enemyProjectiles) {
      if (!proj.active) continue
      applyVelocity(proj, dt)
      proj.life -= dt
      if (proj.life <= 0) { proj.active = false; continue }
      for (const p of this.livingPlayers()) {
        if (circlesOverlap(proj, p.entity)) {
          p.entity.hp -= Math.max(0, proj.damage - p.stats.armor)
          this.soundEventQueue.push('hurt')
          proj.active = false
          break
        }
      }
    }

    // 6) 寶石：每顆找最近的存活玩家為吸引者，位移一次後若進入其半徑則由其收取。
    // vacuum 倒數逐玩家各自遞減；吸引者的 vacuum 狀態決定吸力參數。
    for (const p of this.livingPlayers()) {
      if (p.vacuumTimer > 0) p.vacuumTimer = Math.max(0, p.vacuumTimer - dt)
    }
    for (const g of this.gemEntities) {
      if (!g.active) continue
      const p = this.nearestLivingPlayer(g.pos)
      const vac = p.vacuumTimer > 0
      attractGem(g, p.entity.pos, vac ? Infinity : p.stats.pickupRadius, vac ? VACUUM_PULL_SPEED : GEM_PULL_SPEED)
      applyVelocity(g, dt)
      if (distance(g.pos, p.entity.pos) <= p.entity.radius) {
        g.active = false
        grantXpTo(this, p, g.xp * p.stats.xpGain)
        // 寶石收取不發音（每顆都響太頻繁）；heal/vacuum 撿取物仍有音效
      }
    }

    // 6b) 寶箱：吸取並位移；碰到最近玩家本體即收取並觸發一次免費升級（pendingLevelUps）。
    for (const c of this.chestEntities) {
      if (!c.active) continue
      const p = this.nearestLivingPlayer(c.pos)
      attractGem(c, p.entity.pos, p.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(c, dt)
      if (distance(c.pos, p.entity.pos) <= p.entity.radius) {
        c.active = false
        p.pendingLevelUps += 1
        this.soundEventQueue.push('chest')
      }
    }

    // 6c) 撿取物：吸取並位移；碰最近玩家本體即拾取並套用效果。
    for (const pk of this.pickupEntities) {
      if (!pk.active) continue
      const p = this.nearestLivingPlayer(pk.pos)
      attractGem(pk, p.entity.pos, p.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(pk, dt)
      if (distance(pk.pos, p.entity.pos) <= p.entity.radius) {
        pk.active = false
        applyPickupTo(this, p, pk.pickupKind!)
      }
    }

    // 7) 敵人接觸傷害：對每位存活玩家，與其重疊的敵人持續扣血（套該玩家護甲）。
    for (const p of this.livingPlayers()) {
      const contactCands = this.enemyGrid.queryRadius(p.entity.pos.x, p.entity.pos.y, p.entity.radius + MAX_ENEMY_RADIUS)
      for (const e of contactCands) {
        if (!e.active) continue
        if (circlesOverlap(e, p.entity)) {
          p.entity.hp -= Math.max(0, e.damage - p.stats.armor) * dt * 10
          this.soundEventQueue.push('hurt')
        }
      }
    }

    // 7b) 回復：每位玩家依即時 hp 與 regen 回血（夾 maxHp）。
    // 注意：此處不用 livingPlayers()（依上格 alive 旗標），而是用即時 hp > 0 守衛，
    // 以確保「接觸傷害將 hp 壓至 0 以下」的當格不被 regen 救回（N=1 等價紅線）。
    for (const p of this.players) {
      if (p.entity.hp > 0 && p.stats.regen > 0) {
        p.entity.hp = Math.min(p.entity.maxHp, p.entity.hp + p.stats.regen * dt)
      }
    }

    // 7c) 補漏殺：掃描所有 hp<=0 但尚未結算的敵人（含外部設值、接觸傷害等非武器路徑）。
    checkKills(this)

    // 7d) 同步玩家存活旗標（hp<=0 即觀戰，不再參與 living 計算）。
    for (const p of this.players) p.alive = p.entity.hp > 0

    // 7e) 多人非阻塞升級：產生待選/倒數/逾時自動選（單人 no-op）。
    processUpgrades(this, dt)

    // 8) 清理：本格結束後一次篩除所有死亡／失效的 entity。
    this.enemies = this.enemies.filter((e) => e.active)
    this.projectiles = this.projectiles.filter((p) => p.active)
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => p.active)
    this.gemEntities = this.gemEntities.filter((g) => g.active)
    this.chestEntities = this.chestEntities.filter((c) => c.active)
    this.pickupEntities = this.pickupEntities.filter((p) => p.active)
  }

  /** 重建敵人空間網格：清空後插入所有存活敵人（每格在敵人移動後呼叫）。 */
  private rebuildEnemyGrid(): void {
    this.enemyGrid.clear()
    for (const e of this.enemies) {
      if (e.active) this.enemyGrid.insert(e, e.pos.x, e.pos.y)
    }
  }

  /** @returns 玩家是否已死亡（players[0] hp <= 0）；N=1 行為與現況一致。 */
  isPlayerDead(): boolean {
    return this.players[0].entity.hp <= 0
  }

  /** @returns 是否已通關（擊敗終局 Boss）。 */
  hasWon(): boolean {
    return this.won
  }

  /**
   * 產生目前持有的武器/被動快照（純資料），供升級彈窗顯示。
   * @param playerIndex 玩家索引（預設 0，單人用）；超越範圍則回到 players[0]。
   * @returns weapons（kind/level/evolved）與 passives（kind/level）的快照。
   */
  loadoutSnapshot(playerIndex = 0): LoadoutSnapshot {
    const p = this.players[playerIndex] ?? this.players[0]
    return {
      weapons: p.weapons.map((w) => ({ kind: w.kind, level: w.level, evolved: !!w.evolved })),
      passives: p.passives.map((ps) => ({ kind: ps.kind, level: ps.level })),
    }
  }

  /**
   * 規範化模擬狀態的確定性雜湊（供回放確定性測試與未來連線 desync 偵測）。
   * 以固定順序餵入標量、各玩家、各敵人與各類實體計數；唯讀、不改狀態。
   */
  checksum(): number {
    const c = new Checksum()
    c.add(this.elapsed)
    c.addInt(this.playerCount)
    c.addInt(this.bossCount)
    c.addInt(this.finalBossSpawned ? 1 : 0)
    c.addInt(this.won ? 1 : 0)
    c.add(this.spawnTimer); c.add(this.bossTimer); c.add(this.eventTimer)
    for (const p of this.players) {
      c.add(p.entity.pos.x); c.add(p.entity.pos.y)
      c.add(p.entity.hp); c.add(p.entity.maxHp)
      c.addInt(p.level); c.add(p.xp); c.addInt(p.pendingLevelUps); c.addInt(p.alive ? 1 : 0)
      c.addInt(p.weapons.length)
      for (const w of p.weapons) {
        c.addInt(WEAPON_ORDER.indexOf(w.kind)); c.addInt(w.level); c.addInt(w.evolved ? 1 : 0)
      }
      c.addInt(p.passives.length)
      for (const ps of p.passives) {
        c.addInt(PASSIVE_ORDER.indexOf(ps.kind)); c.addInt(ps.level)
      }
    }
    c.addInt(this.enemies.length)
    for (const e of this.enemies) {
      c.add(e.pos.x); c.add(e.pos.y); c.add(e.hp)
      c.addInt(e.enemyKind ? ENEMY_ORDER.indexOf(e.enemyKind) : -1)
      c.addInt(e.affix ? ELITE_AFFIX_ORDER.indexOf(e.affix) : -1)
    }
    c.addInt(this.projectiles.length)
    c.addInt(this.enemyProjectiles.length)
    c.addInt(this.chestEntities.length)
    c.addInt(this.pickupEntities.length)
    c.addInt(this.gemEntities.length)
    let gemXp = 0
    for (const g of this.gemEntities) gemXp += g.xp
    c.add(gemXp)
    return c.value()
  }

  /**
   * 產生供 UI 顯示的唯讀摘要快照（HUD 需要的最小資料集）。
   * @param playerIndex 玩家索引（預設 0，單人用）；超越範圍則回到 players[0]。
   * @returns 經四捨五入／取整的 `Summary`，由上層轉交給 store。
   */
  summary(playerIndex = 0): Summary {
    const p = this.players[playerIndex] ?? this.players[0]
    const boss = this.enemies.find((e) => e.active && (e.enemyKind === 'superbug' || e.enemyKind === 'finalboss'))
    return {
      hp: Math.max(0, Math.round(p.entity.hp)),
      maxHp: p.entity.maxHp,
      time: Math.floor(this.elapsed),
      level: p.level,
      kills: this.kills,
      xp: p.xp,
      xpNeeded: xpForLevel(p.level),
      bossActive: !!boss,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      isFinalBoss: boss?.enemyKind === 'finalboss',
      eventWarning: this.eventWarning,
    }
  }
}
