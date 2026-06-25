/**
 * 音訊管理（Web Audio 程式合成）。
 *
 * 用瀏覽器 Web Audio API 即時合成 SFX 與背景音樂；不依賴 Vue/Pinia（與 KeyboardInput 同層）。
 * 所有音源接到單一 masterGain（靜音=0）。play 依事件型別節流避免高頻爆音。
 * 匯出單例 soundManager 供 Game 與 UI 共用。音訊為副作用，不影響模擬確定性。
 */
import type { SoundEvent } from '../types'

type Event = SoundEvent | 'gameover'

/** 各事件最小播放間隔（毫秒），避免高頻爆音／密集疊加糊成一片。 */
const THROTTLE: Partial<Record<Event, number>> = { shoot: 60, hit: 50, hurt: 200, kill: 45 }

class SoundManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  /** 主匯流排限幅器：硬性壓住總和輸出，避免大量同時音（如成群擊殺）疊加爆音。 */
  private limiter: DynamicsCompressorNode | null = null
  private muted = false
  private last: Partial<Record<Event, number>> = {}
  private musicTimer: ReturnType<typeof setInterval> | null = null

  /** 延遲建立 AudioContext（首次需在使用者手勢內）。 */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.5
      // 限幅器（當 limiter 用：硬膝、高 ratio、快 attack）→ 總和輸出不破音。
      this.limiter = this.ctx.createDynamicsCompressor()
      this.limiter.threshold.value = -3
      this.limiter.knee.value = 0
      this.limiter.ratio.value = 20
      this.limiter.attack.value = 0.003
      this.limiter.release.value = 0.12
      this.master.connect(this.limiter)
      this.limiter.connect(this.ctx.destination)
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  /** 在使用者手勢內呼叫，建立/恢復 context。 */
  resume(): void {
    const ctx = this.ensure()
    try {
      void ctx?.resume()
    } catch {
      /* 忽略：未就緒時靜默 */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : 0.5
  }

  /** 一段振盪器音（線性掃頻 + 指數衰減包絡）。 */
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, at: number): void {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, at)
    o.frequency.linearRampToValueAtTime(f1, at + dur)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g)
    g.connect(this.master!)
    o.start(at)
    o.stop(at + dur)
  }

  /** 一段濾波白噪（預設低通；filter='highpass' 可做清脆 tick）。用於命中/擊殺/Boss/打擊質感。 */
  private noise(dur: number, vol: number, cutoff: number, at: number, filter: BiquadFilterType = 'lowpass'): void {
    const ctx = this.ctx!
    const n = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.value = cutoff
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master!)
    src.start(at)
    src.stop(at + dur)
  }

  /** 播放某事件（含節流；context 未就緒時靜默失敗）。 */
  play(ev: Event): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const minMs = THROTTLE[ev]
    if (minMs !== undefined) {
      const lastT = this.last[ev]
      if (lastT !== undefined && (t - lastT) * 1000 < minMs) return
      this.last[ev] = t
    }
    try {
      this.synth(ev, t)
    } catch {
      /* 忽略播放錯誤 */
    }
  }

  /** 依事件合成對應短音（多層：主音 + 泛音/次低音 + 噪聲質感）。 */
  private synth(ev: Event, t: number): void {
    switch (ev) {
      case 'shoot': // 有打擊感的雷射：方波下掃 + 次低音 + 高通 tick
        this.tone('square', 720, 260, 0.07, 0.10, t)
        this.tone('triangle', 220, 130, 0.06, 0.05, t)
        this.noise(0.02, 0.05, 3200, t, 'highpass')
        break
      case 'hit': // 擊中敵人不發音（依需求取消，避免高頻命中聲）
        break
      case 'kill': // 滿足爆破：下行方波 + sub thump + 低噪
        this.tone('square', 440, 110, 0.12, 0.16, t)
        this.tone('sine', 150, 60, 0.14, 0.13, t)
        this.noise(0.06, 0.08, 1400, t)
        break
      case 'pickup': // 清亮 bloop：上行正弦 + 八度泛音
        this.tone('sine', 680, 1020, 0.09, 0.16, t)
        this.tone('sine', 1360, 1500, 0.06, 0.06, t + 0.02)
        break
      case 'levelup': // 凱旋三和弦 + detune 加厚 + 高音 shimmer
        this.tone('sine', 523, 523, 0.16, 0.18, t)
        this.tone('sine', 526, 526, 0.16, 0.10, t)
        this.tone('sine', 659, 659, 0.16, 0.16, t + 0.1)
        this.tone('sine', 784, 784, 0.24, 0.16, t + 0.2)
        this.tone('triangle', 1568, 1568, 0.18, 0.05, t + 0.2)
        break
      case 'hurt': // 悶痛：低方波 + 低通噪聲
        this.tone('square', 170, 70, 0.16, 0.18, t)
        this.noise(0.08, 0.10, 600, t)
        break
      case 'boss': // 低沉壓迫：鋸齒上揚 + 次低音 + 噪聲漲潮
        this.tone('sawtooth', 70, 120, 0.55, 0.24, t)
        this.tone('sine', 45, 70, 0.55, 0.16, t)
        this.noise(0.5, 0.10, 760, t)
        break
      case 'chest': // 獎勵上行琶音 + detune 微亮
        this.tone('sine', 784, 784, 0.1, 0.20, t)
        this.tone('sine', 988, 988, 0.1, 0.20, t + 0.1)
        this.tone('sine', 1318, 1318, 0.2, 0.20, t + 0.2)
        this.tone('triangle', 2637, 2637, 0.14, 0.04, t + 0.2)
        break
      case 'gameover': // 下行哀調 + 次低音、較長釋放
        this.tone('sine', 440, 440, 0.22, 0.22, t)
        this.tone('sine', 330, 330, 0.22, 0.22, t + 0.22)
        this.tone('sine', 220, 220, 0.45, 0.22, t + 0.44)
        this.tone('sine', 110, 110, 0.5, 0.12, t + 0.44)
        break
    }
  }

  /** 啟動合成背景音樂（低音量正弦琶音循環）。 */
  startMusic(): void {
    if (this.musicTimer !== null) return
    const notes = [220, 277, 330, 277]
    let i = 0
    const beat = (): void => {
      const ctx = this.ensure()
      if (!ctx || !this.master) return
      const f = notes[i % notes.length]
      this.tone('triangle', f, f, 0.32, 0.06, ctx.currentTime)
      i++
    }
    beat()
    this.musicTimer = setInterval(beat, 360)
  }

  /** 停止背景音樂。 */
  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }
}

/** 全域單例。 */
export const soundManager = new SoundManager()
