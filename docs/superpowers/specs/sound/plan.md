# 音效 — 實作計畫

> **給執行者：** TDD、bite-sized 步驟。World 事件發射為純引擎邏輯、先寫失敗測試；SoundManager/音樂/
> MuteButton 為瀏覽器輸出膠水層、實機驗證。既有 115 測試維持全綠。每個 task 一個邏輯變更、各自 commit。

**目標：** Web Audio 程式合成 SFX（戰鬥/事件）+ 背景音樂 + 靜音開關；引擎只推語意事件，音訊全在 SoundManager。

**架構：** `World.soundEvents` 語意事件佇列（step 推、Game 排空）→ `soundManager`（單例，Web Audio 合成、
節流、masterGain 靜音、合成音樂）；`MuteButton.vue` 切換。

**技術棧：** TypeScript、Vitest、Web Audio API、Vue 3。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | SoundEvent union | 修改 |
| `src/engine/World.ts` | soundEvents、consumeSoundEvents、emit 點 | 修改 |
| `src/engine/World.test.ts` | 事件發射/consume 測試 | 修改 |
| `src/engine/core/soundManager.ts` | 合成播放/節流/靜音/音樂單例 | 建立 |
| `src/engine/Game.ts` | 排空事件、gameover、resume/music | 修改 |
| `src/ui/MuteButton.vue` | 靜音鈕 | 建立 |
| `src/App.vue` | 非選單顯示 MuteButton | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：語意事件（types + World）

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：types.ts 新增 SoundEvent**

在 `EntityKind` 之後新增：

```ts
/** 由 World 發射、供音訊層解讀的語意事件。 */
export type SoundEvent = 'shoot' | 'hit' | 'kill' | 'pickup' | 'levelup' | 'hurt' | 'boss' | 'chest'
```

- [ ] **Step 2：寫失敗測試**

在 `World.test.ts` 頂層 describe 內新增：

```ts
  it('擊殺敵人發出 kill、Boss 生成發出 boss 事件', () => {
    const w = new World(1)
    w.spawnBossAt({ x: 50, y: 0 })
    expect(w.consumeSoundEvents()).toContain('boss')
    const e = w.spawnEnemyAt({ x: 60, y: 0 }, 'basic')
    e.hp = 0
    // 透過聖經/大蒜以外路徑：直接用 checkKills 經由一次 step 不便；改用投射物擊殺
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
```

> `xpForLevel` 已在 World.test.ts 既有 import。

- [ ] **Step 3：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（`consumeSoundEvents` 不存在）

- [ ] **Step 4：World 加 soundEvents 與 consumeSoundEvents**

於檔頭型別 import 末尾加入 `SoundEvent`（與既有 type import 合併）：

```ts
import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind, Passive, CharacterKind, MapKind, SoundEvent } from './types'
```

在 `moveInput` 欄位附近新增：

```ts
  /** 本格累積的語意音效事件；由上層每幀 consumeSoundEvents 排空。 */
  private soundEventQueue: SoundEvent[] = []
```

在 `chests()` getter 之後新增：

```ts
  /** 取走並清空本格累積的音效事件（供上層交給音訊層播放）。 */
  consumeSoundEvents(): SoundEvent[] {
    const out = this.soundEventQueue
    this.soundEventQueue = []
    return out
  }
```

- [ ] **Step 5：在各 emit 點推事件**

(a) 開火（步驟 4，wand/knife）：把
```ts
          this.projectiles.push(...projs)
```
改為
```ts
          this.projectiles.push(...projs)
          if (projs.length > 0) this.soundEventQueue.push('shoot')
```

(b) 投射物命中（步驟 5）：把
```ts
          e.hp -= p.damage
```
改為
```ts
          e.hp -= p.damage
          this.soundEventQueue.push('hit')
```

(c) `killEnemy`：在方法內（掉寶之後）新增
```ts
    this.soundEventQueue.push('kill')
```

