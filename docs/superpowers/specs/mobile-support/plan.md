# 手機支援（觸控 + RWD）— 實作計畫

> **給執行者：** TDD、bite-sized 步驟。`joystickVector` 純函式先寫失敗測試；TouchInput 事件、
> renderer 搖桿、RWD 為膠水/視覺層，不寫單元測試，以行動裝置模擬驗證。既有 107 測試維持全綠。
> 每個 task 一個邏輯變更、各自 commit。

**目標：** 手機瀏覽器可用浮動虛擬搖桿遊玩並做 RWD；桌機鍵盤不受影響（兩者並存）。

**架構：** `TouchInput`（core，Pointer Events）產生方向，Game 合併「觸控優先、否則鍵盤」寫入
`world.moveInput`；搖桿畫在 PixiRenderer 的螢幕固定 `ui` 層；RWD 在 index.html 與 MainMenu。

**技術棧：** TypeScript、Vitest、PixiJS v8、Vue 3。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/core/touchInput.ts` | joystickVector + TouchInput | 建立 |
| `src/engine/core/touchInput.test.ts` | joystickVector 單元測試 | 建立 |
| `src/engine/Game.ts` | touch 欄位、合併輸入、drawJoystick | 修改 |
| `src/engine/PixiRenderer.ts` | 螢幕 ui 層 + drawJoystick | 修改 |
| `index.html` | viewport / touch-action / overscroll | 修改 |
| `src/ui/MainMenu.vue` | 窄螢幕 media query | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：TouchInput 與 joystickVector

**Files:**
- Create: `src/engine/core/touchInput.ts`
- Test: `src/engine/core/touchInput.test.ts`

- [ ] **Step 1：寫失敗測試**

```ts
import { describe, it, expect } from 'vitest'
import { joystickVector } from './touchInput'

describe('joystickVector', () => {
  it('死區內回零向量', () => {
    expect(joystickVector(100, 100, 105, 103, 12)).toEqual({ x: 0, y: 0 })
  })
  it('死區外回正規化單位向量（朝右）', () => {
    const v = joystickVector(100, 100, 160, 100, 12)
    expect(v.x).toBeCloseTo(1, 5)
    expect(v.y).toBeCloseTo(0, 5)
  })
  it('斜向正規化（大小約 1）', () => {
    const v = joystickVector(0, 0, 50, 50, 12)
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 5)
    expect(v.x).toBeCloseTo(0.7071, 3)
    expect(v.y).toBeCloseTo(0.7071, 3)
  })
  it('恰等於死區邊界視為死區內', () => {
    expect(joystickVector(0, 0, 12, 0, 12)).toEqual({ x: 0, y: 0 })
  })
})
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- touchInput`
Expected: FAIL（模組不存在）

- [ ] **Step 3：實作 touchInput.ts**

```ts
/**
 * 觸控輸入（浮動虛擬搖桿）。
 *
 * 用 Pointer Events（touch + 滑鼠通用）：按下記錄原點，拖曳方向即移動方向，放開停止。
 * 與 KeyboardInput 同層的純 TS 輸入源；不依賴 Vue/Pinia。
 */
import type { Vec2 } from './vector'

/**
 * 由搖桿原點與當前點算出移動方向。
 * @returns 距離 ≤ deadzone 時回 {0,0}；否則回正規化單位向量（方向 = cur − origin）。
 */
