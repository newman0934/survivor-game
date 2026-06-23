# Spec — 打擊反饋特效（A 批）

**日期：** 2026-06-23
**功能名稱：** effects-feedback
**所屬階段：** 美術精修（程式化美術延伸，A 批：動態反饋）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

為畫面加入打擊回饋特效：**擊殺粒子爆裂**、**寶石收集閃光**、**升級光環**、**傷害數字跳字**、
**受傷紅暈 + 鏡頭震動**。全部走呈現層——新增 `engine/effects.ts`（`EffectsLayer`，管理特效生命週期），
由 `PixiRenderer` 自行偵測事件（敵人/寶石 sprite 消失、hp 下降、等級上升沿）後 spawn。

引擎接觸面僅 `World` 加一個唯讀 `get currentLevel()`（供升級偵測）；模擬、碰撞、確定性、
既有測試完全不受影響。特效不進 sim、走 renderer clock。

---

## 2. Business Requirements（商業需求）

- 補足 bullet-heaven 核心的「成群擊殺回饋感」：敵人不再瞬間消失，撿寶石/升級/受傷都有明確反饋。
- 零素材依賴、純程式繪製，完全可在本環境產出。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長；特效純呈現、不碰模擬。

---

## 3. Functional Requirements（功能需求）

### FR-1 EffectsLayer 模組（engine/effects.ts，呈現層）
- 新增 `class EffectsLayer`，責任單一：管理視覺特效的生命週期（spawn → 每幀 update 推進壽命/淡出 → 自動回收）。
- 持兩個 PixiJS `Container`：
  - **worldFx**：加在鏡頭容器內（隨平移）—— 擊殺粒子、收集閃光、升級光環、傷害數字。
  - **screenFx**：加在 stage 螢幕固定層 —— 受傷紅暈。
- 內部以陣列維護活躍特效；每個特效有壽命 `life`/`maxLife`，`update` 推進、壽命到即移除並 destroy 其 Graphics/Text。

### FR-2 事件偵測接線（PixiRenderer.render）
- **擊殺**：回收迴圈中 `e.kind==='enemy'` 的 sprite 消失 → `spawnKill(e.pos.x, e.pos.y, color)`，
  color 取 `ENEMY_DEFS[e.enemyKind].color`（boss 用其色）。
- **收集**：回收迴圈中 `e.kind==='gem'` 消失 → `spawnPickup(e.pos.x, e.pos.y)`。
- **傷害數字**：每幀比對敵人 `hp`，`e.hp < prevHp` 時 `spawnDamage(e.pos.x, e.pos.y, prevHp - e.hp)`（複用既有 `lastHp`）。
- **受傷紅暈/震動**：`player.hp < prevPlayerHp` 時 `hurt(intensity)`，intensity 依扣血量推估（boss 撞擊更強）。
- **升級光環**：比對 `world.currentLevel` 上升沿 → `spawnLevelUp(player.pos.x, player.pos.y)`。

### FR-3 擊殺特效（spawnKill）
- 以敵色生成 8–10 個小圓粒子，隨機方向噴射 + 微重力下墜，0.4s 內淡出縮小。
- 同時一圈快速擴張的環形衝擊波（描邊圓，淡出）。

### FR-4 收集閃光（spawnPickup）
- 寶石位置一個亮綠星芒 + 快速擴張淡出的光圈（約 0.25s）。

### FR-5 升級光環（spawnLevelUp）+ World.currentLevel
- 玩家身上金色光環向外擴張一圈 + 少量上升光點（約 0.6s）。
- `World` 新增唯讀 `get currentLevel(): number`（曝露既有私有 `level`，不改任何模擬邏輯）。

### FR-6 傷害數字（spawnDamage）+ 節流
- 白色小數字（PixiJS `Text`）向上飄 + 淡出（約 0.5s）。
- **節流**：同時存活上限 `MAX_DAMAGE_TEXTS`（如 24）；達上限不再生成新字。

### FR-7 受傷紅暈 + 鏡頭震動（hurt / update）
- **紅暈**：螢幕四邊向內的紅色漸層 vignette（screenFx），`hurt` 時 alpha 拉高、每幀衰減。
- **鏡頭震動**：`hurt` 設定 `shakeIntensity`，每幀衰減；`update()` 回傳 `{shakeX, shakeY}`
  （衰減 × 偽隨機方向），PixiRenderer 把它加到鏡頭 position。

