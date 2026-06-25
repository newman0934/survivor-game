# 進度

Survivor Game — 開發進度與路線圖。各功能詳細規格見 `docs/superpowers/specs/<feature>/`。

_最後更新：2026-06-26_

## 狀態

階段 0–3 完成 ✅；階段 4 後設系統進行中（美術 ✅、UI 精修 D1–D3 ✅、音效 ✅、進度存檔 ✅、排行榜 ✅、解鎖 ⬜）；手機支援 ✅。

「**免疫大戰**」主題（免疫細胞 vs 病原體，場景在血管／胃／肺泡）：7 武器（各有進化層）、8 病原（含遠程／分裂／自爆）、
Boss、10 被動、4 角色、3 地圖；進度存檔記錄戰績與累積統計，主選單顯示統計與排行榜，結算可「再玩一次」或
「回主選單」重選。**203 測試全綠、型別檢查乾淨、production build 乾淨、無功能相關 console error。**

> 規畫中（未實作）：多人合作連線設計文件 → `specs/2026-06-26-multiplayer-coop-design.md`

## 路線圖

### 階段 0 — 地基 ✅
Vue3 + TS + Vite + Pinia + PixiJS scaffold、純 TS 引擎邊界、固定步長迴圈（與 FPS 解耦）、ECS 風格 `World`、
PixiJS 渲染 + 跟隨鏡頭、Pinia 橋接 store、核心工具（seeded RNG／向量／物件池／空間網格／輸入）。
- _空間網格已於階段 2 接進 `World`；物件池仍建好備用、尚未接線_

### 階段 1 — 核心循環 ✅
移動 + 鏡頭跟隨、自動開火武器、追擊敵人、難度曲線、經驗寶石吸取、升級三選一握手、
接觸扣血 → 死亡結算 → 重開；主選單／HUD／升級彈窗／結算畫面。

### 階段 2 — 內容 ✅
- [x] 多種武器（7 把）— 抗體／穿孔素／補體環／發炎場 + 吞噬偽足／補體級聯／抗原脈衝（`fxEventQueue`、上限 4→7）→ specs/new-weapons/
- [x] 武器進化（滿級 + 指定被動 → 升級卡進化，7 把各有進化層 + 招牌行為）→ specs/weapon-evolution/
- [x] 多種敵人（8 種）— 病毒／細菌／孢子／螺旋菌／超級病原 + 噴吐／分裂／自爆（敵方投射物子系統、資料驅動死亡鉤）→ specs/new-enemies/
- [x] Boss（超級病原）— 每 60s、隨次數變強、專屬血條、掉大量經驗
- [x] 被動道具 — 10 種有等級/上限
- [x] `spatialGrid` 接進 `World`（敵人鄰近查詢，行為不變）
- [x] 升級彈窗顯示目前持有武器/被動 + 進化提示 → specs/loadout-display/

### 階段 3 — 多樣化 ✅
- [x] 4 可玩角色（巨噬／嗜中性球／NK／樹突，主選單選角）
- [x] 3 地圖（血管／胃／肺泡，各有地貌背景與難度，主選單選圖）
- [x] 寶箱（Boss 必掉，撿取觸發免費升級三選一）

### 階段 4 — 後設系統
- [x] 音效 — Web Audio 合成 SFX／背景音樂 + 靜音開關
  - 音效優化：9 音多層合成質感提升 + master 限幅器防爆音 + kill 節流；取消寶石/擊中音；每地圖不同背景音樂主題（血管/胃/肺泡，以音域/波形/密度區隔）
- [x] 美術（程式化繪製，引擎不動）— 角色/敵人/道具造型與精緻化、三地圖地貌背景、打擊反饋特效（`EffectsLayer`）、
  免疫主題化、HUD/UI 動畫 → specs/{immune-war-theme, sprite-polish-b, ui-animation-c, effects-feedback} 等
- [x] 整體後製：全域泛光 + 色彩分級 + 暈影 → specs/post-processing/
  - bloom 開關（D）：兩平台預設開 + 暫停選單可即時切換 + localStorage 記住（取代原本手機強制關）→ specs/bloom-toggle/
