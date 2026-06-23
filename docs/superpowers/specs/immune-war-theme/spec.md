# Spec — 免疫大戰主題化（Immune War Re-theme）

**日期：** 2026-06-23
**功能名稱：** immune-war-theme
**所屬階段：** 美術精修 / 主題重塑（換皮 + 主要類別代號改名）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把現有《吸血鬼倖存者》風格重新主題化為**「免疫大戰」**：玩家操控免疫細胞，迎戰入侵人體的病原大軍，
場景設定在人體內部（血管 / 胃 / 肺泡）。

本次為**換皮 + 主要類別代號改名**：

- **顯示層**（玩家可見的名稱 / 描述 / 標籤）全面主題化，**含被動道具標籤**。
- **主要類別內部代號**（`EnemyKind` / `WeaponKind` / `CharacterKind` / `MapKind` 的字串字面值）改成主題語意；
  **被動道具內部代號（`PassiveKind`：spinach/tome/…）保留不動**，只改其顯示標籤。
- **視覺造型**（`sprites.ts` 角色/敵人造型、三地圖背景）與**特效配色**（`effects.ts`）重繪為免疫主題。
- **機制 / 數值 / 平衡 / 確定性 / 架構邊界完全不變**——這是純改名 + 換皮，不新增玩法。

---

## 2. Business Requirements（商業需求）

- 給遊戲一個鮮明、原創的主題識別（免疫細胞 vs 病原體），脫離 VS 既視感。
- 零素材依賴、純程式繪製，完全可在本環境產出。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性；固定步長；既有玩法/平衡不變。
- 內部代號改名後，既有單元測試同步更新並維持全綠（行為不變、僅識別字串變更）。

---

## 3. Functional Requirements（功能需求）

### FR-1 主要類別內部代號改名（型別 + defs + 所有引用點 + 測試）

下列字串字面值在**全專案**（含型別、defs、systems、World、renderer、sprites、測試）一致改名：

| 型別 | 舊代號 → 新代號 |
|------|----------------|
| `EnemyKind` | `basic→virus`、`swarm→bacteria`、`tank→spore`、`charger→spiral`、`boss→superbug` |
| `WeaponKind` | `wand→antibody`、`knife→perforin`、`bible→complement`、`garlic→inflammation` |
| `CharacterKind` | `warrior→macrophage`、`ranger→neutrophil`、`mage→nkcell`、`harvester→dendritic` |
| `MapKind` | `plains→vessel`、`lava→stomach`、`tundra→lung` |

- `ENEMY_ORDER` / `MAP_ORDER` / `CHARACTER_ORDER` 等順序陣列同步改值（順序不變）。
- `*_DEFS` 物件鍵同步改名；所有 `Record<XxxKind, …>` 物件鍵與引用一致。
- systems（`spawn.ts`、`weapons.ts`、`enemyAI.ts` 等）、`World.ts`、`sprites.ts`、`PixiRenderer.ts`
  內所有對舊字串的比較 / switch case / 索引同步改名。
- 預設值同步：`World` 建構子預設 `character='macrophage'`、`map='vessel'`、起始武器邏輯不變（值改名）。

### FR-2 被動道具：保留代號、改顯示標籤

- `PassiveKind` 內部代號（spinach/tome/bracer/wings/magnet/candle/heart/tomato/armor/crown）**不動**。
- `PASSIVE_DEFS[*].label` 改為免疫主題（括號內的數值效果說明保留）：

| 代號 | 舊標籤 → 新標籤 |
|------|----------------|
| spinach | 菠菜（傷害）→ **細胞激素（傷害）** |
| tome | 空書（攻速）→ **干擾素（攻速）** |
| bracer | 護腕（彈速）→ **趨化因子（彈速）** |
| wings | 翅膀（移速）→ **偽足（移速）** |
| magnet | 吸引石（吸取）→ **受體（吸取）** |
| candle | 燭台（範圍）→ **組織胺（範圍）** |
| heart | 空心之心（最大血）→ **幹細胞（最大血）** |
| tomato | 番茄（回復）→ **生長因子（回復）** |
| armor | 護甲（減傷）→ **細胞膜（減傷）** |
| crown | 皇冠（經驗）→ **記憶細胞（經驗）** |

