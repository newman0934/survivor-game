import { describe, it, expect } from 'vitest'
import { World } from './World'
import { xpForLevel } from './systems/leveling'

describe('World', () => {
  it('starts with one player and no enemies', () => {
    const w = new World(1)
    expect(w.player.kind).toBe('player')
    expect(w.activeEnemies().length).toBe(0)
  })

  it('Boss 生成發出 boss 事件', () => {
    const w = new World(1)
    w.spawnBossAt({ x: 50, y: 0 })
    expect(w.consumeSoundEvents()).toContain('boss')
  })

  it('擊殺敵人發出 kill 事件', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 60, y: 0 }, 'virus')
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(w.consumeSoundEvents()).toContain('kill')
  })

  it('升級發出 levelup 事件', () => {
    const w = new World(1)
    w.grantXp(xpForLevel(1))
    expect(w.consumeSoundEvents()).toContain('levelup')
  })

  it('consumeSoundEvents 回傳後清空', () => {
    const w = new World(1)
    w.spawnBossAt({ x: 0, y: 0 })
    expect(w.consumeSoundEvents().length).toBeGreaterThan(0)
    expect(w.consumeSoundEvents()).toEqual([])
  })

  it('擊殺 Boss 掉落寶箱', () => {
    const w = new World(1)
    w.stats.pickupRadius = 0 // 避免寶箱/寶石被吸走，便於觀察
    const b = w.spawnBossAt({ x: w.player.pos.x + 50, y: w.player.pos.y })
    b.hp = 1
    w.forceFire()
    for (let i = 0; i < 40; i++) w.step(1 / 60)
    expect(b.active).toBe(false)
    expect(w.chests().length).toBeGreaterThan(0)
  })

  it('一般敵人死亡不掉寶箱', () => {
    const w = new World(1)
    w.stats.pickupRadius = 0
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 50, y: w.player.pos.y }, 'virus')
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 40; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.chests().length).toBe(0)
    expect(w.gems().length).toBeGreaterThan(0)
  })

  it('撿取寶箱觸發一次待處理升級', () => {
    const w = new World(1)
    w.stats.pickupRadius = 0
    const b = w.spawnBossAt({ x: w.player.pos.x + 50, y: w.player.pos.y })
    b.hp = 1
    w.forceFire()
    for (let i = 0; i < 40; i++) w.step(1 / 60)
    const c = w.chests()[0]
    expect(c).toBeDefined()
    c.pos = { x: w.player.pos.x, y: w.player.pos.y } // 把寶箱搬到玩家身上
    w.step(1 / 60) // 拾取
    expect(w.consumeLevelUp()).toBe(true)
  })

  it('胃地圖：敵人 hp ×1.25、視覺欄位正確', () => {
    const w = new World(1, 'macrophage', 'stomach')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBeCloseTo(10 * 1.25, 5) // basic 基礎 hp 10
    expect(e.maxHp).toBeCloseTo(10 * 1.25, 5)
    expect(w.mapBgColor).toBe(0x1a0a0a)
    expect(w.mapGridColor).toBe(0xff7043)
  })

  it('肺泡地圖：敵人 hp ×0.9', () => {
    const w = new World(1, 'macrophage', 'lung')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBeCloseTo(10 * 0.9, 5)
  })

  it('胃 Boss hp 疊乘地圖倍率', () => {
    const w = new World(1, 'macrophage', 'stomach')
    const b = w.spawnBossAt({ x: 100, y: 0 })
    expect(b.maxHp).toBeCloseTo(220 * 1 * 1.25, 5) // 第一隻 boss：220×1×1.25
  })

  it('省略地圖預設血管（倍率皆 1、視覺同現況）', () => {
    const w = new World(1, 'macrophage')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBe(10)
    expect(w.mapBgColor).toBe(0x0c0c12)
  })

  it('預設角色為巨噬細胞（macrophage）起始狀態', () => {
    const w = new World(1)
    expect(w.weapons[0].kind).toBe('antibody')
    expect(w.player.maxHp).toBe(140)
    expect(w.player.hp).toBe(140)
    expect(w.stats.armor).toBeGreaterThan(0)
  })

  it('嗜中性球起始：飛刀、高移速、薄血、顏色', () => {
    const w = new World(1, 'neutrophil')
    expect(w.weapons[0].kind).toBe('perforin')
    expect(w.stats.moveSpeed).toBe(240)
    expect(w.player.maxHp).toBe(80)
    expect(w.playerColor).toBe(0x6bff8c)
  })

  it('NK 細胞起始：聖經、高傷害乘區', () => {
    const w = new World(1, 'nkcell')
    expect(w.weapons[0].kind).toBe('complement')
    expect(w.stats.damageMult).toBeCloseTo(1.25, 5)
  })

  it('樹突細胞起始：大蒜 + 記憶細胞被動（xpGain>1）', () => {
    const w = new World(1, 'dendritic')
    expect(w.weapons[0].kind).toBe('inflammation')
    expect(w.passives.some((p) => p.kind === 'crown')).toBe(true)
    expect(w.stats.xpGain).toBeGreaterThan(1)
  })

  it('生怪會帶 enemyKind', () => {
    const w = new World(1)
    for (let i = 0; i < 180; i++) w.step(1 / 60)
    const kinds = w.activeEnemies().map((e) => e.enemyKind)
    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((k) => k !== undefined)).toBe(true)
  })

  it('spawnSwarmAt 一次生成 4 隻 swarm', () => {
    const w = new World(1)
    const before = w.enemies.length
    w.spawnSwarmAt({ x: 100, y: 0 })
    expect(w.enemies.length - before).toBe(4)
    expect(w.enemies.slice(-4).every((e) => e.enemyKind === 'bacteria')).toBe(true)
  })

  it('spawnBossAt 生成一隻 boss', () => {
    const w = new World(1)
    const b = w.spawnBossAt({ x: 100, y: 0 })
    expect(b.enemyKind).toBe('superbug')
    expect(w.enemies.includes(b)).toBe(true)
  })

  it('第二隻 Boss 的 maxHp 大於第一隻（隨 bossCount 成長）', () => {
    const w = new World(1)
    const b1 = w.spawnBossAt({ x: 100, y: 0 })
    const b2 = w.spawnBossAt({ x: 100, y: 0 })
    expect(b2.maxHp).toBeGreaterThan(b1.maxHp)
  })

  it('Boss 於 60s 里程碑出現', () => {
    const w = new World(1)
    for (let i = 0; i < 61 * 60; i++) w.step(1 / 60)
    expect(w.enemies.some((e) => e.enemyKind === 'superbug')).toBe(true)
  })

  it('summary 在有 Boss 時回報血條資料、無 Boss 時歸零', () => {
    const w = new World(1)
    expect(w.summary().bossActive).toBe(false)
    expect(w.summary().bossHp).toBe(0)
    const b = w.spawnBossAt({ x: 100, y: 0 })
    const s = w.summary()
    expect(s.bossActive).toBe(true)
    expect(s.bossHp).toBe(Math.round(b.hp))
    expect(s.bossMaxHp).toBe(b.maxHp)
  })

  it('spawns enemies over time', () => {
    const w = new World(1)
    for (let i = 0; i < 180; i++) w.step(1 / 60)
    expect(w.activeEnemies().length).toBeGreaterThan(0)
  })

  it('player takes damage when an enemy is in contact', () => {
    const w = new World(1)
    const startHp = w.player.hp
    const e = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y })
    w.step(1 / 60)
    expect(w.player.hp).toBeLessThan(startHp)
    expect(e).toBeDefined()
  })

  it('a projectile kills an enemy and drops a gem', () => {
    const w = new World(1)
    // Disable gem attraction so the dropped gem stays put and is observable;
    // otherwise it would be pulled into the player and collected within the loop.
    w.stats.pickupRadius = 0
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 30, y: w.player.pos.y })
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.gems().length).toBeGreaterThan(0)
  })

  it('collecting enough xp raises the pending level-up flag', () => {
    const w = new World(1)
    w.grantXp(w.summary().xpNeeded)
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(false)
  })

  it('regen 每格回血但不超過 maxHp', () => {
    const w = new World(1)
    w.stats.regen = 60 // 大量回血以便觀察
    w.player.hp = 50
    w.step(1 / 60)
    expect(w.player.hp).toBeGreaterThan(50)
    w.player.hp = w.player.maxHp
    w.step(1 / 60)
    expect(w.player.hp).toBe(w.player.maxHp) // 不溢出
  })

  it('armor 降低接觸傷害', () => {
    const w = new World(1)
    w.stats.armor = 100 // 遠大於敵人傷害 → 接觸傷害歸零
    const e = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y })
    const hp0 = w.player.hp
    w.step(1 / 60)
    expect(w.player.hp).toBe(hp0)
    expect(e).toBeDefined()
  })

  it('upgradeContext 提供 passives 與 player', () => {
    const w = new World(1)
    const ctx = w.upgradeContext()
    expect(Array.isArray(ctx.passives)).toBe(true)
    expect(ctx.player).toBe(w.player)
  })

  it('接觸傷害只對與玩家重疊的敵人生效（網格候選正確）', () => {
    const w = new World(1)
    const near = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y }) // 與玩家重疊
    const far = w.spawnEnemyAt({ x: w.player.pos.x + 800, y: w.player.pos.y })
    const farHp0 = far.hp
    const playerHp0 = w.player.hp
    w.step(1 / 60)
    expect(w.player.hp).toBeLessThan(playerHp0) // 受重疊敵人傷害
    expect(far.hp).toBe(farHp0) // 遠方敵人不被牽涉
    expect(near).toBeDefined()
  })

  it('大蒜只傷害半徑內敵人（網格候選正確）', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:inflammation')
    const inside = w.spawnEnemyAt({ x: 20, y: 0 })
    const outside = w.spawnEnemyAt({ x: 800, y: 0 })
    const insideHp0 = inside.hp
    const outsideHp0 = outside.hp
    w.step(1 / 60)
    expect(inside.hp).toBeLessThan(insideHp0)
    expect(outside.hp).toBe(outsideHp0)
  })

  it('網格不改變確定性：相同 seed 相同結果', () => {
    const run = () => {
      const w = new World(42)
      for (let i = 0; i < 600; i++) w.step(1 / 60)
      const s = w.summary()
      return { kills: s.kills, hp: s.hp }
    }
    expect(run()).toEqual(run())
  })

  it('applyUpgrade 解鎖被動道具並套用其效果', () => {
    const w = new World(1)
    const before = w.stats.damageMult
    w.applyUpgrade('passunlock:spinach')
    expect(w.passives.find((p) => p.kind === 'spinach')?.level).toBe(1)
    expect(w.stats.damageMult).toBeGreaterThan(before)
  })

  it('起始只持有魔杖', () => {
    const w = new World(1)
    expect(w.weapons.map((x) => x.kind)).toEqual(['antibody'])
  })

  it('套用 unlock 後新增武器並共存', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:perforin')
    expect(w.weapons.map((x) => x.kind).sort()).toEqual(['antibody', 'perforin'])
  })

  it('魔杖在有敵人時會產生投射物', () => {
    const w = new World(1)
    // 敵人放遠，讓投射物在數步內仍在飛行（避免命中後被清除導致誤判）。
    w.spawnEnemyAt({ x: 300, y: 0 })
    for (let i = 0; i < 5; i++) w.step(1 / 60)
    expect(w.projectiles.length).toBeGreaterThan(0)
  })

  it('大蒜對靠近的敵人造成傷害', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:inflammation')
    const e = w.spawnEnemyAt({ x: 20, y: 0 }) // 在大蒜半徑內
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
  })

  it('持有聖經時 orbits 數量等於聖經等級的 count', () => {
    const w = new World(1)
    w.applyUpgrade('unlock:complement') // Lv1 → count 1
    w.step(1 / 60)
    expect(w.orbits().length).toBe(1)
  })

  it('isPlayerDead reflects player hp dropping to zero', () => {
    const w = new World(1)
    expect(w.isPlayerDead()).toBe(false)
    w.player.hp = 0
    expect(w.isPlayerDead()).toBe(true)
  })

  it('consumeLevelUp returns true once per level gained when several happen at once', () => {
    const w = new World(1)
    // Grant enough xp to cross two level thresholds in a single call.
    w.grantXp(xpForLevel(1) + xpForLevel(2))
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(false)
  })
})
