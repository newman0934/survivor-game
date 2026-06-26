# Spec — 新增肥大細胞角色與兩張地圖（gut／brain）

**日期：** 2026-06-26
**功能名稱：** content-mastcell-maps
**所屬階段：** 階段 3 — 多樣化（內容擴充）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

純資料 + 呈現層的內容擴充：沿用既有武器／被動／敵人／World 起始套用機制，**不新增任何 system**。

- **角色**：新增第 5 個可選角色「肥大細胞（mastcell）」，定位為「範圍清場」，補足現有四角
  （坦克／高速脆皮／高傷／吸取）未覆蓋的群控空位。
- **地圖**：新增兩張地圖「腸道（gut）」「腦／血腦屏障（brain）」，提供新的難度手感象限
  （腸道＝多而脆的蟲潮；腦＝少而硬的精英試煉），各自有背景視覺與背景音樂主題。

引擎部分（World 起始套用、地圖難度修正）為純邏輯、寫單元測試；造型／背景／音樂為呈現層，
照慣例不寫單元測試、靠實機驗證。store / Summary / 選單與排行榜程式碼**零改動**
（選單與排行榜由 `CHARACTER_ORDER`/`MAP_ORDER`/`*_DEFS` 自動帶出）。

---

## 2. Business Requirements（商業需求）

- 提供重玩動機與多樣性：新角色＝新開局走向；新地圖＝新難度體驗。
- 沿用既有 `WEAPON_DEFS` / `PASSIVE_DEFS` / `PlayerStats` / 敵人生成，工量可控、風險低。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（背景走 seed）；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 角色定義 — 肥大細胞
- `CharacterKind` union 新增 `'mastcell'`。
- `CHARACTER_DEFS` 新增一筆、`CHARACTER_ORDER` 末端加入 `'mastcell'`。
- 數值：
  - `name = '肥大細胞'`，`description = '釋放發炎介質範圍清場'`
  - `color = 0xf06292`（洋紅，與紅／綠／紫／黃四角區隔）
  - `maxHp = 100`
  - `startWeapon = 'inflammation'`
  - `statMods = { areaMult: 1.3, cooldownMult: 0.9 }`（範圍更大 + 脈衝更快；**不給 damageMult**）
  - `startPassives = []`

### FR-2 地圖定義 — gut / brain
- `MapKind` union 新增 `'gut' | 'brain'`。
- `MAP_DEFS` 新增兩筆、`MAP_ORDER` 末端依序加入 `'gut'`、`'brain'`。
- 數值：

  | kind | name | description | bgColor | gridColor | gridAlpha | spawnIntervalMult | enemyHpMult |
  |------|------|-------------|---------|-----------|-----------|-------------------|-------------|
  | gut | 腸道 | 蟲潮：生怪極快、敵人脆 | 0x140e08 | 0xffb74d | 0.05 | 0.7 | 0.8 |
  | brain | 腦 | 精英試煉：生怪偏慢、敵人硬 | 0x0a0a18 | 0x9fa8ff | 0.05 | 1.2 | 1.4 |

  > 對照現有：vessel 1.0/1.0、stomach 0.8/1.25、lung 1.15/0.9。

### FR-3 角色造型
- `drawPlayer` 的 `switch (character)` 新增 `case 'mastcell'`：程式化造型——
  含內部顆粒（granules）的圓形細胞 + 一圈短偽足，使用傳入的角色色。
- 與現有四角造型風格一致（純 `Graphics` 繪製，無外部素材）。

### FR-4 角色圖示
- `iconRegistry.ts` 的 `CHARACTER_ICONS` 新增 `mastcell` 一筆（color + 與其他角色同形式的 `IconDef`）。

### FR-5 地圖背景視覺
- `noiseBackground.ts`：
  - `MAP_TINT` 新增 `gut`（暖橙系）與 `brain`（冷藍紫系）三色（deep/mid/core）。
  - `makeNoiseTexture` 的 kind 分支新增 gut / brain 的地貌繪製規則；繼續以傳入 `seed` 驅動雜訊，
    **確定性不變**（不呼叫 `Math.random()` 於模擬，背景生成沿用既有 seed 慣例）。

