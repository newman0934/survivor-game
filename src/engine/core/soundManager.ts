/**
 * 音訊管理（Web Audio 程式合成）。
 *
 * 用瀏覽器 Web Audio API 即時合成 SFX 與背景音樂；不依賴 Vue/Pinia（與 KeyboardInput 同層）。
 * 所有音源接到單一 masterGain（靜音=0）。play 依事件型別節流避免高頻爆音。
 * 匯出單例 soundManager 供 Game 與 UI 共用。音訊為副作用，不影響模擬確定性。
 */
import type { SoundEvent, MapKind } from '../types'

type Event = SoundEvent | 'gameover'

/** 一個和弦：低音根音 + 三個分解和弦音。 */
interface Chord { bass: number; arp: [number, number, number] }
/** 一張地圖的背景音樂主題：和弦進行 + 每拍毫秒 + 分解和弦音色/音量 + 是否稀疏（留白）。 */
interface MusicTheme { chords: Chord[]; beatMs: number; arpWave: OscillatorType; arpVol: number; sparse?: boolean }

/** 各地圖背景音樂主題（程式合成；每和弦 4 拍）。三張刻意以「音域/波形/密度」區隔，不只節奏。 */
const MUSIC_THEMES: Record<MapKind, MusicTheme> = {
  // 血管：中音域、三角波、平穩流動小調（Am–F–C–G）。
  vessel: {
    beatMs: 340, arpWave: 'triangle', arpVol: 0.05,
    chords: [
      { bass: 110.0, arp: [220.0, 261.63, 329.63] }, // Am
      { bass: 87.31, arp: [174.61, 220.0, 261.63] }, // F
      { bass: 130.81, arp: [261.63, 329.63, 392.0] }, // C
      { bass: 98.0, arp: [196.0, 246.94, 293.66] }, // G
    ],
  },
  // 胃：低八度、鋸齒波、暗沉推進、較快較密（Dm–Bb–Gm–A，含 A 大調 V 張力）。
  stomach: {
    beatMs: 270, arpWave: 'sawtooth', arpVol: 0.035,
    chords: [
      { bass: 73.42, arp: [146.83, 174.61, 220.0] }, // Dm
      { bass: 58.27, arp: [116.54, 174.61, 220.0] }, // Bb
      { bass: 98.0, arp: [146.83, 196.0, 233.08] }, // Gm
      { bass: 55.0, arp: [164.81, 220.0, 277.18] }, // A（C#→張力）
    ],
  },
  // 肺泡：高八度、正弦波、稀疏留白、明亮空靈、較慢大調（C–G–Am–F）。
  lung: {
    beatMs: 460, arpWave: 'sine', arpVol: 0.045, sparse: true,
    chords: [
      { bass: 130.81, arp: [523.25, 659.25, 783.99] }, // C
      { bass: 98.0, arp: [392.0, 493.88, 587.33] }, // G
      { bass: 110.0, arp: [440.0, 523.25, 659.25] }, // Am
      { bass: 87.31, arp: [349.23, 440.0, 523.25] }, // F
    ],
  },
  // 腸道：方波、較快較密、明亮躁動小調（Em–C–G–D），呼應蟲潮節奏。
  gut: {
    beatMs: 250, arpWave: 'square', arpVol: 0.03,
    chords: [
      { bass: 82.41, arp: [164.81, 196.0, 246.94] }, // Em
      { bass: 65.41, arp: [130.81, 164.81, 196.0] }, // C
      { bass: 98.0, arp: [196.0, 246.94, 293.66] }, // G
      { bass: 73.42, arp: [146.83, 185.0, 220.0] }, // D
    ],
  },
  // 腦：正弦波、緩慢稀疏、高疊置空靈帶張力（Dm–A–Bdim–Bb），精英試煉的肅穆感。
  brain: {
    beatMs: 520, arpWave: 'sine', arpVol: 0.04, sparse: true,
    chords: [
      { bass: 73.42, arp: [293.66, 349.23, 440.0] }, // Dm
      { bass: 55.0, arp: [277.18, 329.63, 440.0] }, // A（張力）
      { bass: 61.74, arp: [246.94, 311.13, 392.0] }, // Bdim-ish
      { bass: 58.27, arp: [233.08, 293.66, 349.23] }, // Bb
    ],
  },
}

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

  /** 啟動合成背景音樂：依地圖選主題（和弦進行 + 節奏 + 音色），低音根音 + 分解和弦 + 微 detune 加暖。 */
  startMusic(map: MapKind = 'vessel'): void {
    if (this.musicTimer !== null) return
    const theme = MUSIC_THEMES[map] ?? MUSIC_THEMES.vessel
    const beatsPerChord = 4
    let beat = 0
    const tick = (): void => {
      const ctx = this.ensure()
      if (!ctx || !this.master) return
      const at = ctx.currentTime
      const chord = theme.chords[Math.floor(beat / beatsPerChord) % theme.chords.length]
      const step = beat % beatsPerChord
      // 低音：每和弦第一拍落根音（長、柔），鋪底。
      if (step === 0) this.tone('sine', chord.bass, chord.bass, 1.0, 0.07, at)
      // 分解和弦：每拍一個音 + 輕微 detune 雙振盪器加暖；sparse 主題只在偶數拍出音、奇數拍留白（空靈）。
      if (!theme.sparse || step % 2 === 0) {
        const f = chord.arp[step % chord.arp.length]
        this.tone(theme.arpWave, f, f, 0.45, theme.arpVol, at)
        this.tone(theme.arpWave, f * 1.005, f * 1.005, 0.45, theme.arpVol * 0.6, at)
      }
      beat = (beat + 1) % (theme.chords.length * beatsPerChord)
    }
    tick()
    this.musicTimer = setInterval(tick, theme.beatMs)
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