### FR-3 顯示名稱 / 描述主題化（defs 的 name/label/description）

- **角色**：巨噬細胞 / 嗜中性球 / NK 細胞 / 樹突細胞；描述沿用其數值定位語意（高血高甲、快攻快走…）。
- **敵人**：病毒 / 細菌 / 真菌孢子 / 螺旋菌 / 超級病原（boss）。（敵人若無顯示名欄位，僅造型 + 代號改名。）
- **武器**：抗體 / 穿孔素飛鏢 / 補體環 / 發炎場。
- **地圖**：血管（標準）/ 胃（困難）/ 肺泡（簡單）；description 沿用既有難度語意。
- **經驗寶石**顯示語意改為「抗原碎片」（若 UI 有文字提及；造型見 FR-5）。

### FR-4 角色 / 敵人造型重繪（sprites.ts）

- **玩家細胞**：半透明細胞膜輪廓 + 細胞核 + 顆粒/偽足分層；各角色以不同核形 / 膜色區分（沿用既有 `playerColor`）。
- **病原造型**：
  - 病毒（virus）：多刺二十面體外殼。
  - 細菌（bacteria）：帶鞭毛桿菌、成群。
  - 真菌孢子（spore）：厚壁圓孢、慢而硬。
  - 螺旋菌（spiral）：螺旋體輪廓、衝刺時朝速度方向（沿用既有 charger 旋轉動畫鉤）。
  - 超級病原（superbug）：巨型不規則團塊、脈動（沿用既有 boss scale 呼吸動畫鉤）。
- 既有立體分層手法（陰影/暗底/主色/高光/描邊）、命中閃白、動畫 transform、相機跟隨**照舊**。

### FR-5 武器 / 寶石 / 場域造型主題化（sprites.ts）

- 抗體（antibody，原 wand 彈）：Y 形抗體輪廓或發光中和粒。
- 穿孔素飛鏢（perforin，原 knife）：尖形微粒。
- 補體環（complement，原 bible orbit）：環繞的補體蛋白點。
- 發炎場（inflammation，原 garlic aura）：紅橙活性氧場域光環（沿用 `drawGarlicAura` 呼吸脈動）。
- 經驗寶石 → 抗原碎片：造型/配色微調（偏黃，與升級藍綠特效區隔）。

### FR-6 地圖背景重繪（sprites.ts drawMapBackground 系）

- **血管（vessel，原 plains）**：暗紅血漿底 + 漂浮紅血球 / 血小板（`bgHash` 確定性座標 + clock 漂流）。
- **胃（stomach，原 lava）**：胃黏膜皺褶 + 酸泡脈動（沿用熔岩的暖色 + 脈動鉤）。
- **肺泡（lung，原 tundra）**：藍灰氣囊群 + 緩慢氣流（沿用冰原冷色 + 飄移鉤）。
- 沿用既有 `bgHash` 確定性座標雜湊（無限捲動穩定重現）+ renderer clock 氛圍動畫；`PATCH_COLORS` 等對照表改色。

### FR-7 特效配色主題化（effects.ts）

- 擊殺碎屑：沿用「以敵色生成」機制（敵色已隨 FR-1/造型改變，自動帶到）。
- 收集閃光：綠 → **抗原黃**。
- 升級光環：金 → **免疫藍綠**（與抗原黃區隔）。
- 受傷紅暈 / 傷害數字 / 鏡頭震動機制不變（紅暈本就符合受傷語意）。

### FR-8 不變項（硬性）

- 模擬、碰撞、生怪曲線、難度倍率、武器/敵人/角色/地圖**數值與平衡**、升級握手、store/Summary 結構、
  音效語意事件**完全不變**（僅識別字串與顯示文字 / 造型 / 配色變更）。