export function joystickVector(ox: number, oy: number, cx: number, cy: number, deadzone: number): Vec2 {
  const dx = cx - ox
  const dy = cy - oy
  const len = Math.hypot(dx, dy)
  if (len <= deadzone) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

/** 搖桿死區（px）。 */
const DEADZONE = 12

/**
 * 觸控輸入狀態機。輪詢式（與 KeyboardInput 一致）：迴圈每幀讀 direction()。
 * 只追蹤第一個按下的 pointer（多指忽略其餘）。
 */
export class TouchInput {
  /** 搖桿視覺/計算狀態（元素內座標）；供 renderer 讀取。 */
  readonly joystick = { active: false, ox: 0, oy: 0, cx: 0, cy: 0 }
  private el: HTMLElement | null = null
  private pointerId: number | null = null

  private localXY(e: PointerEvent): { x: number; y: number } {
    const r = this.el!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onDown = (e: PointerEvent): void => {
    if (this.pointerId !== null) return // 已有第一指，忽略其餘
    this.pointerId = e.pointerId
    const p = this.localXY(e)
    this.joystick.active = true
    this.joystick.ox = this.joystick.cx = p.x
    this.joystick.oy = this.joystick.cy = p.y
  }
  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    const p = this.localXY(e)
    this.joystick.cx = p.x
    this.joystick.cy = p.y
  }
  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return
    this.pointerId = null
    this.joystick.active = false
  }

  /** 開始監聽（down 綁元素、move/up 綁 window 以接住拖出元素的情況）。 */
  attach(el: HTMLElement): void {
    this.el = el
    el.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
  }

  /** 停止監聽並清空狀態。 */
  detach(): void {
    if (this.el) this.el.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    this.el = null
    this.pointerId = null
    this.joystick.active = false
  }

  /** @returns 目前搖桿方向（active 時的正規化向量，否則 {0,0}）。 */
  direction(): Vec2 {
    if (!this.joystick.active) return { x: 0, y: 0 }
    return joystickVector(this.joystick.ox, this.joystick.oy, this.joystick.cx, this.joystick.cy, DEADZONE)
  }
}
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- touchInput`
Expected: PASS

- [ ] **Step 5：commit**

```bash
git add src/engine/core/touchInput.ts src/engine/core/touchInput.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增 TouchInput（浮動虛擬搖桿）與 joystickVector

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2：Game 合併輸入 + Renderer 畫搖桿

**Files:**
- Modify: `src/engine/Game.ts`
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：PixiRenderer 新增螢幕 ui 層與 drawJoystick**

在建構子（`this.garlicAura = new Graphics(); this.world.addChild(this.garlicAura)` 之後）新增：

```ts
    // UI 層：固定於螢幕（加在 stage、不在會平移的 world 容器），畫觸控搖桿。
    this.ui = new Container()
    app.stage.addChild(this.ui)
    this.joystickGfx = new Graphics()
    this.ui.addChild(this.joystickGfx)
```

並在類別欄位區宣告：

```ts
  /** 螢幕固定 UI 層（觸控搖桿）。 */
  private ui: Container
  /** 觸控搖桿繪製。 */
  private joystickGfx: Graphics
```

在 `render()` 方法之後新增：

```ts
  /**
   * 畫觸控搖桿（螢幕座標）。active 時於原點畫底座圈 + 旋鈕（夾在半徑內）；否則清空。
   * @param js 觸控搖桿狀態（元素內座標）。
   */
  drawJoystick(js: { active: boolean; ox: number; oy: number; cx: number; cy: number }): void {
    this.joystickGfx.clear()
    if (!js.active) return
    const max = 48
    const dx = js.cx - js.ox
    const dy = js.cy - js.oy
    const len = Math.hypot(dx, dy) || 1
    const k = Math.min(1, max / len)
    const kx = js.ox + dx * k
    const ky = js.oy + dy * k
    this.joystickGfx.circle(js.ox, js.oy, max).fill({ color: 0xffffff, alpha: 0.12 })
    this.joystickGfx.circle(js.ox, js.oy, max).stroke({ width: 2, color: 0xffffff, alpha: 0.25 })
    this.joystickGfx.circle(kx, ky, 22).fill({ color: 0xffffff, alpha: 0.3 })
  }
```

> `Container` 已在既有 import（`import { Application, Container, Graphics } from 'pixi.js'`）。
> `destroy()` 既有 `app.destroy(true, { children: true })` 會一併銷毀 ui 層，無需額外處理。