### FR-8 效能 / 節流（共通）
- 擊殺粒子全域上限 `MAX_PARTICLES`（如 200）；達上限新擊殺只出環形波、不出碎屑。
- 所有特效固定壽命自動回收，不累積；長時間遊玩不漏記憶體、不掉 FPS。

### FR-9 不變項
- `drawPlayer/drawEnemy/...` 造型與既有命中閃白、動畫、相機跟隨照舊。
- 模擬、碰撞、生怪、難度倍率、entity 造型、store/Summary 完全不變。
- `Game.stop()` / `PixiRenderer.destroy()` / `EffectsLayer.destroy()` 冪等。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：擊殺迸發粒子/環波、撿寶石閃光、升級光環、傷害數字（含節流）、
受傷紅暈 + 鏡頭震動皆如設計；既有 122 測試全綠、型別/build 乾淨、實機驗證、0 功能相關 console error、FPS 正常。

---

## 5. Edge Cases（邊界情況）

- **大量同時擊殺**：粒子達上限只出環波；傷害數字達上限不生成新字 —— 不卡頓。
- **敵人消失語意**：敵人僅因死亡離開 `activeEnemies()`；以「sprite 消失」推斷擊殺視覺足夠。
- **寶石消失語意**：寶石離開 `gems()` 視為收集 → 閃光。
- **升級時迴圈暫停**：升級瞬間 level+1、進 upgrading 暫停；恢復後 render 偵測上升沿觸發光環（時機合理）。
- **重新開始**：`destroy()` 清空所有特效容器與陣列（冪等），不殘留。
- **視窗 resize**：紅暈依當前螢幕尺寸重畫（`resize`）。
- **確定性**：特效不進 sim；鏡頭震動偽隨機僅影響視覺、不影響模擬結果。

---

## 6. API Contracts（介面契約）

```ts
// engine/effects.ts
export class EffectsLayer {
  constructor(worldContainer: Container, screenContainer: Container, screenW: number, screenH: number)
  spawnKill(x: number, y: number, color: number): void
  spawnPickup(x: number, y: number): void
  spawnLevelUp(x: number, y: number): void
  spawnDamage(x: number, y: number, amount: number): void
  hurt(intensity: number): void
  update(): { shakeX: number; shakeY: number }
  resize(screenW: number, screenH: number): void
  destroy(): void
}

// World.ts
get currentLevel(): number // 唯讀，曝露既有私有 level
```

- 引擎模擬 / 型別 / store / Summary 介面不變。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `engine/effects.ts`（`EffectsLayer` + 內部特效型別）。
- `World` 新增唯讀 `get currentLevel()`（不新增可變狀態）。
- `PixiRenderer` 新增 `EffectsLayer` 欄位 + 偵測接線 + 鏡頭震動偏移。

---

## 8. State Changes（狀態變更）

- 特效狀態（活躍粒子/飄字/紅暈/震動量）全部存於 `EffectsLayer`（呈現層），不進 World、不進 store。
- 無模擬狀態變更。

---

## 9. UI Behaviour（UI 行為）

- 遊戲畫面：擊殺有爆裂、撿寶石有閃光、升級有光環、命中飄傷害數字、受傷螢幕紅暈 + 輕微震動。
- HUD / 選單 / 升級彈窗 / Boss 血條 / 死亡結算不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：特效純視覺、不進 sim、走 renderer clock；鏡頭震動偽隨機不影響模擬。
- **架構邊界**：新增 `effects.ts`（呈現層）+ `PixiRenderer` 接線 + `World` 一個唯讀 getter；
  引擎模擬 / store / 型別契約不變。
- **效能**：固定上限粒子池 + 飄字上限 + 壽命自動回收；維持原 FPS。
- **測試**：呈現層膠水不寫單元測試（同 sprite-polish）；既有 122 測試維持全綠（引擎不動）+ 實機驗證。
- **資源清理**：`EffectsLayer.destroy()` 與 `PixiRenderer.destroy()` 冪等。

---

## 11. 非目標（本 spec 明確不做）

- 寶石/投射物/聖經/寶箱的靜態造型精緻化（屬 B 批）。
- HUD/UI 動畫（屬 C 批）。
- 暴擊系統 / 傷害類型顏色分類（傷害數字暫統一樣式）。
- 進 World 的帶位置事件佇列（方案 B，已否決）。
- 外部素材 / shader / 後製濾鏡。
