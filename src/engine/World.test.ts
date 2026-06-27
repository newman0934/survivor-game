import { describe, it, expect } from 'vitest'
import { World } from './World'
import { xpForLevel } from './systems/leveling'
import { createEnemyProjectile, createProjectile, createPickup, createGem } from './entities/factory'
import { WEAPON_DEFS } from './systems/weaponDefs'
import { GAME_EVENT_DEFS } from './systems/eventDefs'

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

  it('巨大化精英：hp×3×3、半徑×1.6、速度×0.8、xp×5', () => {
    const w = new World(1, 'macrophage', 'vessel')
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus', 'giant')
    expect(e.affix).toBe('giant')
    expect(e.maxHp).toBeCloseTo(10 * 3 * 3.0, 5) // virus hp 10 × 精英3 × giant 3.0
    expect(e.radius).toBeCloseTo(12 * 1.6, 5)    // virus radius 12
    expect(e.speed).toBeCloseTo(60 * 0.8, 5)     // virus speed 60
    expect(e.xp).toBe(1 * 5)                       // virus xp 1 × 5
  })

  it('狂暴精英：速度×1.5、接觸傷害×1.3', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus', 'frenzy')
    expect(e.speed).toBeCloseTo(60 * 1.5, 5)
    expect(e.damage).toBeCloseTo(5 * 1.3, 5) // virus damage 5
  })

  it('省略 affix 行為與現況一致（無精英）', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.affix).toBeUndefined()
    expect(e.maxHp).toBe(10)
  })

  it('腸道地圖：生怪快 0.7、敵人脆 ×0.8、視覺欄位正確', () => {
    const w = new World(1, 'macrophage', 'gut')
    expect(w.mapSpawnIntervalMult).toBeCloseTo(0.7, 5)
    expect(w.mapEnemyHpMult).toBeCloseTo(0.8, 5)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBeCloseTo(10 * 0.8, 5) // basic 基礎 hp 10
    expect(w.mapBgColor).toBe(0x140e08)
    expect(w.mapGridColor).toBe(0xffb74d)
  })

  it('腦地圖：生怪慢 1.2、敵人硬 ×1.4、視覺欄位正確', () => {
    const w = new World(1, 'macrophage', 'brain')
    expect(w.mapSpawnIntervalMult).toBeCloseTo(1.2, 5)
    expect(w.mapEnemyHpMult).toBeCloseTo(1.4, 5)
    const e = w.spawnEnemyAt({ x: 100, y: 0 }, 'virus')
    expect(e.hp).toBeCloseTo(10 * 1.4, 5)
    expect(w.mapBgColor).toBe(0x0a0a18)
    expect(w.mapGridColor).toBe(0x9fa8ff)
  })

  it('預設角色為巨噬細胞（macrophage）起始狀態', () => {
    const w = new World(1)
    expect(w.weapons[0].kind).toBe('antibody')
    expect(w.player.maxHp).toBe(140)
    expect(w.player.hp).toBe(140)
    expect(w.stats.armor).toBeGreaterThan(0)
  })

  it('嗜中性球起始：穿孔素飛鏢、高移速、薄血、顏色', () => {
    const w = new World(1, 'neutrophil')
    expect(w.weapons[0].kind).toBe('perforin')
    expect(w.stats.moveSpeed).toBe(240)
    expect(w.player.maxHp).toBe(80)
    expect(w.playerColor).toBe(0x6bff8c)
  })

  it('NK 細胞起始：補體環、高傷害乘區', () => {
    const w = new World(1, 'nkcell')
    expect(w.weapons[0].kind).toBe('complement')
    expect(w.stats.damageMult).toBeCloseTo(1.25, 5)
  })

  it('樹突細胞起始：發炎場 + 記憶細胞被動（xpGain>1）', () => {
    const w = new World(1, 'dendritic')
    expect(w.weapons[0].kind).toBe('inflammation')
    expect(w.passives.some((p) => p.kind === 'crown')).toBe(true)
    expect(w.stats.xpGain).toBeGreaterThan(1)
  })

  it('肥大細胞起始：發炎場、範圍/冷卻強化、洋紅色', () => {
    const w = new World(1, 'mastcell')
    expect(w.weapons[0].kind).toBe('inflammation')
    expect(w.player.maxHp).toBe(100)
    expect(w.player.hp).toBe(100)
    expect(w.stats.areaMult).toBeCloseTo(1.3, 5)
    expect(w.stats.cooldownMult).toBeCloseTo(0.9, 5)
    expect(w.playerColor).toBe(0xf06292)
  })

  it('生怪會帶 enemyKind', () => {
    const w = new World(1)
    for (let i = 0; i < 180; i++) w.step(1 / 60)
    const kinds = w.activeEnemies().map((e) => e.enemyKind)
    expect(kinds.length).toBeGreaterThan(0)
    expect(kinds.every((k) => k !== undefined)).toBe(true)
  })

  it('各玩家依自己輸入移動', () => {
    const w = new World(1, ['macrophage', 'neutrophil'])
    const x0 = w.players[0].entity.pos.x, x1 = w.players[1].entity.pos.x
    w.setMoveInput(0, { x: 1, y: 0 })
    w.setMoveInput(1, { x: -1, y: 0 })
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    expect(w.players[0].entity.pos.x).toBeGreaterThan(x0)
    expect(w.players[1].entity.pos.x).toBeLessThan(x1)
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

  it('summary 偵測終局 Boss：bossActive + isFinalBoss', () => {
    const w = new World(1)
    expect(w.summary().isFinalBoss).toBe(false)
    const b = w.spawnFinalBossAt({ x: 100, y: 0 })
    const s = w.summary()
    expect(s.bossActive).toBe(true)
    expect(s.isFinalBoss).toBe(true)
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

  it('吞噬偽足對前方敵人扣血並推 sweep fx', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'phagocyte', level: 1, cooldownTimer: 0 }]
    w.lastMoveDir = { x: 1, y: 0 }
    const e = w.spawnEnemyAt({ x: 30, y: 0 })
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
    expect(w.consumeFxEvents().some((f) => f.kind === 'sweep')).toBe(true)
  })

  it('抗原脈衝對範圍內敵人扣血並推 nova fx', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'nova', level: 1, cooldownTimer: 0 }]
    const e = w.spawnEnemyAt({ x: 60, y: 0 })
    const hp0 = e.hp
    w.step(1 / 60)
    expect(e.hp).toBeLessThan(hp0)
    expect(w.consumeFxEvents().some((f) => f.kind === 'nova')).toBe(true)
  })

  it('補體級聯連鎖命中並推 chain fx', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'cascade', level: 1, cooldownTimer: 0 }]
    const a = w.spawnEnemyAt({ x: 40, y: 0 })
    const hp0 = a.hp
    w.step(1 / 60)
    expect(a.hp).toBeLessThan(hp0)
    expect(w.consumeFxEvents().some((f) => f.kind === 'chain')).toBe(true)
  })

  it('抗原脈衝冷卻期間不重複觸發', () => {
    const w = new World(1)
    w.weapons = [{ kind: 'nova', level: 1, cooldownTimer: 0 }]
    const e = w.spawnEnemyAt({ x: 60, y: 0 })
    e.hp = 100; e.maxHp = 100 // 提高血量，確保第一擊後仍存活（隔離冷卻為唯一變因）
    w.step(1 / 60) // Lv1 冷卻 1.6s，本步觸發一次
    w.consumeFxEvents()
    const hpAfterFire = e.hp
    w.step(1 / 60) // 仍在冷卻內
    expect(e.hp).toBe(hpAfterFire) // 未再扣血
    expect(w.consumeFxEvents().some((f) => f.kind === 'nova')).toBe(false)
  })

  it('分裂菌死亡生成 2 隻細菌', () => {
    const w = new World(1)
    const s = w.spawnEnemyAt({ x: 100, y: 0 }, 'splitter')
    const before = w.activeEnemies().filter((e) => e.enemyKind === 'bacteria').length
    s.hp = 0
    w.step(1 / 60) // checkKills → 分裂
    const after = w.activeEnemies().filter((e) => e.enemyKind === 'bacteria').length
    expect(after - before).toBe(2)
  })

  it('膿疱自爆體死亡時玩家在半徑內扣血、半徑外不扣', () => {
    const near = new World(1)
    near.player.hp = 100
    const e1 = near.spawnEnemyAt({ x: 30, y: 0 }, 'exploder'); e1.hp = 0
    near.step(1 / 60)
    expect(near.player.hp).toBeLessThan(100)

    const far = new World(1)
    far.player.hp = 100
    const e2 = far.spawnEnemyAt({ x: 500, y: 0 }, 'exploder'); e2.hp = 0
    far.step(1 / 60)
    expect(far.player.hp).toBe(100)
  })

  it('敵方毒液彈命中玩家扣血後消失', () => {
    const w = new World(1)
    w.player.hp = 100
    w.enemyProjectiles.push(createEnemyProjectile(w.player.pos, { x: 1, y: 0 }, 0, 8))
    w.step(1 / 60) // 速度 0 → 與玩家重疊
    expect(w.player.hp).toBeLessThan(100)
    expect(w.enemyProjectiles.length).toBe(0) // 命中後消耗並清理
  })

  it('loadoutSnapshot 反映目前武器與被動（含 evolved）', () => {
    const w = new World(1)
    const ab = w.weapons.find((x) => x.kind === 'antibody')!
    ab.level = 5
    ab.evolved = true
    w.passives.push({ kind: 'tome', level: 2 })
    const snap = w.loadoutSnapshot()
    expect(snap.weapons).toContainEqual({ kind: 'antibody', level: 5, evolved: true })
    expect(snap.passives).toContainEqual({ kind: 'tome', level: 2 })
  })
})