- [ ] **Step 2：Game 接入 TouchInput**

`Game.ts` 檔頭新增 import：

```ts
import { TouchInput } from './core/touchInput'
```

新增欄位（`private input = new KeyboardInput()` 附近）：

```ts
  private touch = new TouchInput()
```

在 `start()` 內 `game.input.attach()` 之後新增：

```ts
    game.touch.attach(canvasParent)
```

在 `loop` 內把
```ts
      this.world.moveInput = this.input.direction()
```
改為
```ts
      const tdir = this.touch.direction()
      this.world.moveInput = (tdir.x !== 0 || tdir.y !== 0) ? tdir : this.input.direction()
```

在 `loop` 結尾 `this.renderer.render(this.world)` 之後新增：

```ts
    this.renderer.drawJoystick(this.touch.joystick)
```

在 `stop()` 內 `this.input.detach()` 之後新增：

```ts
    this.touch.detach()
```

- [ ] **Step 3：型別檢查 + build + 既有測試**

Run: `npm test && npm run typecheck && npm run build`
Expected: 既有 107 + touchInput 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 4：commit**

```bash
git add src/engine/Game.ts src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] Game 合併觸控/鍵盤輸入並繪製螢幕搖桿

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：RWD（index.html + MainMenu）

**Files:**
- Modify: `index.html`
- Modify: `src/ui/MainMenu.vue`

- [ ] **Step 1：index.html viewport 與觸控行為**

把 `<meta name="viewport" ...>` 改為：

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

把 `<style>` 內的規則改為：

```html
    <style>
      html, body, #app {
        margin: 0; height: 100%; overflow: hidden; background: #111;
        touch-action: none; overscroll-behavior: none;
        user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent;
      }
    </style>
```

- [ ] **Step 2：MainMenu 加窄螢幕 media query**

在 `MainMenu.vue` 的 `<style scoped>` 末尾新增：

```css
@media (max-width: 600px) {
  .overlay { gap: 0.4rem; padding: 0.5rem; }
  h1 { font-size: 2rem; margin-bottom: 0.2rem; }
  .row { gap: 0.5rem; }
  .card { width: 6.8rem; padding: 0.5rem; }
  .name { font-size: 0.95rem; }
  .desc { font-size: 0.72rem; }
  .start { font-size: 1.2rem; padding: 0.5rem 1.6rem; }
}
```

- [ ] **Step 3：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 4：commit**

```bash
git add index.html src/ui/MainMenu.vue
git commit -m "$(cat <<'EOF'
[mvp][feat][ui] RWD：視口/觸控行為設定與主選單窄螢幕 media query

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/mobile-support/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：行動裝置模擬驗證**

Run: `npm run dev`，於 chrome-devtools 以行動裝置視口（如 iPhone）模擬：
確認主選單在窄螢幕卡片縮小可用；進遊戲後在畫面拖曳出現搖桿、玩家朝拖曳方向移動、放開停止；
頁面不捲動/縮放；無功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依結果勾選 `acceptance.md`，在 `progress.md` 新增一條「手機支援（觸控 + RWD）」完成記錄、更新驗證快照。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/mobile-support/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 手機支援驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1（TouchInput/joystickVector=Task1）、FR-2（Game 合併=Task2）、
  FR-3（renderer 搖桿=Task2）、FR-4（RWD=Task3）皆有對應。
- **型別一致：** `joystickVector(ox,oy,cx,cy,deadzone)`、`TouchInput.attach/detach/direction/joystick`、
  `drawJoystick(js)`、`Game.touch` 跨 task 一致；joystick 狀態物件欄位 {active,ox,oy,cx,cy} 一致。
- **無 placeholder：** 所有步驟含實際程式碼與指令。
- **相容性：** 觸控無輸入回 {0,0} → Game fallback 鍵盤；桌機不受影響。Container 已 import。
