# Spec — 新增三種敵人（噴吐病原 / 分裂菌 / 膿疱自爆體）

**日期：** 2026-06-24
**功能名稱：** new-enemies
**所屬階段：** 內容擴充（敵人系統）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

新增三種免疫主題敵人，補足目前沒有的三種行為原型：**噴吐病原**（遠程：維持距離 + 吐毒液彈）、
**分裂菌**（死亡分裂成 2 隻細菌）、**膿疱自爆體**（高速衝鋒 + 死亡範圍爆炸）。
同步新增**敵方投射物**子系統（與玩家投射物分離）與資料驅動的死亡鉤（分裂/爆炸）。

---

## 2. Business Requirements（商業需求）

- 擴充敵人威脅多樣性：補上遠程、死亡分裂、自爆三種與現有五種（直追/群襲/肉盾/衝刺/Boss）不重疊的機制。
- 零素材依賴、純程式繪製與邏輯。
- 不破壞架構紅線：引擎純 TS、確定性（seeded rng）、固定步長；AI/生怪為純函式可單元測試。

---

## 3. Functional Requirements（功能需求）

### FR-1 敵人種類與定義（types / enemyDefs）
- `EnemyKind` 新增 `'spitter' | 'splitter' | 'exploder'`。
- `EnemyDef` 新增三個選用欄位：
  - `spit?: { interval: number; projSpeed: number; projDamage: number; range: number }`（噴吐病原用）。
  - `splitInto?: { kind: EnemyKind; count: number }`（死亡分裂用）。
  - `explode?: { radius: number; damage: number }`（死亡爆炸用）。
- `ENEMY_DEFS` 新增三筆（皆套乘區前基礎值）：
  - **spitter**：hp 22、speed 50、damage 4、radius 13、xp 4、color `0xc0ca33`、unlockTime 60、spawnWeight 10、`spit:{ interval:2.2, projSpeed:180, projDamage:8, range:220 }`。
  - **splitter**：hp 30、speed 55、damage 8、radius 16、xp 4、color `0x26a69a`、unlockTime 75、spawnWeight 9、`splitInto:{ kind:'bacteria', count:2 }`。
  - **exploder**：hp 16、speed 95、damage 6、radius 14、xp 3、color `0xfdd835`、unlockTime 50、spawnWeight 12、`explode:{ radius:90, damage:18 }`。
- `ENEMY_ORDER` 追加三種（接於現有五種之後）。既有五種數值不變。

### FR-2 敵方投射物子系統（enemyProjectiles）
- `Entity.projShape` 聯集擴充加 `'toxin'`；`createProjectile` 的 shape 參數同步可接受 `'toxin'`，新增 `createEnemyProjectile(pos, dir, speed, damage)` 包裝（kind `'projectile'`、`projShape:'toxin'`、帶 `damage`、`life`）。
- `World` 新增 `enemyProjectiles: Entity[]`（與玩家 `projectiles` 完全分離、互不碰撞干擾）。
- 每 `step` 推進敵彈飛行（位移 + 壽命倒數），與玩家重疊時：`player.hp -= Math.max(0, damage - armor)`（套護甲、即時非連續），該彈失效；壽命到也失效；每格 filter 清掉失效彈。
- renderer 將 `enemyProjectiles`（active）納入繪製與回收；造型走 `drawProjectile` 的 `'toxin'` 分支（毒綠小球）。

### FR-3 噴吐病原 AI（enemyAI，純函式）
- `steerEnemy` 新增 `spitter` 分支 `steerSpitter(e, target)`：維持偏好距離 `range`——`dist > range+margin` 靠近、`dist < range-margin` 後退、區間內停步（vel 歸零）。`margin` 為常數（如 40）。
- 開火節流純函式 `spitterTick(e, dt, interval): boolean`：以 `e.behaviorTimer` 累計，達 `interval` 即回 true 並扣回 interval（確定性、無 `Math.random()`）。
- World 在敵人轉向迴圈中，對 spitter 呼叫 `spitterTick`；為 true 時以 `createEnemyProjectile` 朝玩家當前位置生一發加入 `enemyProjectiles`，並推 `'shoot'` 音效。

### FR-4 死亡鉤：分裂與爆炸（World.killEnemy，資料驅動）
- `killEnemy` 在既有「失效 + 記擊殺 + 掉寶石 + Boss 掉寶箱」之後，依該敵 `EnemyDef`：
  - `splitInto`：在死亡位置生 `count` 隻 `kind` 子體（用既有 `createEnemy` + 既有 hp 縮放），子體為一般該 kind（不再帶 splitInto，故不無限分裂）。
  - `explode`：若玩家在 `radius` 內，`player.hp -= Math.max(0, damage - armor)`；推一個爆裂視覺（沿用 `fxEventQueue` 的 `nova` 事件，以爆炸半徑）+ 推 `'hit'` 音效。
- 既有 superbug 掉寶箱行為不變。