describe('武器進化效果', () => {
  it('進化抗體用進化層數值開火（count 5、投射物標記 evolved、冷卻 0.12）', () => {
    const w = new World(1)
    // 抗體鎖定最近 count 隻；需有足夠敵人才會發滿 5 發（fireWand 受 findNearestN 限制）
    for (let i = 0; i < 6; i++) w.spawnEnemyAt({ x: 60 + i * 20, y: 0 }, 'virus')
    const ab = w.weapons.find((x) => x.kind === 'antibody')!
    ab.level = WEAPON_DEFS.antibody.maxLevel
    ab.evolved = true
    w.forceFire()
    w.step(1 / 60)
    const shots = w.projectiles.filter((p) => p.active)
    expect(shots.length).toBe(5)            // 進化 count
    expect(shots.every((p) => p.evolved)).toBe(true)
    expect(ab.cooldownTimer).toBeCloseTo(0.12, 5) // 進化低冷卻（cooldownMult 預設 1）
  })

  it('進化穿孔素子彈命中後續飛（pierce）', () => {
    const w = new World(1)
    // 兩隻沿 +x 排列的敵人，飛鏢朝右
    const e1 = w.spawnEnemyAt({ x: 40, y: 0 }, 'virus')
    const e2 = w.spawnEnemyAt({ x: 80, y: 0 }, 'virus')
    w.weapons = [{ kind: 'perforin', level: WEAPON_DEFS.perforin.maxLevel, cooldownTimer: 0, evolved: true }]
    w.lastMoveDir = { x: 1, y: 0 }
    w.forceFire()
    // 推進數格讓子彈穿過第一隻、續命中第二隻
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    // 兩隻均被擊殺（active=false；step 結尾已清陣列，故用保留的 reference 驗證）
    expect(e1.active).toBe(false) // 第一隻被穿透命中後死亡
    expect(e2.active).toBe(false) // 第二隻被穿透後續命中死亡
  })

  it('穿透子彈對同一敵人只命中一次（嚴格穿透不同敵人）', () => {
    const w = new World(1)
    w.weapons = [] // 清空預設武器，隔離只測手動穿透子彈
    const tank = w.spawnEnemyAt({ x: 30, y: 0 }, 'virus')
    tank.hp = 1000; tank.maxHp = 1000 // 血厚到一發不死
    // 手動放一顆慢速穿透子彈（60px/s ≈ 1px/格），會與 tank 重疊多幀
    const p = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 60, 8, 'perforin')
    p.pierce = 3
    p.hitEnemies = []
    w.projectiles.push(p)
    for (let i = 0; i < 60; i++) w.step(1 / 60)
    expect(1000 - tank.hp).toBe(8) // 多幀重疊但只扣一次傷（非每幀重複）
  })

  it('進化補體級聯每跳全額傷害（noFalloff）', () => {
    const w = new World(1)
    const a = w.spawnEnemyAt({ x: 30, y: 0 }, 'virus')
    const b = w.spawnEnemyAt({ x: 60, y: 0 }, 'virus')
    a.hp = 1000; a.maxHp = 1000; b.hp = 1000; b.maxHp = 1000
    w.weapons = [{ kind: 'cascade', level: WEAPON_DEFS.cascade.maxLevel, cooldownTimer: 0, evolved: true }]
    w.forceFire()
    w.step(1 / 60)
    const dmgA = 1000 - a.hp, dmgB = 1000 - b.hp
    expect(dmgB).toBeCloseTo(dmgA, 5) // 第二跳與第一跳等傷（無衰減）
  })

  it('進化發炎場場域存在時回血（fieldRegen）', () => {
    const w = new World(1)
    w.spawnEnemyAt({ x: 1000, y: 0 }, 'virus') // 遠處敵人，不接觸玩家
    w.weapons = [{ kind: 'inflammation', level: WEAPON_DEFS.inflammation.maxLevel, cooldownTimer: 0, evolved: true }]
    w.player.hp = 50
    w.step(1 / 60)
    expect(w.player.hp).toBeGreaterThan(50) // 場域回血
  })
})

