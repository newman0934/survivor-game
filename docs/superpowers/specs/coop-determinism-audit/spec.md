# Spec — 確定性全面稽核 + 回放雜湊測試（coop-determinism-audit，多人合作 子專案 2）

**日期：** 2026-06-27
**功能名稱：** coop-determinism-audit
**所屬：** 多人合作連線 子專案 2（1A/1B 已完成）
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`（子專案 2、第 8 節風險）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

為 lockstep 提供**確定性正確性護欄**：可重用的 `World.checksum()`、回放雜湊測試（同 seed + 同輸入 → 同結果）、原始碼守護測試（模擬路徑不得引入 `Math.random`/`Date.now`/`performance.now`），並把「跨瀏覽器超越函式極小差異」記錄為已知限制。

- 純測試/工具型功能；不改遊戲行為。
- 採「同引擎護欄 + 稽核」（不定點化 sin/cos/sqrt）。
- `World.checksum()` 同時供 **SP4 連線 desync 偵測**重用。

---

## 2. Business Requirements（商業需求）

- lockstep 要求各 client 同 seed + 同輸入跑出完全相同模擬；需自動化護欄防止日後迴歸。
- 提供 checksum 機制供 SP4 偵測 client 間 desync。
- 確認現有模擬路徑已乾淨（無非確定性來源），並以測試把關。

---

## 3. Functional Requirements（功能需求）

### FR-1 確定性雜湊工具（core/checksum.ts）
- 新增 `src/engine/core/checksum.ts`：FNV-1a 風格、順序敏感、對 number 串流做 32-bit 無號雜湊。
- API：
  - `class Checksum { add(n: number): this; addInt(n: number): this; value(): number }`
  - 浮點以 `DataView` 取 float64 八位元組逐一混入（確定性、跨 run 一致）。
  - `value()` 回 `>>> 0` 的 32-bit 無號整數。
- 純函式、無副作用、不依賴時間/亂數。

### FR-2 World.checksum()
- 新增 `World.checksum(): number`，以固定順序把「規範化模擬狀態」餵進 `Checksum`：
  - 標量：`elapsed`、`playerCount`、`bossCount`、`finalBossSpawned`(0/1)、`won`(0/1)、`spawnTimer`、`bossTimer`、`eventTimer`。
  - 每位玩家（index 升冪）：`entity.pos.x/y`、`entity.hp`、`entity.maxHp`、`level`、`xp`、`pendingLevelUps`、`alive`(0/1)、`weapons`（依序 kind 雜湊碼/level/evolved）、`passives`（依序 kind 雜湊碼/level）。
  - 敵人（`enemies` 陣列序，含未篩除者依現有順序）：數量，後接各 `pos.x/y`、`hp`、enemyKind 雜湊碼、affix 雜湊碼（無則 0）。
  - 計數：`projectiles`/`enemyProjectiles`/`chestEntities`/`pickupEntities` 數量；`gemEntities` 數量 + xp 總和。
- 字串列舉（kind/affix）以固定對應表轉整數（避免字串雜湊歧義）；或以 `ENEMY_ORDER` 等既有固定序的 index。
- 不納入 rng 內部狀態（觀察狀態已反映分歧）。

### FR-3 回放雜湊測試
- 新增 `src/engine/determinism.test.ts`：
  - 固定輸入腳本：2 玩家、每幀指定 `setMoveInput`、跑 N（如 600）幀，回 `world.checksum()`。
  - 斷言 `runScript() === runScript()`（兩個全新 World、同 seed + 同角色陣列 + 同輸入 → 同 checksum）。
  - 敏感度：不同 seed → checksum 不同（確認非定值）。
  - 單人也測一條（N=1 同 seed + 同輸入 → 同 checksum）。

### FR-4 原始碼守護測試
- 在 `determinism.test.ts`（或獨立 `determinism-guard.test.ts`）：
  - 掃描 `src/engine/**/*.ts`，**排除**：`*.test.ts` 與呈現/IO/驅動清單 —— `Game.ts`、`PixiRenderer.ts`、`sprites.ts`、`postProcessing.ts`、`noiseBackground.ts`、`effects.ts`、`core/soundManager.ts`、`core/input.ts`、`core/touchInput.ts`、`core/hitStop.ts`、`core/noise.ts`。
  - 對每個受測檔，去除註解（`//…` 與 `/* … */`）後，斷言不含 `Math.random(`、`Date.now(`、`performance.now(`。
  - 現況應**全數通過**（確認模擬路徑已乾淨）。
- 預設行為：新增的 sim 檔（不在排除清單）自動受守護（fail-safe）。

### FR-5 已知限制記錄
- 在本 spec 與 `acceptance.md` 明載：跨瀏覽器超越函式（`sin/cos/sqrt/atan2/pow`）可能有最後位元差異，本期**不定點化**；同引擎 lockstep 由回放測試保證；真觀察到跨瀏覽器 desync 再評估定點化（屬未來）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：`Checksum` 工具確定性/順序敏感；`World.checksum()` 同狀態同值、狀態變則值變；回放測試兩 run 相同 + seed 敏感 + 單人亦確定；守護測試掃描範圍正確且現況全綠；已知限制記錄在案；不改遊戲行為（既有測試全綠）、型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **checksum 對浮點 -0/+0**：`DataView` 位元組會區分 -0/+0；模擬中如有 -0 需確認不造成 run 間不一致（同 run 必一致，跨 run 同輸入亦一致——可接受）。
- **NaN**：模擬正常不應產生 NaN；若出現，checksum 仍確定（NaN 位元組固定），但屬上游 bug，非本案處理。
- **守護測試誤判註解**：以去註解後比對；字串內出現 `Math.random(` 之類極罕見，可接受（必要時加白名單行註記）。
- **空狀態**：開局即 checksum（無敵人）也應穩定。
- **敵人陣列含本格剛死未篩除者**：checksum 在 step 之間呼叫（篩除後），順序穩定；測試固定在每幀 step 後取值。

---

## 6. API Contracts（介面契約）

```ts
// core/checksum.ts
export class Checksum {
  add(n: number): this       // 混入一個 float64
  addInt(n: number): this    // 混入一個整數
  value(): number            // 32-bit 無號
}

// World.ts
checksum(): number           // 規範化模擬狀態的確定性雜湊（供回放測試 + SP4 desync）
```

- 不改任何既有方法簽章；不改遊戲行為。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `core/checksum.ts`（`Checksum`）。
- `World` 新增 `checksum()` 方法（唯讀，不改狀態）。
- 無型別/store/實體結構變更。

---

## 8. State Changes（狀態變更）

- 無。`checksum()` 為唯讀；測試為新增；遊戲執行行為不變。

---

## 9. UI Behaviour（UI 行為）

- 無 UI 變更。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：`Checksum`/`World.checksum()` 不呼叫時間/亂數；相同狀態 → 相同值。
- **架構邊界**：`core/checksum.ts`/`World.checksum()` 純 TS。
- **CI 友善**：回放/守護測試為一般 Vitest，快速、可重複。
- **不退化**：不改遊戲行為，既有測試全綠。

---

## 11. 非目標（本 spec 明確不做）

- 定點化 / 自製確定性超越函式（B 案；未來必要時）。
- 把 rng 內部狀態納入 checksum。
- SP4 的連線 desync 偵測接線（屆時重用 `World.checksum()`）。
- ESLint 規則式守護（採輕量守護測試）。
