# 隊伍動態生命感（cast-idle-animation / B2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans（建議 inline，含瀏覽器看動態微調）或 superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`) syntax.
>
> **執行建議：Inline**——動畫需瀏覽器實機看動態邊調幅度/頻率（數值僅起始值）。

**Goal:** 為玩家 + 8 病原加入待機微動畫（呼吸/搖擺/擠壓/抖動，各種性格），純 transform、不重畫。

**Architecture:** `PixiRenderer`：`Sprite` 加隨機 `phase` 錯開，`animate` 依 entity 種類疊加待機 transform（與既有旋轉/縮放疊加）。不碰 sprites.ts/引擎/模擬。

**Tech Stack:** PixiJS v8 `Container` transform、TypeScript。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文。
- 純呈現層：只動 `src/engine/PixiRenderer.ts`；不碰 World/模擬/store/sprites.ts/確定性。
- 待機 transform 僅套 `s.root`、不影響碰撞（碰撞用 entity.pos）；與命中閃白/相機/震動相容。
- 既有 181 測試維持全綠；數值為起始值，inline 以瀏覽器微調（幅度克制、不暈眩）。
- phase 用 `Math.random`（renderer 既有慣例，如 effects 震動）；模擬無 Math.random。
- Commit 格式：`[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

---

### Task 1: Sprite 相位 + animate 待機動畫 + 驗證

**Files:**
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/cast-idle-animation/acceptance.md`

- [ ] **Step 1: `Sprite` 介面加 `phase`**

把：

```ts
interface Sprite {
  root: Container
  flash: Graphics
  /** 最後被處理的 frame 序號；render 結尾據此回收本幀未出現者（免每幀配置 Set）。 */
  lastSeen: number
}
```

改為（加 phase）：

```ts
interface Sprite {
  root: Container
  flash: Graphics
  /** 最後被處理的 frame 序號；render 結尾據此回收本幀未出現者（免每幀配置 Set）。 */
  lastSeen: number
  /** 待機動畫相位（建立時隨機，使各單位脈動/搖擺錯開、不同步）。 */
  phase: number
}
```

- [ ] **Step 2: `spriteFor` 建立時設 phase**

把：

```ts
      s = { root, flash, lastSeen: this.frameId }
```

改為：

```ts
      s = { root, flash, lastSeen: this.frameId, phase: Math.random() * Math.PI * 2 }
```

- [ ] **Step 3: 改寫 `animate` 加待機 transform（各 entity 性格）**

把整個 `animate` 方法改為：

```ts
  /** 依 entity 種類套用每幀動畫 transform（純視覺；待機脈動/搖擺以 clock + sprite phase 驅動）。 */
  private animate(e: Entity, s: Sprite, world: World): void {
    const t = this.clock, ph = s.phase
    switch (e.kind) {
      case 'gem':
        s.root.rotation = t * 1.5
        s.root.scale.set(1 + 0.08 * Math.sin(t * 4))
        break
      case 'orbit':
        s.root.rotation = t * 3
        break
      case 'projectile':
        s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
        break
      case 'player': {
        // 細胞：朝向 + 微搖擺；緩慢呼吸擠壓拉伸（果凍感）
        s.root.rotation = Math.atan2(world.lastMoveDir.y, world.lastMoveDir.x) + 0.06 * Math.sin(t * 2 + ph)
        const b = 0.05 * Math.sin(t * 1.8 + ph)
        s.root.scale.set(1 + b, 1 - b)
        break
      }
      case 'enemy': {
        switch (e.enemyKind) {
          case 'superbug': {
            const p = 0.05 * Math.sin(t * 3 + ph) // 沉重大脈動
            s.root.scale.set(1 + p, 1 + p)
            s.root.rotation = 0.04 * Math.sin(t * 1.2 + ph)
            break
          }
          case 'spiral': {
            s.root.rotation = Math.atan2(e.vel.y, e.vel.x)
            const w = 0.06 * Math.sin(t * 6 + ph) // 沿身蠕動
            s.root.scale.set(1 + w, 1 - w)
            break
          }
          case 'bacteria':
            // 游動式抖擺：朝速度 + 較快旋轉震盪（鞭毛擺游）
            s.root.rotation = Math.atan2(e.vel.y, e.vel.x) + 0.18 * Math.sin(t * 9 + ph)
            break
          case 'spore': {
            const p = 0.03 * Math.sin(t * 1.2 + ph) // 極緩呼吸（休眠）
            s.root.scale.set(1 + p, 1 + p)
            break
          }
          case 'spitter': {
            const p = Math.max(0, Math.sin(t * 1.5 + ph)) * 0.08 // 偏鼓脹蓄勢
            s.root.scale.set(1 + p * 1.4, 1 + p)
            break
          }
          case 'splitter': {
            const p = 0.07 * Math.sin(t * 4 + ph) // 將分裂的鼓動
            s.root.scale.set(1 + p, 1 + p)
            break
          }
          case 'exploder': {
            const p = 0.05 * Math.sin(t * 11 + ph) // 緊張快脈動
            s.root.scale.set(1 + p, 1 + p)
            s.root.rotation = 0.05 * Math.sin(t * 23 + ph) // 抖動
            break
          }
          default: {
            // virus（及其他）：呼吸脈動 + 緩慢 wobble 旋轉（懸浮）
            const p = 0.045 * Math.sin(t * 2.4 + ph)
            s.root.scale.set(1 + p, 1 + p)
            s.root.rotation = 0.08 * Math.sin(t * 1.5 + ph)
          }
        }
        break
      }
    }
  }
```

- [ ] **Step 4: typecheck + 測試 + build**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 181 全綠（引擎零影響）
Run: `npm run build` → 乾淨

- [ ] **Step 5: 瀏覽器實機驗證（看動態）**

啟動 dev，玩一場：確認玩家細胞呼吸/搖擺、病毒懸浮 wobble、細菌游動抖擺、自爆體緊張快脈動、超級病原沉重脈動，各單位相位錯開、幅度克制不暈眩、可讀性與瞄準不受影響、FPS 正常。依觀感微調各頻率/幅度。

- [ ] **Step 6: 更新 acceptance.md 與 progress.md**

勾選 acceptance 各項並填驗證日期；progress.md 階段 4 美術處補一行「隊伍動態生命感（B2）：待機呼吸/搖擺/擠壓/抖動微動畫（純 transform、相位錯開）→ specs/cast-idle-animation/」。

- [ ] **Step 7: Commit**

```bash
git add src/engine/PixiRenderer.ts progress.md docs/superpowers/specs/cast-idle-animation/acceptance.md
git commit -m "[mvp][feat][art] 隊伍待機微動畫（呼吸/搖擺/擠壓/抖動，各病原性格、相位錯開）（B2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 相位錯開**：Step 1/2 `Sprite.phase` + spriteFor 隨機。✅
- **FR-2 待機 transform 疊加**：Step 3 旋轉（朝向 + sin 搖擺）+ 縮放（呼吸/擠壓）+ 走 clock+phase。✅
- **FR-3 各 entity 性格**：Step 3 玩家/病毒/細菌/孢子/螺旋/噴吐/分裂/自爆/超級各自動態。✅
- **不變項**：只動 PixiRenderer；碰撞用 entity.pos（transform 僅 s.root）；181 測試於 Step 4 驗證。✅
- **Placeholder 掃描**：無 TBD；完整程式碼/指令。✅