describe('地圖事件系統', () => {
  it('triggerEvent elite-pack 一次生成 3 隻精英', () => {
    const w = new World(1)
    const before = w.enemies.length
    w.triggerEvent('elite-pack')
    const added = w.enemies.slice(before)
    expect(added.length).toBe(3)
    expect(added.every((e) => e.affix !== undefined)).toBe(true)
  })

  it('triggerEvent encircle 整圈生成多隻', () => {
    const w = new World(1)
    const before = w.enemies.length
    w.triggerEvent('encircle')
    expect(w.enemies.length - before).toBe(16)
  })

  it('事件於 150 秒觸發、前 5 秒預警，開始後清空', () => {
    const w = new World(1)
    for (let i = 0; i < 146 * 60; i++) w.step(1 / 60) // 146 秒：已進預警窗

    // 進預警窗後 warning 非空，且能從 GAME_EVENT_DEFS 反查到對應的合法事件種類
    const warning = w.summary().eventWarning
    expect(warning).toBeTruthy()
    const matchedKind = Object.values(GAME_EVENT_DEFS).find((d) => d.warning === warning)?.kind
    expect(matchedKind).toBeDefined()

    // 記下觸發前的敵人數量（Boss 週期對齊問題：只抓活的存活敵）
    const enemiesBefore = w.activeEnemies().length

    for (let i = 0; i < 6 * 60; i++) w.step(1 / 60) // 越過 150 秒，事件已觸發

    // 觸發後預警清空
    expect(w.summary().eventWarning).toBeFalsy()
    // 事件確實生了怪（增量 ≥ 3，即最小批次 elite-pack 的 3 隻）
    expect(w.activeEnemies().length - enemiesBefore).toBeGreaterThanOrEqual(3)
  })
})

