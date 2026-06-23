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
import type { Entity, PlayerStats } from './types'
import type { Vec2 } from './core/vector'
import { distance } from './core/vector'
import { createRng, type Rng } from './core/rng'
import { createPlayer, createEnemy, createProjectile, createGem } from './entities/factory'
import { applyVelocity, steerTowards } from './systems/movement'
import { spawnInterval, spawnPositionAround } from './systems/spawn'
import { findNearest } from './systems/combat'
import { circlesOverlap } from './systems/collision'
import { attractGem } from './systems/pickup'
import { xpForLevel, ALL_UPGRADES } from './systems/leveling'
import type { Summary } from '../stores/game'

/** 敵人生成的距離：在玩家周圍此半徑的圓上隨機生怪（畫面外）。 */
const SPAWN_RADIUS = 700
/** 寶石進入感應範圍後，朝玩家飛行的吸取速度。 */
const GEM_PULL_SPEED = 350

export class World {
  /** 玩家 entity（永遠存在，不會被篩除）。 */
  player: Entity
  /** 場上所有敵人（含本格剛死、待篩除者）。 */
  enemies: Entity[] = []
  /** 場上所有 projectile（含本格剛失效、待篩除者）。 */
  projectiles: Entity[] = []
  /** 場上所有經驗寶石。 */
  gemEntities: Entity[] = []

  /** 玩家數值，會被升級就地修改。 */
  stats: PlayerStats = {
    moveSpeed: 200,
    fireCooldown: 0.5,
    projectileDamage: 5,
    projectileSpeed: 400,
    pickupRadius: 120,
  }

  /** 由上層每格寫入的玩家移動方向（已正規化的 -1..1 向量）。 */
  moveInput: Vec2 = { x: 0, y: 0 }

  /** 確定性亂數來源（seeded）；模擬內所有隨機都走這裡。 */
  private rng: Rng
  /** 累積遊戲時間（秒）。 */
  private elapsed = 0
  /** 生怪倒數計時器（秒）；歸零即生怪並重置。 */
  private spawnTimer = 0
  /** 開火倒數計時器（秒）；歸零即嘗試開火並重置為 `fireCooldown`。 */
  private fireTimer = 0
  /** 目前等級。 */
  private level = 1
  /** 目前等級內已累積的經驗值。 */
  private xp = 0
  /** 累計擊殺數。 */
  private kills = 0
  /** 尚未處理的升級次數；由上層逐一 `consumeLevelUp()` 取走以觸發升級握手。 */
  private pendingLevelUps = 0

  /**
   * @param seed 本場的亂數種子，決定生怪位置等隨機序列（可重現）。
   */
  constructor(seed: number) {
    this.rng = createRng(seed)
    this.player = createPlayer({ x: 0, y: 0 })
  }

  /** @returns 目前存活的敵人（過濾掉 `active === false`）。 */
  activeEnemies(): Entity[] {
    return this.enemies.filter((e) => e.active)
  }
  /** @returns 所有寶石 entity。 */
  gems(): Entity[] {
    return this.gemEntities
  }

  /**
   * 在指定位置生成一隻敵人並加入場上。
   * @param pos 生成位置。
   * @returns 新建立的敵人 entity。
   */
  spawnEnemyAt(pos: Vec2): Entity {
    const e = createEnemy(pos)
    this.enemies.push(e)
    return e
  }

  /** 強制下一格立即開火（重置開火計時器）。 */
  forceFire(): void {
    this.fireTimer = 0
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
   * 套用指定 id 的升級效果到玩家數值（升級握手的最後一步）。
   * @param id 升級選項 id；找不到時安靜略過。
   */
  applyUpgrade(id: string): void {
    const up = ALL_UPGRADES.find((u) => u.id === id)
    up?.apply(this.stats)
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

    // 2) 生怪：計時器歸零時，依目前時間決定下次間隔（難度曲線），並在玩家周圍隨機生一隻。
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed)
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnEnemyAt(pos)
    }

    // 3) 敵人 AI：每隻朝玩家轉向後位移。
    for (const e of this.enemies) {
      if (!e.active) continue
      steerTowards(e, this.player.pos)
      applyVelocity(e, dt)
    }

    // 4) 自動開火：冷卻歸零時鎖定最近敵人，朝其方向發射一發 projectile。
    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      const target = findNearest(this.player.pos, this.enemies)
      if (target) {
        this.fireTimer = this.stats.fireCooldown
        const dir = {
          x: target.pos.x - this.player.pos.x,
          y: target.pos.y - this.player.pos.y,
        }
        // 正規化方向；`|| 1` 防止與玩家重疊時除以零。
        const len = Math.hypot(dir.x, dir.y) || 1
        const proj = createProjectile(
          this.player.pos,
          { x: dir.x / len, y: dir.y / len },
          this.stats.projectileSpeed,
          this.stats.projectileDamage,
        )
        this.projectiles.push(proj)
      }
    }

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
      for (const e of this.enemies) {
        if (!e.active) continue
        if (circlesOverlap(p, e)) {
          e.hp -= p.damage
          p.active = false // 子彈單體命中即消耗
          if (e.hp <= 0) {
            e.active = false
            this.kills += 1
            const gem = createGem(e.pos, e.xp)
            this.gemEntities.push(gem)
          }
          break // 一發子彈只命中一隻敵人
        }
      }
    }

    // 6) 寶石：進入感應半徑後朝玩家吸取並位移；碰到玩家本體即拾取並給經驗。
    for (const g of this.gemEntities) {
      if (!g.active) continue
      attractGem(g, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(g, dt)
      if (distance(g.pos, this.player.pos) <= this.player.radius) {
        g.active = false
        this.grantXp(g.xp)
      }
    }

    // 7) 敵人接觸傷害：與玩家重疊時持續扣血（乘 dt*10 換算成每秒傷害）。
    for (const e of this.enemies) {
      if (!e.active) continue
      if (circlesOverlap(e, this.player)) {
        this.player.hp -= e.damage * dt * 10
      }
    }

    // 8) 清理：本格結束後一次篩除所有死亡／失效的 entity。
    this.enemies = this.enemies.filter((e) => e.active)
    this.projectiles = this.projectiles.filter((p) => p.active)
    this.gemEntities = this.gemEntities.filter((g) => g.active)
  }

  /** @returns 玩家是否已死亡（hp <= 0）。 */
  isPlayerDead(): boolean {
    return this.player.hp <= 0
  }

  /**
   * 產生供 UI 顯示的唯讀摘要快照（HUD 需要的最小資料集）。
   * @returns 經四捨五入／取整的 `Summary`，由上層轉交給 store。
   */
  summary(): Summary {
    return {
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      time: Math.floor(this.elapsed),
      level: this.level,
      kills: this.kills,
      xp: this.xp,
      xpNeeded: xpForLevel(this.level),
    }
  }
}