### FR-6 地圖背景音樂
- `soundManager.ts` 的 `MUSIC_THEMES` 新增 `gut` 與 `brain` 兩個主題（和弦進行／音色／節奏），
  與現有三張在「音色 + 節奏」上彼此可辨。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：肥大細胞可選且起始狀態正確（武器/數值/血/顏色）；gut/brain 可選且
難度修正正確生效；造型／圖示／背景／音樂到位；選單與排行榜自動帶出新內容；確定性與引擎邊界不變；
單元測試（World 角色起始 + 地圖難度修正）+ 既有測試全綠、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **既有預設值不變**：`World` 預設角色仍為 `'macrophage'`、預設地圖仍為 `'vessel'`；
  既有 `new World(seed)` 測試不受影響。
- **statMods 部分欄位**：`Object.assign` 只覆寫 `areaMult`/`cooldownMult`，其餘維持預設。
- **未知 kind 防呆**：`startMusic` 既有 `?? MUSIC_THEMES.vessel` fallback 維持；`noiseBackground`
  對新增 kind 必須有對應分支（否則背景退回預設色，不可崩潰）。
- **存檔相容**：saveStore 僅以字串存 character/map，無白名單，新增 kind 自動相容。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type CharacterKind = 'macrophage' | 'neutrophil' | 'nkcell' | 'dendritic' | 'mastcell'
export type MapKind = 'vessel' | 'stomach' | 'lung' | 'gut' | 'brain'

// systems/characterDefs.ts — CHARACTER_DEFS 新增 mastcell；CHARACTER_ORDER 末端加 'mastcell'
// systems/mapDefs.ts       — MAP_DEFS 新增 gut/brain；MAP_ORDER 末端加 'gut','brain'
// engine/sprites.ts        — drawPlayer 新增 case 'mastcell'（簽章不變）
// ui/icons/iconRegistry.ts — CHARACTER_ICONS 新增 mastcell
// engine/noiseBackground.ts— MAP_TINT + makeNoiseTexture 新增 gut/brain 分支
// engine/core/soundManager.ts — MUSIC_THEMES 新增 gut/brain
```

- 既有函式**簽章皆不變**，僅擴充資料表與 switch 分支。
- store / Summary / MainMenu / Leaderboard 程式碼不變。

---

## 7. Data Model Changes（資料模型變更）

- `CharacterKind` 加 `'mastcell'`；`MapKind` 加 `'gut' | 'brain'`。
- `CHARACTER_DEFS`/`CHARACTER_ORDER`、`MAP_DEFS`/`MAP_ORDER` 各新增條目。
- `CHARACTER_ICONS`、`MAP_TINT`、`MUSIC_THEMES` 各新增條目。
- 無新型別介面、無新 system、無 store 變更。

---

## 8. State Changes（狀態變更）

- World 以 mastcell 建構時套用其起始狀態；以 gut/brain 建構時套用其 `spawnIntervalMult`/`enemyHpMult`。
- 其餘流程（升級/戰鬥/死亡結算/選角記憶）不變。

---

## 9. UI Behaviour（UI 行為）

- 主選單角色列自動多出「肥大細胞」卡、地圖列自動多出「腸道」「腦」卡（由 ORDER/DEFS 驅動）。
- 遊戲中肥大細胞玩家圓為洋紅色、造型為含顆粒圓形 + 偽足。
- gut/brain 對局有各自的背景地貌與背景音樂。
- HUD / 升級彈窗 / Boss 血條 / 死亡結算 / 排行榜版面不變（排行榜會自動顯示新角色/地圖名）。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：角色只改起始狀態；地圖只改難度倍率與視覺；背景沿用 seed，模擬中不呼叫 `Math.random()`。
- **架構邊界**：`characterDefs.ts`/`mapDefs.ts`/`World` 純 TS；造型/背景/音樂為呈現層。
- **TDD**：World 的角色起始套用與地圖難度修正寫單元測試；造型/背景/音樂不寫單元測試。
- **資源清理**：`Game.stop()` / `PixiRenderer.destroy()` / `noiseBackground.destroy()` 維持冪等。

---

## 11. 非目標（本 spec 明確不做）

- 角色解鎖 / 地圖解鎖（後設系統，另案）。
- 新武器 / 新被動 / 新敵人 / 環境危害機制（屬 B 類，本案為 A 類純資料擴充）。
- 角色專屬主動技能、選角預覽動畫。
