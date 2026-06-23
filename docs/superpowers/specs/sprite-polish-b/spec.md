# Spec — 掉落物/環繞物造型精緻化（B 批）

**日期：** 2026-06-24
**功能名稱：** sprite-polish-b
**所屬階段：** 美術精修（程式化美術延伸，B 批：靜態造型精緻化）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

延續免疫大戰主題，把四個仍偏簡單或出戲的呈現層造型精緻化：**寶箱**（仍是出戲的金棕木箱）、
**抗原碎片**（寶石，扁平菱形）、**補體蛋白球**（聖經環繞物，扁平球）、**發炎場**（ROS 範圍光環，單層橙紅環）。

全部只動 `engine/sprites.ts` 的繪製函式，函式簽章不變、不碰引擎/模擬/資料/數值。

---

## 2. Business Requirements（商業需求）

- 補齊免疫主題的視覺一致性：寶箱不再出戲、掉落物與環繞物與整體主題同級精緻。
- 零素材依賴、純程式繪製，可在本環境產出。
- 不破壞架構紅線：引擎純 TS、確定性、固定步長；本批純呈現、不碰模擬。

---

## 3. Functional Requirements（功能需求）

### FR-1 寶箱 → 補給囊泡（drawChest 重畫）
- 取代金棕木箱：**半透明金膜囊泡**（圓潤膜身 + 描邊）+ **內部金色發光核**（亮核 + 暈）+ 高光點。
- 保留金色（0xffd54a 系）作為「獎勵」識別感；造型改為人體內的膜囊。
- 維持 `drawChest(g, e)` 簽章與半徑等比。

### FR-2 抗原碎片結晶化（drawGem 重畫）
- 菱形加**切面明暗**（上下/左右三角面以 lighten/dim 分明暗，製造立體結晶感）+ **外發光暈** + 亮核。
- 仍為抗原黃（0xffd54a 系）。維持 `drawGem(g, e)` 簽章；旋轉/脈動由 renderer 套用。

### FR-3 補體蛋白球 → 補體複合體（drawOrbit 重畫）
- **外柔光暈** + 主球 + **數個小亞基瓣**（環繞主球的小圓，蛋白複合體感）+ 亮核。
- 維持 `drawOrbit(g, e)` 簽章；旋轉由 renderer 套用。

### FR-4 發炎場湍流優化（drawGarlicAura 重畫）
- 由單層橙紅呼吸環改為**湍流發炎區**：**多層徑向暈染**（由外而內 alpha 漸增的熱核感，橙紅→琥珀）
  + **有機抖動邊界**（邊緣半徑以 `t` 驅動的正弦擾動，呈不規則發炎輪廓）+ 少量**漂動 ROS 熱點**。
- 沿用既有呼吸脈動（半徑/alpha 隨 `t`）。維持 `drawGarlicAura(g, cx, cy, radius, t)` 簽章。
- 動畫一律走傳入的 `t`（renderer clock）；**不得呼叫 `Math.random()`**（純呈現、確定性視覺）。

### FR-5 不變項（硬性）
- 四個函式簽章不變；不新增/修改任何其他函式、型別、引擎、store。
- 模擬、碰撞、數值、平衡、確定性完全不變；發炎場的實際傷害半徑（`World.garlicRadius()`）與機制不動，
  本批只改其視覺呈現。
- 既有 122 單元測試維持全綠（引擎不動）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：寶箱呈現補給囊泡、抗原碎片結晶立體、補體複合體有亞基瓣、發炎場呈湍流多層熱區；
四函式簽章不變、無 `Math.random()` 進入發炎場；既有 122 測試全綠、型別/build 乾淨、實機目視、0 功能相關 console error。

---

## 5. Edge Cases（邊界情況）

- **發炎場半徑為 0**：玩家未持有發炎場（inflammation 武器）時 `garlicRadius()` 回 0，renderer 不呼叫
  `drawGarlicAura` —— 維持現有行為，不需特別處理。
- **發炎場半徑隨等級/範圍乘區變動**：造型以傳入 `radius` 等比繪製，任何半徑都正確呈現。
- **大量寶石/環繞物同框**：造型為固定少量繪製指令、無累積狀態，效能與現況同量級。
- **重新開始**：造型為每次建立 sprite 時畫一次（寶石/寶箱/環繞物）或每幀重畫（發炎場），無殘留狀態。

---

## 6. API Contracts（介面契約）

- 簽章全部不變：
  - `drawChest(g: Graphics, e: Entity): void`
  - `drawGem(g: Graphics, e: Entity): void`
  - `drawOrbit(g: Graphics, e: Entity): void`
  - `drawGarlicAura(g: Graphics, cx: number, cy: number, radius: number, t: number): void`
- 引擎、store、型別契約不變。

---

## 7. Data Model Changes（資料模型變更）

- 無。不新增欄位、型別、entity 種類。

---

## 8. State Changes（狀態變更）

- 無模擬狀態變更。發炎場造型動畫走 renderer clock（呈現層），不進 World。

---

## 9. UI Behaviour（UI 行為）

- 遊戲畫面：寶箱呈補給囊泡、抗原碎片呈結晶、補體環繞物呈複合體、發炎場呈湍流熱區。
- HUD / 選單 / 彈窗 / 其他造型不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：四造型純視覺；發炎場動畫只用傳入 `t`，不呼叫 `Math.random()`、不進 sim。
- **架構邊界**：只動 `engine/sprites.ts` 四個繪製函式；引擎/store/型別/其他造型不變。
- **效能**：固定繪製指令、無累積狀態，維持原 FPS。
- **測試**：呈現層膠水不寫單元測試（同 sprite-polish/Task 6-7 慣例）；既有 122 測試維持全綠 + 實機目視。

---

## 11. 非目標（本 spec 明確不做）

- 投射物（抗體/穿孔素飛鏢）造型 —— 已於先前差異化完成，不在本批。
- 玩家/敵人/角色造型 —— 已完成。
- 發炎場的**傷害數值/半徑/機制**變更 —— 只改視覺。
- HUD/UI 動畫（屬 C 批）。
- 外部素材 / shader / 後製濾鏡。
