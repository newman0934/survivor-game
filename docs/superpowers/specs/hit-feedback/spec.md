# Spec — 打擊反饋特效強化（hit-feedback / B3）

## Overview

強化戰鬥的打擊反饋：每次命中在撞擊點噴**火花 + 主題色體液濺射**；敵人死亡依**病原種類**呈現不同
死亡特效（細菌體液、病毒外殼碎裂、孢子爆孢、自爆大爆裂、超級病原加大版）。全部在 `EffectsLayer`
（effects.ts）+ PixiRenderer 事件偵測，純呈現層、不碰模擬/確定性；粒子數克制、靠既有上限保護。

## Business Requirements

- 讓命中與擊殺更有打擊感與份量（目前命中只有傷害數字 + 閃白、死亡所有敵人同一種爆裂），提升手感與精緻度。
- 維持效能（bullet-heaven 高頻命中/擊殺仍順）。

## Functional Requirements

### FR-1 命中火花 / 濺紅（spawnHit）
- `EffectsLayer` 新增 `spawnHit(x, y, color)`：
  - 一小撮**亮火花**（白/亮黃、快、無或低重力、極短壽 ~0.2s），數量克制（~3）。
  - 幾顆**主題色體液滴**（敵人 `color`、帶輕重力、像濺血），數量克制（~2）。
  - 皆走既有粒子系統（位置/壽命/淡出/縮小），接 bloom。
- 撞擊點用敵人位置（命中時 PixiRenderer 已知）。

### FR-2 接線（PixiRenderer）
- PixiRenderer 在偵測敵人 hp 下降處（現呼叫 `spawnDamage` 傷害數字）**加呼叫** `spawnHit(敵人pos, 敵人色)`。
- 敵人色取自 `ENEMY_DEFS[enemyKind].color`（PixiRenderer 既有取色邏輯）。

### FR-3 逐病原死亡特效（spawnKill 依 kind）
- `spawnKill` 擴充接受 `enemyKind`（PixiRenderer 在敵 sprite 消失時一併傳入），依種類差異化：
  - **細菌**：體液大濺射（較多液滴、低重力四散）。
  - **病毒**：外殼碎裂（多片小**多邊形碎片**飛散）。
  - **孢子**：爆孢（一圈小孢子點放射）。
  - **自爆體**：大爆裂（大環 + 大量碎屑；死亡已另觸發 nova fx，這裡補碎屑）。
  - **超級病原**：加大版（更大環 + 更多碎屑）。
  - **其餘**（螺旋/噴吐/分裂）：既有基礎爆裂（或輕度差異）。
- 碎片以小多邊形 Graphics 走既有粒子系統。

### FR-4 效能克制
- 每事件粒子數克制；靠既有 `MAX_PARTICLES=200` 上限保護（達上限時略過新增粒子）。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 高頻命中/大量擊殺：粒子達上限時略過，不爆量、不掉幀。
- 特效不影響模擬（碰撞/傷害/掉落由引擎計）；純視覺。
- 重新開始 / destroy：既有 EffectsLayer.destroy 清掉所有粒子（spawnHit 新增的粒子走同系統，一併清）。
- 敵人色未知（理論上不會）：退回預設色，不丟例外。

## Data Model Changes

- 無。擴充 `src/engine/effects.ts`（`spawnHit` + `spawnKill` 依 kind）與 `src/engine/PixiRenderer.ts`（接線）；不改引擎型別/ World / store / 模擬。
- `spawnKill` 簽章新增選用 `kind?: EnemyKind` 參數（呈現層型別）。

## State Changes

- 無模擬狀態改動。特效為 renderer 短生命週期視覺。

## UI Behaviour

- 命中有火花 + 濺紅、擊殺依病原差異化死亡；前景可讀性維持（特效短壽、克制）。

## Non-Functional Requirements

- **不碰模擬/確定性**：純 renderer 特效；effects 既有用 `Math.random`（呈現層）。引擎/ store / 既有 181 測試零改動。
- **效能**：純粒子、走既有 update 與上限；高頻仍順。
- 純呈現層、無新增單元測試；以 typecheck/build + 瀏覽器實機（打怪看特效）驗證。
