/**
 * 音訊管理（Web Audio 程式合成）。
 *
 * 用瀏覽器 Web Audio API 即時合成 SFX 與背景音樂；不依賴 Vue/Pinia（與 KeyboardInput 同層）。
 * 所有音源接到單一 masterGain（靜音=0）。play 依事件型別節流避免高頻爆音。
 * 匯出單例 soundManager 供 Game 與 UI 共用。音訊為副作用，不影響模擬確定性。
 */
import type { SoundEvent } from '../types'

type Event = SoundEvent | 'gameover'

/** 各事件最小播放間隔（毫秒），避免高頻爆音。 */
const THROTTLE: Partial<Record<Event, number>> = { shoot: 60, hit: 50, hurt: 200 }

class SoundManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
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
      this.master.connect(this.ctx.destination)
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

  /** 一段白噪（低通），用於命中/Boss。 */
  private noise(dur: number, vol: number, cutoff: number, at: number): void {
    const ctx = this.ctx!
    const n = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cutoff
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    src.connect(lp)
    lp.connect(g)
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

  /** 依事件合成對應短音。 */
  private synth(ev: Event, t: number): void {
    switch (ev) {
      case 'shoot':
        this.tone('square', 600, 300, 0.08, 0.12, t)
        break
      case 'hit':
        this.noise(0.05, 0.15, 2000, t)
        break
      case 'kill':
        this.tone('square', 400, 120, 0.12, 0.2, t)
        break
      case 'pickup':
        this.tone('sine', 660, 990, 0.08, 0.2, t)
        break
      case 'levelup':
        this.tone('sine', 523, 659, 0.12, 0.25, t)
        this.tone('sine', 784, 784, 0.18, 0.22, t + 0.12)
        break
      case 'hurt':
        this.tone('square', 160, 80, 0.15, 0.2, t)
        break
      case 'boss':
        this.tone('sawtooth', 80, 120, 0.5, 0.3, t)
        this.noise(0.5, 0.12, 800, t)
        break
      case 'chest':
        this.tone('sine', 784, 784, 0.1, 0.22, t)
        this.tone('sine', 988, 988, 0.1, 0.22, t + 0.1)
        this.tone('sine', 1318, 1318, 0.18, 0.22, t + 0.2)
        break
      case 'gameover':
        this.tone('sine', 440, 440, 0.2, 0.25, t)
        this.tone('sine', 330, 330, 0.2, 0.25, t + 0.2)
        this.tone('sine', 220, 220, 0.4, 0.25, t + 0.4)
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