(d) 撿寶石（步驟 6）：把
```ts
        this.grantXp(g.xp * this.stats.xpGain)
```
改為
```ts
        this.grantXp(g.xp * this.stats.xpGain)
        this.soundEventQueue.push('pickup')
```

(e) 撿寶箱（步驟 6b）：把
```ts
        c.active = false
        this.pendingLevelUps += 1
```
改為
```ts
        c.active = false
        this.pendingLevelUps += 1
        this.soundEventQueue.push('chest')
```

(f) 接觸傷害（步驟 7）：把
```ts
        this.player.hp -= Math.max(0, e.damage - this.stats.armor) * dt * 10
```
改為
```ts
        this.player.hp -= Math.max(0, e.damage - this.stats.armor) * dt * 10
        this.soundEventQueue.push('hurt')
```

(g) 升級（grantXp while 迴圈）：把
```ts
      this.level += 1
      this.pendingLevelUps += 1
```
改為
```ts
      this.level += 1
      this.pendingLevelUps += 1
      this.soundEventQueue.push('levelup')
```

(h) `spawnBossAt`：在 `this.enemies.push(b)` 之前或之後新增
```ts
    this.soundEventQueue.push('boss')
```

- [ ] **Step 6：執行確認通過 + 型別**

Run: `npm test && npm run typecheck`
Expected: 全綠（新事件測試 + 既有 115）

- [ ] **Step 7：commit**