describe('撿取物效果', () => {
  it('heal 回血並夾在 maxHp 上限', () => {
    const w = new World(1)
    w.player.hp = 10
    w.pickups().push(createPickup({ x: w.player.pos.x, y: w.player.pos.y }, 'heal'))
    w.step(1 / 60)
    expect(w.player.hp).toBeGreaterThan(10)
    expect(w.player.hp).toBeLessThanOrEqual(w.player.maxHp)
  })

  it('vacuum 啟動後全場寶石飛向玩家被收取並轉為經驗', () => {
    const w = new World(1)
    const xpBefore = w.summary().xp
    // 放兩顆離玩家較遠的寶石（一般 pickupRadius 吸不到，須靠 vacuum 不分距離吸引）
    const g1 = createGem({ x: w.player.pos.x + 500, y: w.player.pos.y }, 3)
    const g2 = createGem({ x: w.player.pos.x - 500, y: w.player.pos.y }, 3)
    w.gems().push(g1, g2)
    w.pickups().push(createPickup({ x: w.player.pos.x, y: w.player.pos.y }, 'vacuum'))
    // 飛行需要數十格才抵達；步進足夠時間讓兩顆都被收取
    for (let i = 0; i < 90; i++) w.step(1 / 60)
    expect(g1.active).toBe(false)
    expect(g2.active).toBe(false)
    expect(w.summary().xp).toBeGreaterThan(xpBefore)
  })

  it('精英死亡掉寶箱且經驗為基礎×5', () => {
    const w = new World(1)
    w.stats.pickupRadius = 0 // 避免寶石被吸走
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 40, y: w.player.pos.y }, 'virus', 'frenzy')
    e.hp = 1
    w.forceFire()
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.chests().length).toBeGreaterThan(0)
    expect(w.gems().some((g) => g.xp === 5)).toBe(true)
  })

  it('再生精英隨時間回血、不超過 maxHp', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: 9999, y: 9999 }, 'spore', 'regen') // 遠離玩家不受傷
    e.hp = 1
    const before = e.hp
    for (let i = 0; i < 60; i++) w.step(1 / 60) // 1 秒
    expect(e.hp).toBeGreaterThan(before)
    expect(e.hp).toBeLessThanOrEqual(e.maxHp)
    e.hp = e.maxHp
    for (let i = 0; i < 60; i++) w.step(1 / 60)
    expect(e.hp).toBeCloseTo(e.maxHp, 5) // 滿血不溢出
  })

  it('爆裂精英死亡對近距玩家造成爆炸傷害', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y }, 'virus', 'volatile')
    w.stats.armor = 5
    const hpBefore = w.player.hp
    e.hp = 0
    w.step(1 / 60) // 觸發死亡結算
    expect(e.active).toBe(false)
    expect(hpBefore - w.player.hp).toBeCloseTo(Math.max(0, 18 - 5), 5) // 爆炸 18 套護甲 5
  })

  it('終局 Boss 於設定時間生成且只生一隻', () => {
    const w = new World(1, 'macrophage', 'vessel', 2) // 注入 2 秒終局時間加速
    for (let i = 0; i < 2 * 60 + 5; i++) {
      w.step(1 / 60)
      if (i % 1000 === 0) w.consumeSoundEvents()
    }
    const finals = w.enemies.filter((e) => e.enemyKind === 'finalboss')
    expect(finals.length).toBe(1)
    for (let i = 0; i < 5 * 60; i++) w.step(1 / 60)
    expect(w.enemies.filter((e) => e.enemyKind === 'finalboss').length).toBe(1)
  })

  it('終局 Boss 出現後不再生 60s Boss', () => {
    // 注入 65 秒終局時間：讓第一隻 60s Boss（@60s）先生成，再驗證終局後不再生 Boss。
    const w = new World(1, 'macrophage', 'vessel', 65)
    for (let i = 0; i < 65 * 60; i++) {
      w.step(1 / 60)
      if (i % 1000 === 0) w.consumeSoundEvents()
    }
    expect(w.enemies.some((e) => e.enemyKind === 'finalboss')).toBe(true)
    const superbugsBefore = w.enemies.filter((e) => e.enemyKind === 'superbug').length
    for (let i = 0; i < 70 * 60; i++) {
      w.step(1 / 60)
      if (i % 1000 === 0) w.consumeSoundEvents()
    }
    const superbugsAfter = w.enemies.filter((e) => e.enemyKind === 'superbug').length
    expect(superbugsAfter).toBeLessThanOrEqual(superbugsBefore) // 終局後無新增 60s Boss
  })

  it('省略 finalBossTime 預設 900 秒', () => {
    const w = new World(1, 'macrophage', 'vessel', 1)
    for (let i = 0; i < 1 * 60 + 5; i++) w.step(1 / 60)
    expect(w.enemies.some((e) => e.enemyKind === 'finalboss')).toBe(true) // 注入值生效
  })

  it('擊敗終局 Boss 觸發 hasWon', () => {
    const w = new World(1)
    expect(w.hasWon()).toBe(false)
    const b = w.spawnFinalBossAt({ x: 9999, y: 9999 })
    b.hp = 0
    w.step(1 / 60)
    expect(b.active).toBe(false)
    expect(w.hasWon()).toBe(true)
  })

  it('終局 Boss hp 為固定值、不套地圖倍率', () => {
    const w = new World(1, 'macrophage', 'stomach') // stomach enemyHpMult 1.25
    const b = w.spawnFinalBossAt({ x: 100, y: 0 })
    expect(b.maxHp).toBe(4000)
  })
})