- `Game.stop()` / `PixiRenderer.destroy()` / `EffectsLayer.destroy()` 維持冪等。
- 確定性：相同 seed 的模擬序列與結果不變（改名不影響任何隨機分支）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：四類主要代號全專案一致改名且無殘留舊字串；被動標籤主題化、代號保留；
角色/敵人/武器/寶石/三地圖造型與特效配色呈現免疫主題；既有單元測試（122）改名後全綠、型別/build 乾淨、
實機驗證主題正確且玩法/平衡無變化、0 功能相關 console error。

---

## 5. Edge Cases（邊界情況）

- **舊字串殘留**：任何檔案（含測試、UI、註解中作為程式識別用途的字串）漏改會導致型別錯誤或行為異常 →
  以全專案搜尋確認 0 殘留（註解的中文敘述可保留，但程式識別字串必須一致）。
- **存檔 / localStorage**：目前無進度存檔系統（階段 4 未做），故無舊代號相容性問題。
- **預設參數**：`World` / `Game` 預設角色與地圖代號改名後需同步，否則啟動即錯。
- **UI 選單**：主選單選角 / 選圖以 `*_ORDER` + def 顯示名渲染，改名後顯示新名、值傳遞一致。
- **確定性測試**：若有測試以 seed 斷言生怪種類序列，改名後斷言字串需同步（行為序列不變）。

---

## 6. API Contracts（介面契約）

- 對外公開 API 形狀**不變**，僅字串字面值類型成員改名：
  - `type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'`
  - `type WeaponKind = 'antibody' | 'perforin' | 'complement' | 'inflammation'`
  - `type CharacterKind = 'macrophage' | 'neutrophil' | 'nkcell' | 'dendritic'`
  - `type MapKind = 'vessel' | 'stomach' | 'lung'`
  - `type PassiveKind`（不變）
- `Summary`、store 介面、`SoundEvent` 等其他契約不變。

---

## 7. Data Model Changes（資料模型變更）

- 上述四個字串字面值聯集型別改名；對應 `*_DEFS` 鍵、`*_ORDER` 值、所有引用點同步。
- 無新增欄位、無新增 entity 種類、無 store 結構變更。

---

## 8. State Changes（狀態變更）

- 無模擬狀態語意變更。`World` 預設 `mapKind`/角色代號改名為新值（`vessel` / `macrophage`）。

---

## 9. UI Behaviour（UI 行為）

- 主選單：角色卡顯示免疫細胞名 / 描述；地圖卡顯示人體場景名 / 難度描述。
- HUD / 升級彈窗 / Boss 血條 / 死亡結算：版面**不變**，文字依新顯示名稱呈現；升級卡顯示新武器/道具主題名。
- 遊戲畫面：免疫細胞造型、病原造型、人體場景背景、主題化特效配色。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：改名與換皮不碰 rng / 模擬分支；相同 seed 結果不變。
- **架構邊界**：不新增執行期依賴；引擎仍純 TS；特效仍純呈現層。
- **效能**：造型 / 背景沿用既有繪製成本量級（不顯著增加每幀繪製負擔），維持原 FPS。
- **測試**：引擎邏輯改名同步更新既有單元測試並全綠（122）；造型 / 背景 / 特效屬呈現層膠水，以實機目視驗證。
- **可維護性**：代號改名後語意更貼近主題，降低後續理解成本。

---

## 11. 非目標（本 spec 明確不做）

- 新玩法機制（感染擴散、抗體升級樹、發炎區域等）—— 不在本次。
- 新敵人 / 武器 / 角色 / 地圖種類。
- HUD / 選單 / 彈窗**版面**改版（只換文字，不改版面）。
- 被動道具**內部代號**改名（保留 spinach/tome/…）。
- 進度存檔 / 解鎖 / 排行榜（屬階段 4 其他項）。
- 外部素材 / shader / 後製濾鏡。