### FR-5 造型（sprites.ts）
- `drawEnemy` 新增三 case：
  - **spitter**：囊狀體 + 朝外噴口（短管）+ 數枚毒斑點。
  - **splitter**：分裂中雙葉（兩個交疊圓 + 中央縊縮）形成 8 字形。
  - **exploder**：鼓脹膿包（主體 + 數個外凸瘤）+ 緊繃描邊（renderer 沿用既有脈動鉤可選）。
- `drawProjectile` 新增 `projShape==='toxin'` 分支：毒綠小球 + 淡綠暈。
- 既有造型、命中閃白、動畫、相機跟隨不變。

### FR-6 不變項（硬性）
- 既有五種敵人（virus/bacteria/spore/spiral/superbug）數值/行為/平衡完全不變。
- 玩家投射物、武器、升級握手、store/Summary、地圖、確定性（seeded rng）不變。
- `Game.stop()` / `PixiRenderer.destroy()` 冪等；`enemyProjectiles` 隨新 World 建構為空、不跨局殘留。
- 模擬內不得呼叫 `Math.random()`（生怪/AI 一律走 seeded rng；spitter 開火為固定計時、無隨機）。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：三種敵人可依時間解鎖加權登場並如機制運作（遠程吐彈/死亡分裂 2 隻/死亡範圍爆炸），
敵彈命中玩家扣血（套護甲），造型可辨；AI/生怪/死亡鉤有單元測試且確定性；既有測試全綠 + 新測試、型別/build 乾淨、實機驗證、FPS 正常。

---

## 5. Edge Cases（邊界情況）

- **spitter 與玩家重疊（dist=0）**：仍以接觸傷害處理；steerSpitter 後退方向取（pos-target）正規化，dist=0 時退化為零向量（停步），不崩潰。
- **分裂子體位置**：生在父體死亡座標；多隻以小角度偏移錯開（確定性、固定偏移、無隨機）。
- **自爆與玩家距離剛好等於 radius**：採 `<= radius` 命中。
- **敵彈飛出畫面**：固定壽命到期自動回收，不累積。
- **大量敵彈**：每格 filter 清失效；以陣列掃描碰撞（與玩家單體，成本低）。
- **重新開始**：`enemyProjectiles` 隨新 World 為空；renderer 回收殘留顯示物。
- **確定性**：相同 seed 下生怪序列、spitter 開火時機（固定計時）、分裂偏移一致。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type EnemyKind = 'virus' | 'bacteria' | 'spore' | 'spiral' | 'superbug'
  | 'spitter' | 'splitter' | 'exploder'
// Entity.projShape: 'antibody' | 'perforin' | 'toxin'
// EnemyDef 新增選用：spit? / splitInto? / explode?（見 FR-1）

// entities/factory.ts
createEnemyProjectile(pos: Vec2, dir: Vec2, speed: number, damage: number): Entity

// systems/enemyAI.ts
steerSpitter(e: Entity, target: Vec2): void
spitterTick(e: Entity, dt: number, interval: number): boolean

// World.ts
enemyProjectiles: Entity[]   // 公開供 renderer 取用（同 projectiles）
```

- store/Summary、武器、玩家投射物介面不變。

---

## 7. Data Model Changes（資料模型變更）

- `EnemyKind` 增三成員；`EnemyDef` 增三選用欄位；`ENEMY_DEFS`/`ENEMY_ORDER` 增三筆。
- `Entity.projShape` 增 `'toxin'`；`World` 增 `enemyProjectiles` 陣列。
- 不改 store、不新增 EntityKind（敵彈複用 `'projectile'`）。

---

## 8. State Changes（狀態變更）

- `World` 新增 `enemyProjectiles`（每格推進/回收）。spitter 以既有 `behaviorTimer` 計開火。無其他模擬語意變更。

---

## 9. UI Behaviour（UI 行為）

- 遊戲畫面：噴吐病原保持距離吐毒綠彈、分裂菌死亡裂成 2 隻細菌、膿疱自爆體死亡爆裂衝擊環。HUD/選單/結算不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：AI/生怪/分裂偏移/spitter 開火皆固定或走 seeded rng；模擬無 `Math.random()`；相同 seed 結果一致。
- **效能**：敵彈固定壽命回收、單體碰撞掃描；維持原 FPS。
- **測試**：`enemyAI`（steerSpitter / spitterTick）、`spawn`（含新敵解鎖/權重）、World（分裂/爆炸/敵彈命中）走單元測試；造型屬呈現層以實機驗證。
- **架構邊界**：引擎純 TS；敵彈與玩家彈分離；視覺走呈現層。

---

## 11. 非目標（本 spec 明確不做）

- 治療者 / 護盾菌 / 閃避體（其他備選，未選）。
- 既有五種敵人重平衡。
- 新 Boss / Boss 階段機制。
- 敵彈反彈、追蹤彈、彈幕圖樣（YAGNI：spitter 為單發直線朝當前玩家位置）。
- 新武器 / 新地圖 / 新角色。