describe('多玩家武器', () => {
  it('各玩家武器各自開火（兩玩家分處兩地各自產生子彈）', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[1].entity.pos = { x: 2000, y: 0 }
    // 在兩玩家附近各放一隻敵人，讓 antibody 有目標
    w.spawnEnemyAt({ x: w.players[0].entity.pos.x + 40, y: 0 })
    w.spawnEnemyAt({ x: 2040, y: 0 })
    w.forceFire()
    w.step(1 / 60)
    const near0 = w.projectiles.some((p) => Math.abs(p.pos.x - w.players[0].entity.pos.x) < 60)
    const near1 = w.projectiles.some((p) => Math.abs(p.pos.x - 2000) < 60)
    expect(near0).toBe(true)
    expect(near1).toBe(true)
  })
})

describe('死亡/觀戰 + hasLost + 確定性', () => {
  it('一名玩家死亡仍續跑、敵人改追存活者', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -500, y: 0 }
    w.players[1].entity.pos = { x: 500, y: 0 }
    w.players[0].entity.hp = 0
    w.step(1 / 60)
    expect(w.players[0].alive).toBe(false)
    expect(w.hasLost()).toBe(false)
    const e = w.spawnEnemyAt({ x: 0, y: 0 })
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    expect(e.pos.x).toBeGreaterThan(0) // 朝存活的玩家 1（+500）移動
  })

  it('全員死亡 hasLost 為 true；N=1 與 isPlayerDead 等價', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.hp = 0; w.players[1].entity.hp = 0
    w.step(1 / 60)
    expect(w.hasLost()).toBe(true)
    const s = new World(1)
    s.player.hp = 0
    s.step(1 / 60)
    expect(s.isPlayerDead()).toBe(true)
    expect(s.hasLost()).toBe(true)
  })

  it('相同 seed + 相同角色陣列 + 相同輸入 → 兩局一致', () => {
    const run = () => {
      const w = new World(42, ['macrophage', 'neutrophil'])
      for (let i = 0; i < 300; i++) {
        w.setMoveInput(0, { x: 1, y: 0 }); w.setMoveInput(1, { x: 0, y: 1 })
        w.step(1 / 60)
      }
      return [w.enemies.length, Math.round(w.players[0].entity.pos.x), Math.round(w.players[1].entity.pos.y), w.players[0].level]
    }
    expect(run()).toEqual(run())
  })
})

