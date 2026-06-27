/**
 * 呈現層視覺特效。EffectsLayer 管理短生命週期特效的 spawn → 每幀 update 推進壽命 → 自動回收：
 * 擊殺粒子/環波、收集閃光、升級光環、傷害數字、受傷紅暈、鏡頭震動。純呈現、不碰模擬、走固定 dt。
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { EnemyKind } from '../types'
import { HitStop } from '../core/hitStop'

const DT = 1 / 60
const TAU = Math.PI * 2
const MAX_PARTICLES = 200
const MAX_DAMAGE_TEXTS = 24

/** 噴射粒子（擊殺碎屑/升級光點）：速度 + 重力 + 壽命淡出縮小。 */
interface Particle {
  g: Graphics
  vx: number
  vy: number
  gravity: number
  life: number
  maxLife: number
}

/** 擴張環（環波/光圈/光環）：每幀依進度重畫描邊圓、淡出。 */
interface Expand {
  g: Graphics
  baseR: number
  growR: number
  width: number
  color: number
  life: number
  maxLife: number
}

/** 飄字（傷害數字）：上飄 + 淡出。 */
interface FloatText {
  t: Text
  vy: number
  life: number
  maxLife: number
}

export class EffectsLayer {
  private worldFx: Container
  private screenRoot: Container
  private vignette: Graphics
  private particles: Particle[] = []
  private expands: Expand[] = []
  private texts: FloatText[] = []
  private flashes: { g: Graphics; life: number; maxLife: number }[] = []
  private vignetteAlpha = 0
  private shakeIntensity = 0
  private hitStopTimer = new HitStop()
  // 暈動症友善：啟動時查一次系統偏好，reduced 時關閉震屏與頓挫。
  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private screenW: number
  private screenH: number
  private destroyed = false

  constructor(worldContainer: Container, screenContainer: Container, screenW: number, screenH: number) {
    this.worldFx = new Container()
    worldContainer.addChild(this.worldFx)
    this.screenRoot = new Container()
    screenContainer.addChild(this.screenRoot)
    this.screenW = screenW
    this.screenH = screenH
    this.vignette = new Graphics()
    this.screenRoot.addChild(this.vignette)
    this.drawVignette()
  }

