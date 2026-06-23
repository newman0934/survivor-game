# Spec — 多種敵人

**日期：** 2026-06-23
**功能名稱：** multi-enemies
**所屬階段：** 階段 2 — 內容（第二項）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

目前只有單一敵人（直線追擊、固定數值）。本功能引入**多種敵人**，沿用多武器建立的
「defs 表 + kind + 無狀態行為函式」分層，做到**數值差異為主 + 少量特殊行為**。

本階段交付 **4 種敵人**：

- **basic 基礎追擊兵** — 中等數值，直線追玩家（現有行為，保留為起始敵種）。
- **swarm 群襲小怪** — hp 低、速度快、體型小、傷害低；一次成群生成。
- **tank 坦克** — hp 高、速度慢、體型大、傷害高、xp 高。
- **charger 衝刺者**（特殊行為）— 平時慢走，週期性朝玩家方向高速衝刺後錯身。

敵種依**時間解鎖 + 加權隨機**登場：前期只有 basic/swarm，較強者隨時間混入。

---

## 2. Business Requirements（商業需求）

- 提供敵人多樣性與難度層次，是 survivor-like 類型的核心壓力來源。
- 沿用多武器的可擴充分層，為後續 Boss、敵人專屬掉落等預留結構。
- 不破壞既有架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（seeded rng）；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 敵人為帶 enemyKind 的資料
- `Entity` 新增可選欄位 `enemyKind`（決定數值/顏色/行為）與 `behaviorTimer`（charger 用）。
- `kind` 仍維持 `'enemy'`，碰撞、接觸傷害、擊殺掉寶、篩除等既有邏輯不變。

### FR-2 敵人定義表
- `systems/enemyDefs.ts` 提供 `ENEMY_DEFS[kind]`，逐種定義：
  `hp / speed / damage / radius / xp / color / unlockTime / spawnWeight`，charger 另含
  `walkSpeed / dashSpeed / walkTime / dashTime`。

### FR-3 時間解鎖 + 加權隨機選種
- `systems/spawn.ts` 新增 `pickEnemyKind(elapsed, rng)`：
  從「`elapsed >= unlockTime`」的種類中依 `spawnWeight` 加權抽一種；走 seeded rng。
- 保留既有 `spawnInterval`（節奏）與 `spawnPositionAround`（位置）。

### FR-4 敵人 AI
- `systems/enemyAI.ts` 提供 `steerEnemy(e, target, dt)`：
  - basic / swarm / tank → 既有 `steerTowards`（直線追擊）。
  - charger → 狀態機：`behaviorTimer += dt`，依 `timer % (walkTime+dashTime)` 判定相位；
    走路相每格慢速轉向；跨越「走→衝」邊界的那一格鎖定當下朝玩家方向、設 `vel = dir×dashSpeed`；
    衝刺相中保持該 `vel`（不再轉向）。

### FR-5 factory 依種類建怪
- `createEnemy(pos, kind)` 讀 `ENEMY_DEFS[kind]` 套數值，並設 `enemyKind`；charger 初始
  `behaviorTimer = 0`。

### FR-6 World 生怪與群襲
- 生怪段改為：到點時 `pickEnemyKind` 決定種類 → 在環上生成。
- 抽到 swarm 時，於生成點附近以**固定角度偏移**一次生成 **4 隻**（其餘種類單生）；偏移為定值，
  不額外耗用 rng。
- 敵人 AI 迴圈改呼叫 `steerEnemy`。

### FR-7 渲染
- `PixiRenderer` 對 `kind === 'enemy'` 改依 `enemyKind` 取色（半徑已隨 factory 不同）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：四種敵人可依時間解鎖加權生成、各自數值/顏色正確、charger 衝刺行為
正確、swarm 成群生成；確定性與引擎邊界不變；單元測試 / 型別 / build 全綠。

---

## 5. Edge Cases（邊界情況）

- **t=0**：候選只有 basic + swarm；`pickEnemyKind` 不回傳未解鎖種類（tank/charger）。
- **charger 衝刺中錯身**：保持衝刺 vel、不黏著玩家（設計意圖）。
- **swarm 生成點貼邊**：固定偏移後仍在環附近，可接受、不特別處理。
- **武器命中各敵種**：傷害結算不分敵種（沿用 `e.hp -= dmg`）。
- **charger 初次進入遊戲**：`behaviorTimer=0` 起於走路相，modulo 自動循環、無需清理。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type EnemyKind = 'basic' | 'swarm' | 'tank' | 'charger'