- [x] 地圖背景精修：結構深度層（血管流紋/壁、胃皺褶脊、肺泡囊）+ 暖核漸層 + 細節變體 + 背景緩動 → specs/map-background-polish/
- [x] 噪聲紋理視差背景：程序噪聲(fBm) + 2 視差 TilingSprite 取代向量調性底（保留特徵/粒子），連續有機組織質感 → specs/noise-background/
- [x] 隊伍造型材質+發光（B1）：共用 rim/內陰影/高光/膜/發光核 helper 套全隊伍（角色細胞核冷光、病原毒核發光、接 bloom）→ specs/cast-material-polish/
- [x] 隊伍動態生命感（B2）：待機呼吸/搖擺/擠壓/抖動微動畫（純 transform、相位錯開，各病原性格）→ specs/cast-idle-animation/
- [x] 打擊反饋強化（B3）：命中火花+主題色體液濺紅 + 逐病原差異化死亡特效（細菌濺射/病毒碎片/孢子爆孢/自爆大爆/超級加大）→ specs/hit-feedback/
- [x] 打擊頓挫 + 震屏：震屏分級（擊殺/Boss/nova）+ hit-stop 頓挫（Boss/大型死亡，全域冷卻節流，reduced-motion 關閉）→ specs/hit-stop-shake/
- [x] 撿取物多樣化：回血（mercy 低血才掉）＋全場吸取（收全部寶石），資料驅動 pickup entity + 獨立 seeded rng → specs/pickup-variety/
- [x] UI 精修地基（D1）：免疫膜質 Overlay/Panel 共用元件 + Chakra Petch 展示字體 + 設計 token，套用主選單/升級/結算/排行榜 → specs/ui-polish-foundation/
- [x] 主題圖示系統（D2）：17 武器/被動單色主題色 SVG 圖示 + GameIcon 元件 + resolveOptionIcon 解析器（registry 完整性測試），套用升級彈窗 loadout 與選項卡 → specs/icon-system/
- [x] HUD/戰鬥內 UI 精修（D3）：血條/經驗條光澤分段數值 + 玩家頭像框（4 角色圖示）+ 持有圖示列 + BossBar/靜音鈕質感統一 → specs/hud-polish/（D 系列 A/B/C/D 全完成）
- [x] 進度存檔（localStorage）— 戰績紀錄 + 累積統計 + 破紀錄/統計 UI；結算可「回主選單」重選 → specs/save-progress/
- [x] 計分 / 排行榜 — 排行榜彈窗（前 10 場依存活時間），重用既有 runs → specs/leaderboard/
- [x] 暫停選單 — ESC/暫停鈕 → 繼續/重新開始/回主選單（`paused` phase，重用膜質 UI，放棄不計戰績）→ specs/pause-menu/
- [ ] 解鎖 — 用 `CumulativeStats` 鎖/解角色與地圖（尚未開始）

### 平台支援 ✅
手機觸控 + RWD — 浮動虛擬搖桿（與鍵盤並存）、視口防捲動縮放、主選單與升級彈窗窄螢幕適配。

## 效能最佳化（行為不變、純內部）
- **SpatialGrid** 改巢狀數值索引（`Map<string>` → `Map<cx, Map<cy>>`），免每幀字串 key 配置
- **findNearestN** 改單次掃描 top-k，免全排序與中間陣列/包裝物件
- **PixiRenderer.render** 改 frame 戳記回收，免每幀合併陣列／filter／Set

## 驗證快照

| 項目 | 結果 |
|---------|------|
| 單元測試（Vitest） | 203 通過 |
| 型別檢查（vue-tsc） | 乾淨 |
| Production build | 乾淨 |
| 瀏覽器煙霧測試 | 階段 1–3 + 美術 + 特效 + 新武器/敵種 + 武器進化 + 進度存檔 + 排行榜 + 手機 + 音效 驗收通過（偶見既有 favicon 404，與功能無關） |