  /** 擊殺：環波 + 依病原種類差異化死亡碎屑/濺射（達粒子上限時自動略過）。 */
  spawnKill(x: number, y: number, color: number, kind?: EnemyKind): void {
    const big = kind === 'superbug' || kind === 'exploder'
    this.addExpand(x, y, color, big ? 10 : 6, big ? 72 : 40, big ? 4 : 3, big ? 0.45 : 0.35)
    switch (kind) {
      case 'bacteria': // 體液大濺射
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * TAU, spd = 50 + Math.random() * 120
          this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 140, 0.42, color, 1.5 + Math.random() * 2.2)
        }
        break
      case 'virus': // 外殼碎裂（碎片）
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * TAU, spd = 70 + Math.random() * 150
          this.addShard(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 160, 0.45, color, 2.5 + Math.random() * 2)
        }
        break
      case 'spore': // 爆孢（一圈放射小點）
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU
          this.addDot(x, y, Math.cos(a) * 95, Math.sin(a) * 95, 40, 0.5, color, 1.6)
        }
        break
      case 'exploder': // 大爆裂碎屑（死亡另觸發 nova fx）
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * TAU, spd = 100 + Math.random() * 190
          this.addShard(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 120, 0.5, color, 2 + Math.random() * 2.5)
        }
        break
      case 'superbug': // 加大版
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * TAU, spd = 80 + Math.random() * 170
          this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 160, 0.5, color, 2 + Math.random() * 2.5)
        }
        break
      default: // 螺旋/噴吐/分裂/其餘：既有基礎爆裂
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * TAU, spd = 60 + Math.random() * 130
          this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 200, 0.4, color, 1.5 + Math.random() * 2)
        }
    }
  }

  /** 收集：亮綠光圈 + 白星閃光。 */
  spawnPickup(x: number, y: number): void {
    this.addExpand(x, y, 0xffd54a, 3, 18, 2, 0.25)
    this.addExpand(x, y, 0xffffff, 1, 8, 2, 0.2)
  }

  /** 升級：金色大光環 + 上升金光點。 */
  spawnLevelUp(x: number, y: number): void {
    this.addExpand(x, y, 0x4dd0c0, 20, 70, 4, 0.6)
    for (let i = 0; i < 6; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const g = new Graphics()
      g.circle(0, 0, 2).fill(0xb2f0e6)
      g.position.set(x + (Math.random() - 0.5) * 30, y)
      this.worldFx.addChild(g)
      this.particles.push({
        g, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 40, gravity: 0, life: 0.6, maxLife: 0.6,
      })
    }
  }

  /** 傷害數字：白字上飄淡出（達同時上限不生成）。 */
  spawnDamage(x: number, y: number, amount: number): void {
    if (this.texts.length >= MAX_DAMAGE_TEXTS) return
    const t = new Text({
      text: String(Math.round(amount)),
      style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold', stroke: { color: 0x000000, width: 3 } },
    })
    t.anchor.set(0.5)
    t.position.set(x, y - 12)
    this.worldFx.addChild(t)
    this.texts.push({ t, vy: -42, life: 0.5, maxLife: 0.5 })
  }

  /** 命中：撞擊點噴亮火花（快、短壽）+ 主題色體液滴（輕重力）。 */
  spawnHit(x: number, y: number, color: number): void {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU, spd = 90 + Math.random() * 140
      this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 40, 0.18, i === 0 ? 0xffffff : 0xfff3c4, 1 + Math.random() * 1.4)
    }
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * TAU, spd = 50 + Math.random() * 80
      this.addDot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 180, 0.3, color, 1.4 + Math.random() * 1.6)
    }
  }

  /** 吞噬偽足：分層新月刀光（柔光扇 + 亮白前緣弧）+ 沿弧噴濺碎屑。 */
  spawnSweep(x: number, y: number, angle: number, radius: number, halfAngle: number): void {
    const g = new Graphics()
    // 外層柔光扇形
    g.moveTo(0, 0)
    g.arc(0, 0, radius, angle - halfAngle, angle + halfAngle)
    g.closePath()
    g.fill({ color: 0x8bc34a, alpha: 0.24 })
    // 內層亮白前緣弧（沿外緣描邊，刀光鋒面）
    const sx = Math.cos(angle - halfAngle) * radius * 0.96
    const sy = Math.sin(angle - halfAngle) * radius * 0.96
    g.moveTo(sx, sy)
    g.arc(0, 0, radius * 0.96, angle - halfAngle, angle + halfAngle)
    g.stroke({ width: 3, color: 0xeaffc0, alpha: 0.9 })
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.flashes.push({ g, life: 0.22, maxLife: 0.22 })
    // 沿弧噴濺碎屑
    for (let i = 0; i < 5; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const a = angle - halfAngle + Math.random() * halfAngle * 2
      const spd = 80 + Math.random() * 120
      const pr = 1.2 + Math.random() * 1.5
      const p = new Graphics()
      p.circle(0, 0, pr).fill(0xaed581)
      p.position.set(x + Math.cos(a) * radius * 0.7, y + Math.sin(a) * radius * 0.7)
      this.worldFx.addChild(p)
      this.particles.push({ g: p, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, gravity: 120, life: 0.3, maxLife: 0.3 })
    }
  }

  /** 補體級聯：鋸齒閃電（雙層外暈+亮核 + 命中點亮球，世界座標、短壽命淡出）。 */
  spawnChain(points: { x: number; y: number }[]): void {
    if (points.length < 2) return
    // 每段插入垂直抖動中點，形成 lightning 折線
    const path: { x: number; y: number }[] = [points[0]]
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i]
      const dx = b.x - a.x, dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const off = (Math.random() - 0.5) * Math.min(24, len * 0.35)
      path.push({ x: (a.x + b.x) / 2 - (dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off })
      path.push(b)
    }
    const trace = (g: Graphics): void => {
      g.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y)
    }
    // 外暈（粗、淡）
    const glow = new Graphics()
    trace(glow)
    glow.stroke({ width: 7, color: 0x4ad6ff, alpha: 0.3 })
    this.worldFx.addChild(glow)
    this.flashes.push({ g: glow, life: 0.2, maxLife: 0.2 })
    // 亮核（細、亮）+ 命中點亮球節點
    const core = new Graphics()
    trace(core)
    core.stroke({ width: 2, color: 0xeaffff, alpha: 0.95 })
    for (let i = 1; i < points.length; i++) core.circle(points[i].x, points[i].y, 4).fill({ color: 0x8be9ff, alpha: 0.9 })
    this.worldFx.addChild(core)
    this.flashes.push({ g: core, life: 0.2, maxLife: 0.2 })
  }

  /** 抗原脈衝：雙環衝擊波 + 內層淡色填充碟快速淡出。 */
  spawnNova(x: number, y: number, radius: number): void {
    // 內層淡色填充碟（衝擊感、快速淡出）
    const disc = new Graphics()
    disc.circle(0, 0, radius * 0.5).fill({ color: 0x4dd0c0, alpha: 0.18 })
    disc.position.set(x, y)
    this.worldFx.addChild(disc)
    this.flashes.push({ g: disc, life: 0.25, maxLife: 0.25 })
    // 亮白前緣環（主衝擊、快）+ 外擴薄環（稍慢、更遠）
    this.addExpand(x, y, 0xeaffff, 6, radius, 5, 0.35)
    this.addExpand(x, y, 0x4dd0c0, 2, radius * 1.15, 2, 0.5)
  }

  /** 觸發鏡頭震動（amount 直接加到震動強度，沿用既有上限；reduced-motion 時略過）。 */
  shake(amount: number): void {
    if (this.reducedMotion) return
    this.shakeIntensity = Math.min(12, this.shakeIntensity + amount)
  }

  /** 觸發頓挫凍結（受全域冷卻節流；reduced-motion 時略過）。 */
  hitStop(seconds: number): void {
    if (this.reducedMotion) return
    this.hitStopTimer.trigger(seconds)
  }

  /** 是否處於頓挫凍結（供 Game 迴圈決定是否暫停推進）。 */
  isHitStopped(): boolean {
    return this.hitStopTimer.stopped
  }

  /** 受傷：拉高紅暈與震動強度（intensity 越大越強，boss 撞擊較大）。 */
  hurt(intensity: number): void {
    this.vignetteAlpha = Math.min(0.55, this.vignetteAlpha + 0.3 + intensity * 0.3)
    this.shake(4 + intensity * 8)
  }

  /** 每幀推進所有特效，回傳鏡頭震動偏移。 */
  update(): { shakeX: number; shakeY: number } {
    this.hitStopTimer.advance(DT)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= DT
      if (p.life <= 0) {
        p.g.destroy()
        this.particles.splice(i, 1)
        continue
      }
      p.vy += p.gravity * DT
      p.g.x += p.vx * DT
      p.g.y += p.vy * DT
      const k = p.life / p.maxLife
      p.g.alpha = k
      p.g.scale.set(k)
    }
    for (let i = this.expands.length - 1; i >= 0; i--) {
      const e = this.expands[i]
      e.life -= DT
      if (e.life <= 0) {
        e.g.destroy()
        this.expands.splice(i, 1)
        continue
      }
      const k = 1 - e.life / e.maxLife
      const r = e.baseR + e.growR * k
      e.g.clear()
      e.g.circle(0, 0, r).stroke({ width: e.width, color: e.color, alpha: 1 - k })
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const ft = this.texts[i]
      ft.life -= DT
      if (ft.life <= 0) {
        ft.t.destroy()
        this.texts.splice(i, 1)
        continue
      }
      ft.t.y += ft.vy * DT
      ft.t.alpha = ft.life / ft.maxLife
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]
      f.life -= DT
      if (f.life <= 0) { f.g.destroy(); this.flashes.splice(i, 1); continue }
      f.g.alpha = f.life / f.maxLife
    }
    this.vignetteAlpha = Math.max(0, this.vignetteAlpha - DT * 1.5)
    this.vignette.alpha = this.vignetteAlpha
    this.shakeIntensity = Math.max(0, this.shakeIntensity - DT * 60)
    const s = this.shakeIntensity
    return { shakeX: (Math.random() - 0.5) * s * 2, shakeY: (Math.random() - 0.5) * s * 2 }
  }

  /** 視窗尺寸變更：重畫紅暈。 */
  resize(screenW: number, screenH: number): void {
    this.screenW = screenW
    this.screenH = screenH
    this.drawVignette()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    for (const p of this.particles) p.g.destroy()
    for (const e of this.expands) e.g.destroy()
    for (const ft of this.texts) ft.t.destroy()
    for (const f of this.flashes) f.g.destroy()
    this.particles = []
    this.expands = []
    this.texts = []
    this.flashes = []
  }

  /** 內部：新增一顆圓點粒子（走既有粒子系統；達上限略過）。 */
  private addDot(
    x: number, y: number, vx: number, vy: number, gravity: number, life: number, color: number, r: number,
  ): void {
    if (this.particles.length >= MAX_PARTICLES) return
    const g = new Graphics()
    g.circle(0, 0, r).fill(color)
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.particles.push({ g, vx, vy, gravity, life, maxLife: life })
  }

  /** 內部：新增一片小三角碎片粒子（隨機初始旋轉）。 */
  private addShard(
    x: number, y: number, vx: number, vy: number, gravity: number, life: number, color: number, size: number,
  ): void {
    if (this.particles.length >= MAX_PARTICLES) return
    const g = new Graphics()
    g.poly([0, -size, size * 0.8, size * 0.6, -size * 0.8, size * 0.6]).fill(color)
    g.rotation = Math.random() * TAU
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.particles.push({ g, vx, vy, gravity, life, maxLife: life })
  }

  /** 內部：新增一個擴張環特效。 */
  private addExpand(
    x: number, y: number, color: number, baseR: number, growR: number, width: number, maxLife: number,
  ): void {
    const g = new Graphics()
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.expands.push({ g, baseR, growR, width, color, life: maxLife, maxLife })
  }

  /** 內部：畫螢幕邊緣紅色 vignette（整體 alpha 由 update 控制）。 */
  private drawVignette(): void {
    this.vignette.clear()
    const layers = 6
    const band = 18
    for (let i = 0; i < layers; i++) {
      const inset = i * band
      const a = 0.16 * (1 - i / layers)
      this.vignette
        .rect(inset, inset, this.screenW - 2 * inset, this.screenH - 2 * inset)
        .stroke({ width: band, color: 0xff1f1f, alpha: a })
    }
    this.vignette.alpha = this.vignetteAlpha
  }
}
