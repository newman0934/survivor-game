/**
 * 呈現層視覺特效。EffectsLayer 管理短生命週期特效的 spawn → 每幀 update 推進壽命 → 自動回收：
 * 擊殺粒子/環波、收集閃光、升級光環、傷害數字、受傷紅暈、鏡頭震動。純呈現、不碰模擬、走固定 dt。
 */
import { Container, Graphics, Text } from 'pixi.js'

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

  /** 擊殺：環形衝擊波 + 敵色碎屑粒子（達粒子上限時只出環波）。 */
  spawnKill(x: number, y: number, color: number): void {
    this.addExpand(x, y, color, 6, 40, 3, 0.35)
    for (let i = 0; i < 9; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const ang = Math.random() * TAU
      const spd = 60 + Math.random() * 130
      const pr = 1.5 + Math.random() * 2
      const g = new Graphics()
      g.circle(0, 0, pr).fill(color)
      g.position.set(x, y)
      this.worldFx.addChild(g)
      this.particles.push({
        g, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, gravity: 200, life: 0.4, maxLife: 0.4,
      })
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

  /** 吞噬偽足：前方扇形閃光（短壽命淡出）。 */
  spawnSweep(x: number, y: number, angle: number, radius: number, halfAngle: number): void {
    const g = new Graphics()
    g.moveTo(0, 0)
    g.arc(0, 0, radius, angle - halfAngle, angle + halfAngle)
    g.closePath()
    g.fill({ color: 0xff7043, alpha: 0.32 })
    g.position.set(x, y)
    this.worldFx.addChild(g)
    this.flashes.push({ g, life: 0.22, maxLife: 0.22 })
  }

  /** 補體級聯：相鄰命中點間的連鎖閃電（世界座標、短壽命淡出）。 */
  spawnChain(points: { x: number; y: number }[]): void {
    if (points.length < 2) return
    const g = new Graphics()
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y)
    g.stroke({ width: 3, color: 0x8be9ff, alpha: 0.9 })
    this.worldFx.addChild(g)
    this.flashes.push({ g, life: 0.2, maxLife: 0.2 })
  }

  /** 抗原脈衝：擴張衝擊環（沿用 addExpand）。 */
  spawnNova(x: number, y: number, radius: number): void {
    this.addExpand(x, y, 0x4dd0c0, 4, radius, 4, 0.4)
  }

  /** 受傷：拉高紅暈與震動強度（intensity 越大越強，boss 撞擊較大）。 */
  hurt(intensity: number): void {
    this.vignetteAlpha = Math.min(0.55, this.vignetteAlpha + 0.3 + intensity * 0.3)
    this.shakeIntensity = Math.min(12, this.shakeIntensity + 4 + intensity * 8)
  }

  /** 每幀推進所有特效，回傳鏡頭震動偏移。 */
  update(): { shakeX: number; shakeY: number } {
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
