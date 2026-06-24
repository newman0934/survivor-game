# Spec — 遊戲內隊伍造型材質 + 發光（cast-material-polish / B1）

## Overview

為遊戲內全隊伍（4 免疫細胞角色 + 8 病原敵人 + 投射物）升級造型**材質與光影**：新增一組共用
材質 helper（膜透光 / 內陰影 / 邊光 / 高光 / 發光核），以固定左上光源套用，讓既有輪廓在新後製
（bloom）+ 噪聲背景上更立體、有質感、有能量感。既有造型輪廓保留、只疊材質。純呈現層、不碰模擬。

## Business Requirements

- 讓常駐畫面的角色/敵人質感大躍進，與已升級的背景/後製相稱。
- 以共用 helper 達成全隊伍一致、可維護的質感升級（非逐個手工不一致）。

## Functional Requirements

### FR-1 共用材質 helper（sprites.ts，固定光源左上）
- 新增可組合 helper（光源常數 `LIGHT`，方向左上）：
  - `membrane(g, r, color)`：外圈極淡同色暈（半透明膜感）。
  - `innerShade(g, r, color)`：右下半邊柔暗新月（形體陰影/環境遮蔽）。
  - `rimLight(g, r, color)`：左上緣亮細弧（受光邊，使輪廓跳出背景）。
  - `specular(g, r)`：左上小亮斑（濕潤反光）。
  - `emissiveCore(g, x, y, r, color)`：明亮核 + 柔光暈（亮到被 bloom 暈染）。
- 既有 `lighten`/`dim` 工具沿用。

### FR-2 套用全隊伍（既有輪廓保留、疊材質）
- **4 角色**：膜身套 membrane/innerShade/rimLight/specular；細胞核 `emissiveCore`（冷光）。
- **8 病原**：膜身套材質；毒核/感染核 `emissiveCore`（病原色）；自爆體核更亮（蓄爆感）。
- **投射物**：抗體叉端/穿孔素針尖加 `emissiveCore` 小亮點；毒液彈毒核加亮。
- 寶石/補體環/寶箱：輕度統一（已偏發光，非重點）。

### FR-3 發光克制
- 僅「核/能量點」發光，膜身不發光，避免整體過曝糊成一團；亮度交由 bloom 放大。

## Acceptance Criteria

詳見 acceptance.md（唯一驗收來源）。

## Edge Cases

- sprite 造型只在 entity 首次建立時畫一次並快取（`PixiRenderer.spriteFor`），故新增繪製指令不影響每幀 FPS。
- 命中閃白（flash 覆蓋層）、相機跟隨、既有動畫 transform 不受影響（材質為造型底層繪製）。
- 發光核與 bloom 疊加不得使任一 sprite 整體過曝至看不清輪廓。

## Data Model Changes

- 無。僅擴充 `src/engine/sprites.ts`（helper + 各 draw 函式內套用）；不改引擎型別/ World / store / 模擬。

## State Changes

- 無模擬狀態改動。材質為 sprite 建立時的視覺輸出。

## UI Behaviour

- 角色/敵人/投射物更立體、有膜質感與發光核；前景可讀性維持（輪廓清晰、不過曝）。

## Non-Functional Requirements

- **不碰模擬/確定性**：純造型繪製；引擎/ store / 既有 181 測試零改動。
- **效能**：材質為 sprite 建立時一次性繪製、之後快取；對 FPS 幾乎無影響。
- 純呈現層、無新增單元測試；以 typecheck/build + 瀏覽器截圖驗證。