```bash
git add src/engine/types.ts src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 發射語意音效事件佇列（consumeSoundEvents）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：SoundManager（Web Audio 合成單例）

**Files:**
- Create: `src/engine/core/soundManager.ts`

> 瀏覽器輸出膠水層，不寫單元測試；實機驗證。

- [ ] **Step 1：建立 soundManager.ts**

```ts
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

  private synth(ev: Event, t: number): void {
    switch (ev) {
      case 'shoot': this.tone('square', 600, 300, 0.08, 0.12, t); break
      case 'hit': this.noise(0.05, 0.15, 2000, t); break
      case 'kill': this.tone('square', 400, 120, 0.12, 0.2, t); break
      case 'pickup': this.tone('sine', 660, 990, 0.08, 0.2, t); break
      case 'levelup': this.tone('sine', 523, 659, 0.12, 0.25, t); this.tone('sine', 784, 784, 0.18, 0.22, t + 0.12); break
      case 'hurt': this.tone('square', 160, 80, 0.15, 0.2, t); break
      case 'boss': this.tone('sawtooth', 80, 120, 0.5, 0.3, t); this.noise(0.5, 0.12, 800, t); break
      case 'chest': this.tone('sine', 784, 784, 0.1, 0.22, t); this.tone('sine', 988, 988, 0.1, 0.22, t + 0.1); this.tone('sine', 1318, 1318, 0.18, 0.22, t + 0.2); break
      case 'gameover': this.tone('sine', 440, 440, 0.2, 0.25, t); this.tone('sine', 330, 330, 0.2, 0.25, t + 0.2); this.tone('sine', 220, 220, 0.4, 0.25, t + 0.4); break
    }
  }

  /** 啟動合成背景音樂（低音量正弦琶音循環）。 */
  startMusic(): void {
    if (this.musicTimer !== null) return
    const notes = [220, 277, 330, 277]
    let i = 0
    const beat = () => {
      const ctx = this.ensure()
      if (!ctx || !this.master) return
      this.tone('triangle', notes[i % notes.length], notes[i % notes.length], 0.32, 0.06, ctx.currentTime)
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
```

- [ ] **Step 2：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨

- [ ] **Step 3：commit**

```bash
git add src/engine/core/soundManager.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增 SoundManager（Web Audio 合成 SFX/音樂/靜音單例）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：Game 串接 + 靜音 UI

**Files:**
- Modify: `src/engine/Game.ts`
- Create: `src/ui/MuteButton.vue`
- Modify: `src/App.vue`

- [ ] **Step 1：Game 接 soundManager**

`Game.ts` 檔頭新增：

```ts
import { soundManager } from './core/soundManager'
```

在 `start()` 內 `game.touch.attach(canvasParent)` 之後新增：

```ts
    soundManager.resume()
    soundManager.startMusic()
```

在 `loop` 內，把每幀推送 summary 那行（`this.store.updateSummary(this.world.summary())`，在 while 迴圈之後）之後新增排空：

```ts
      for (const ev of this.world.consumeSoundEvents()) soundManager.play(ev)
```

在死亡分支把
```ts
        if (this.world.isPlayerDead()) {
          this.store.updateSummary(this.world.summary())
          this.store.gameOver()
          this.stop()
          return
        }
```
改為
```ts
        if (this.world.isPlayerDead()) {
          this.store.updateSummary(this.world.summary())
          soundManager.play('gameover')
          this.store.gameOver()
          this.stop()
          return
        }
```

在 `stop()` 內（`this.touch.detach()` 之後）新增：

```ts
    soundManager.stopMusic()
```

- [ ] **Step 2：建立 MuteButton.vue**

```vue
<script setup lang="ts">
/**
 * MuteButton.vue — 右上角靜音切換鈕（呈現層）。
 * 切換 soundManager 靜音；不讀 store、不碰引擎邏輯。
 */
import { ref } from 'vue'
import { soundManager } from '../engine/core/soundManager'

const muted = ref(false)
function toggle(): void {
  muted.value = !muted.value
  soundManager.resume() // 點擊也作為手勢啟動 AudioContext
  soundManager.setMuted(muted.value)
}
</script>

<template>
  <button class="mute" :aria-label="muted ? '取消靜音' : '靜音'" @click="toggle">
    {{ muted ? '🔇' : '🔊' }}
  </button>
</template>

<style scoped>
.mute {
  position: absolute; top: 0.5rem; right: 0.5rem; z-index: 10;
  width: 2.4rem; height: 2.4rem; font-size: 1.2rem; cursor: pointer;
  border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.12); color: #fff;
}
</style>
```

- [ ] **Step 3：App.vue 顯示 MuteButton**

在 `App.vue` 的 import 區新增：

```ts
import MuteButton from './ui/MuteButton.vue'
```

在 template 的 `<Hud v-if="store.phase !== 'menu'" />` 之後新增：

```html
    <MuteButton v-if="store.phase !== 'menu'" />
```

- [ ] **Step 4：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 5：commit**

```bash
git add src/engine/Game.ts src/ui/MuteButton.vue src/App.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] Game 串接音效播放/音樂、新增靜音鈕

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/sound/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：實機驗證**

Run: `npm run dev`。開始遊戲後以 chrome-devtools 確認：
`evaluate` 取 AudioContext 狀態應為 `running`（或透過無 console error + 靜音鈕可切換驗證）；
遊玩時有開火/擊殺/撿取/升級音效；點靜音鈕（🔊↔🔇）切換；無功能相關 console error。
（音效無法截圖，以「AudioContext running + 無錯誤 + 事件單元測試」交叉驗證。）

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md`，把 `progress.md` 階段 4「音效」標記完成、更新驗證快照。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/sound/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 音效功能驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（SoundEvent + World 佇列/emit=Task1）、FR-2（SoundManager=Task2）、
  FR-3（Game 串接=Task3）、FR-4（MuteButton=Task3）皆有對應。
- **型別一致：** `SoundEvent`、`soundEventQueue`/`consumeSoundEvents`、`soundManager.{resume,play,setMuted,
  startMusic,stopMusic}`、`Event = SoundEvent | 'gameover'` 跨 task 一致。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **確定性/相容：** 事件發射不影響 sim；audio 副作用；既有測試維持綠。Math.random 僅用於噪訊（非 sim）。