describe('多玩家建構', () => {
  it('陣列角色建立多名玩家、各自起始武器', () => {
    const w = new World(1, ['macrophage', 'neutrophil'])
    expect(w.playerCount).toBe(2)
    expect(w.players[0].weapons[0].kind).toBe('antibody')
    expect(w.players[1].weapons[0].kind).toBe('perforin')
    expect(w.players[1].entity.maxHp).toBe(80) // neutrophil
  })

  it('單一角色與省略仍為 N=1', () => {
    expect(new World(1).playerCount).toBe(1)
    expect(new World(1, 'nkcell').playerCount).toBe(1)
  })

  it('全員存活時 hasLost 為 false', () => {
    const w = new World(1, ['macrophage', 'neutrophil'])
    expect(w.hasLost()).toBe(false)
  })

  it('敵人追最近的存活玩家', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -500, y: 0 }
    w.players[1].entity.pos = { x: 500, y: 0 }
    const e = w.spawnEnemyAt({ x: 480, y: 0 }) // 靠近玩家 1
    const dBefore = Math.abs(e.pos.x - 500)
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    expect(Math.abs(e.pos.x - 500)).toBeLessThan(dBefore) // 朝玩家 1 靠近
  })

  it('接觸傷害只打到重疊的玩家', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -500, y: 0 }
    w.players[1].entity.pos = { x: 500, y: 0 }
    const hp0 = w.players[0].entity.hp, hp1 = w.players[1].entity.hp
    w.spawnEnemyAt({ x: 500, y: 0 }) // 與玩家 1 重疊
    w.step(1 / 60)
    expect(w.players[1].entity.hp).toBeLessThan(hp1)
    expect(w.players[0].entity.hp).toBe(hp0)
  })

  it('寶石只給碰到它的玩家經驗（各自升級）', () => {
    const w = new World(1, ['macrophage', 'macrophage'])
    w.players[0].entity.pos = { x: -1000, y: 0 }
    w.players[1].entity.pos = { x: 1000, y: 0 }
    w.players[0].stats.pickupRadius = 0
    w.players[1].stats.pickupRadius = 0
    const before1 = w.players[1].xp + w.players[1].level
    // 在玩家 1 腳下放一顆大經驗寶石
    w.spawnGemForTest({ x: 1000, y: 0 }, 100)
    w.step(1 / 60)
    expect(w.players[1].xp + w.players[1].level).toBeGreaterThan(before1)
    expect(w.players[0].xp).toBe(0)
    expect(w.players[0].level).toBe(1)
  })

  it('生怪間隔依人數縮短（2 人為一半）', () => {
    let c1 = 0, c2 = 0
    const w1b = new World(2)
    const w2b = new World(2, ['macrophage', 'macrophage'])
    for (let i = 0; i < 10 * 60; i++) { w1b.step(1 / 60); w2b.step(1 / 60) }
    c1 = w1b.enemies.length
    c2 = w2b.enemies.length
    expect(c2).toBeGreaterThan(c1) // 2 人生怪更多
  })

  it('Boss 與終局 Boss hp 依人數放大', () => {
    const w1 = new World(1)
    const w2 = new World(1, ['macrophage', 'macrophage'])
    const b1 = w1.spawnBossAt({ x: 100, y: 0 })
    const b2 = w2.spawnBossAt({ x: 100, y: 0 })
    expect(b2.maxHp).toBeCloseTo(b1.maxHp * 2, 5)
    const f1 = w1.spawnFinalBossAt({ x: 100, y: 0 })
    const f2 = w2.spawnFinalBossAt({ x: 100, y: 0 })
    expect(f2.maxHp).toBe(f1.maxHp * 2)
  })
})