export interface Entity {
  // ...既有欄位不變...
  /** 敵人子種類（僅 kind==='enemy' 使用）；決定數值/顏色/行為。 */
  enemyKind?: EnemyKind
  /** charger 行為相位時鐘（秒）；其他敵種忽略。 */
  behaviorTimer?: number
}

// 敵人定義
export interface EnemyDef {
  kind: EnemyKind
  hp: number
  speed: number      // 一般追擊速度（charger 為走路速）
  damage: number
  radius: number
  xp: number
  color: number
  unlockTime: number // 自開局幾秒後才可能生成
  spawnWeight: number
  // charger 專屬（其他種類省略）
  dashSpeed?: number
  walkTime?: number
  dashTime?: number
}
```

```ts
// systems/enemyDefs.ts
export const ENEMY_DEFS: Record<EnemyKind, EnemyDef>
export const ENEMY_ORDER: EnemyKind[] // 確定性迭代用

// systems/spawn.ts（新增）
export function pickEnemyKind(elapsed: number, rng: Rng): EnemyKind

// systems/enemyAI.ts（新檔）
export function steerEnemy(e: Entity, target: Vec2, dt: number): void

// entities/factory.ts（簽章變更）
export function createEnemy(pos: Vec2, kind?: EnemyKind): Entity // 預設 'basic'
```

- `Summary` 不變；store 橋接不變。

---

## 7. Data Model Changes（資料模型變更）

- `Entity` 新增可選欄位 `enemyKind?`、`behaviorTimer?`。
- 新增 `EnemyKind`、`EnemyDef` 型別與 `ENEMY_DEFS`、`ENEMY_ORDER` 常數。
- `createEnemy` 簽章新增 `kind` 參數（預設 `'basic'`，向後相容既有呼叫）。

---

## 8. State Changes（狀態變更）

- World 生怪段：由「固定 createEnemy」改為「`pickEnemyKind` → 建怪（swarm 成群）」。
- World 敵人 AI 迴圈：由直接 `steerTowards` 改為 `steerEnemy`（charger 走狀態機）。
- 其餘流程（碰撞、接觸傷害、掉寶、升級握手）不變。

---

## 9. UI Behaviour（UI 行為）

- HUD / 選單 / 升級彈窗不變（不需逐敵種資訊）。
- 渲染：不同敵種以不同顏色與半徑呈現（見 §3 FR-7 與數值表）。

---

## 10. Non-Functional Requirements（非功能需求）

- **架構邊界**：`enemyDefs.ts`、`enemyAI.ts`、`spawn.ts`、`types.ts` 皆純 TS，無 Vue/Pinia。
- **確定性**：選種與位置全走 seeded rng；固定步長 1/60 不變。
- **TDD**：spawn 選種、enemyAI、factory、World 群襲先寫失敗測試；renderer/迴圈/UI 不寫單元測試。
- **效能**：敵種增加不改變資料結構規模；`Array.filter` 清理照舊。物件池/空間網格留待後續。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` 維持冪等。

---

## 11. 數值表（草案，定稿於 enemyDefs.ts）

| 種類 | hp | speed | damage | radius | xp | color | unlockTime | weight |
|------|----|----|----|----|----|------|------|------|
| basic | 10 | 60 | 5 | 12 | 1 | 0xff5252 | 0 | 50 |
| swarm | 4 | 110 | 3 | 8 | 1 | 0xff9d5c | 0 | 35 |
| tank | 60 | 35 | 12 | 20 | 5 | 0x8e2b2b | 45 | 12 |
| charger | 18 | 45（走） | 10 | 13 | 4 | 0xe91e63 | 90 | 10 |

charger 另：`dashSpeed 320`、`walkTime 2.5`、`dashTime 0.5`。swarm 群襲一次 4 隻。

---

## 12. 非目標（本 spec 明確不做）

- 遠程射擊敵人（會引入敵方投射物機制）。
- Boss 敵人（下一個 spec）。
- 敵人 hp 隨時間額外加成、敵人專屬掉落物、敵人受擊動畫。
