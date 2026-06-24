# Spec — 隊伍動態生命感（cast-idle-animation / B2）

## Overview

為遊戲內隊伍（玩家免疫細胞 + 8 病原）加入待機微動畫，讓生物「活起來」：呼吸脈動、柔和搖擺、
擠壓拉伸、緊張抖動等，依 entity 種類給不同性格。全部以 `PixiRenderer` 每幀對 sprite 套
transform（不重畫造型）、相位錯開、幅度克制。純呈現層、不碰模擬/確定性。

## Business Requirements

- 讓角色/敵人有生命感與性格（細菌游動、自爆體緊張、超級病原沉重），提升精緻度與沉浸感。
- 維持效能（純 transform、無重畫），bullet-heaven 數百物件仍順。

## Functional Requirements

### FR-1 相位錯開
- `Sprite` 結構新增 `phase`（建立時 `Math.random()*2π`），使各單位脈動/搖擺不同步。

### FR-2 待機 transform（animate 依種類疊加）
- `PixiRenderer.animate` 依 entity 種類對 `s.root` 套待機 transform，並與既有 transform 疊加：
  - 旋轉：既有朝向（玩家 `lastMoveDir`、投射物/螺旋朝速度）**＋** 小幅 `sin` 搖擺。
  - 縮放：呼吸脈動，可用非等比 `scale.x`/`scale.y` 反相震盪（擠壓拉伸/果凍感）。
  - 位移：必要時極小幅 bob（純視覺、不影響碰撞）。
- 皆走 `this.clock` + `s.phase`，幅度克制（不暈眩、不破壞可讀性）。

### FR-3 各 entity 動態性格
- 玩家（免疫細胞）：緩慢呼吸擠壓拉伸 + 朝向加微搖擺。
- 病毒：呼吸脈動 + 緩慢小幅 wobble 旋轉。
- 細菌：游動式抖擺（較快旋轉震盪）+ 微前後 bob。
- 孢子：極緩呼吸（休眠感）。
- 螺旋菌：維持朝速度 + 沿身蠕動脈動（非等比）。
- 噴吐病原：呼吸 + 低頻較大鼓脹（蓄勢）。
- 分裂菌：較強脈動（將分裂的鼓動）。
- 自爆體：緊張快速小脈動 + 輕微抖動（快爆警示）。
- 超級病原：沉重緩慢大脈動（既有，略增）+ 微搖擺。
- 寶石/補體環：既有旋轉/脈動保留（必要時微調）。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- 待機 transform 不影響碰撞（碰撞用 `entity.pos`，視覺位移僅 `s.root`）。
- 與既有命中閃白（flash 子節點）、相機跟隨、鏡頭震動相容（各自獨立）。
- 物件大量時動畫仍只是每物件幾個 `Math.sin`，不致掉幀。
- 幅度克制：脈動/搖擺不致看不清造型或干擾瞄準。

## Data Model Changes

- `Sprite` 介面新增 `phase: number`（PixiRenderer 內部型別）；不改引擎型別/ World / store / 模擬。

## State Changes

- 無模擬狀態改動。動畫為 renderer 每幀視覺 transform。

## UI Behaviour

- 角色/敵人有待機脈動/搖擺/性格動態；前景可讀性與瞄準不受影響。

## Non-Functional Requirements

- **不碰模擬/確定性**：純 renderer 視覺、走 clock；phase 用 `Math.random`（renderer 既有慣例，如 effects 震動）。引擎/ store / 既有 181 測試零改動。
- **效能**：純 transform、無重畫；數百物件 FPS 無影響。
- 純呈現層、無新增單元測試；以 typecheck/build + 瀏覽器實機（看動態）驗證。