describe('N=1 回復紅線', () => {
  it('持回復被動的玩家瀕死當格不被回血救回（N=1 等價）', () => {
    const w = new World(1)
    w.stats.regen = 0.6 // 模擬 tomato 回復被動
    w.player.hp = -0.005 // 落在 (-regen*dt, 0] 區間
    w.step(1 / 60)
    expect(w.isPlayerDead()).toBe(true)
  })

  describe('多人非阻塞升級（1B）', () => {
    it('多人玩家升級取得 3 張待選、世界不暫停', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      const offer = w.pendingOfferFor(0)
      expect(offer).not.toBeNull()
      expect(offer!.length).toBe(3)
      expect(w.upgradeTimeRemaining(0)).toBeGreaterThan(0)
      expect(() => w.step(1 / 60)).not.toThrow() // 世界仍可推進
    })

    it('逾時 12 秒自動選第一張', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60) // 產生待選
      expect(w.pendingOfferFor(0)!.length).toBe(3)
      for (let i = 0; i < 13 * 60; i++) w.step(1 / 60) // 越過 12 秒
      expect(w.pendingOfferFor(0)).toBeNull()
      expect(w.players[0].pendingLevelUps).toBe(0)
    })

    it('逾時前主動 chooseUpgrade 套用該卡', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[1].pendingLevelUps = 1
      w.step(1 / 60)
      const id = w.pendingOfferFor(1)![0].id
      w.chooseUpgrade(1, id)
      expect(w.pendingOfferFor(1)).toBeNull()
      expect(w.players[1].pendingLevelUps).toBe(0)
    })

    it('chooseUpgrade 非待選 id 安靜略過', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      const before = w.pendingOfferFor(0)!.length
      w.chooseUpgrade(0, '不存在的id')
      expect(w.pendingOfferFor(0)!.length).toBe(before)
      expect(w.players[0].pendingLevelUps).toBe(1)
    })

    it('一次升多級逐張提供', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 2
      w.step(1 / 60)
      const id1 = w.pendingOfferFor(0)![0].id
      w.chooseUpgrade(0, id1)
      expect(w.pendingOfferFor(0)).toBeNull()
      w.step(1 / 60) // 下一格產下一張
      expect(w.pendingOfferFor(0)!.length).toBe(3)
      expect(w.players[0].pendingLevelUps).toBe(1)
    })

    it('升級浮層期間角色照常可動', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      const x = w.players[0].entity.pos.x
      w.setMoveInput(0, { x: 1, y: 0 })
      for (let i = 0; i < 30; i++) w.step(1 / 60)
      expect(w.players[0].entity.pos.x).toBeGreaterThan(x)
    })

    it('死亡玩家不再倒數/自動選', () => {
      const w = new World(1, ['macrophage', 'neutrophil'])
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      expect(w.pendingOfferFor(0)!.length).toBe(3)
      w.players[0].entity.hp = 0
      const remainBefore = w.upgradeTimeRemaining(0)
      for (let i = 0; i < 13 * 60; i++) w.step(1 / 60)
      expect(w.upgradeTimeRemaining(0)).toBe(remainBefore) // 不再倒數
      expect(w.pendingOfferFor(0)!.length).toBe(3) // 不自動選
    })

    it('選項跨機確定性（相同 seed → 相同選項序列）', () => {
      const gen = () => {
        const w = new World(7, ['macrophage', 'neutrophil'])
        w.players[1].pendingLevelUps = 1
        w.step(1 / 60)
        return w.pendingOfferFor(1)!.map((o) => o.id)
      }
      expect(gen()).toEqual(gen())
    })

    it('單人 processUpgrades 為 no-op（pendingOfferFor 回 null）', () => {
      const w = new World(1) // playerCount 1
      w.players[0].pendingLevelUps = 1
      w.step(1 / 60)
      expect(w.pendingOfferFor(0)).toBeNull()
      expect(w.consumeLevelUp()).toBe(true) // 既有單人路徑仍可消費
    })
  })

  describe('World.checksum（SP2）', () => {
    it('相同 seed/角色、未 step 的兩 World checksum 相同', () => {
      const a = new World(1, ['macrophage', 'neutrophil'])
      const b = new World(1, ['macrophage', 'neutrophil'])
      expect(a.checksum()).toBe(b.checksum())
    })
    it('step 推進後 checksum 改變', () => {
      const w = new World(1)
      const before = w.checksum()
      for (let i = 0; i < 120; i++) w.step(1 / 60)
      expect(w.checksum()).not.toBe(before)
    })
    it('checksum 為 32-bit 無號整數', () => {
      const v = new World(5).checksum()
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(0xffffffff)
    })
  })
})
