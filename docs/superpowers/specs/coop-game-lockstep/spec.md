# Spec — Game 多人 lockstep 模式 + M-1（coop-game-lockstep，多人合作 4B-2）

**日期：** 2026-06-27
**功能名稱：** coop-game-lockstep
**所屬：** 多人合作連線 子專案 4（4A/4B-1 已完成），本份為 **4B-2**
**上層設計：** `docs/superpowers/specs/2026-06-26-multiplayer-coop-design.md`（4.1、D-1）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

把 4A 的 `LockstepRunner` 接進 `Game`：等待室 `onStart` 後以多人 World + LockstepRunner + NetTransport 跑一場；升級走 `pick` 輸入（M-1：多人不用單人暫停握手）。單人路徑完全不變。

- 為讓 4C 前可本地跑，`LoopbackSession.toTransport()` 對**非本地玩家每 tick 自動補中性輸入**（你操作、隊友待命）。真跨機同步要 4C。
- Game rAF 迴圈為膠水層（不單元測）；新增 headless 整合測試驗多人推進/結束/pick。

---

## 2. Business Requirements（商業需求）

- 把 lockstep 核心接成「真的能開一場多人局」；4C 接真連線即成跨機合作。
- M-1：多人升級非阻塞（不為一人暫停全場）。
- 單人零退化（硬性）。

---

## 3. Functional Requirements（功能需求）

### FR-1 NetSession.toTransport
- `NetSession` 介面新增：`toTransport(localIndex: number): NetTransport`（會話進遊戲時產生逐幀輸入傳輸）。
- `LoopbackSession.toTransport(localIndex)`：回一個 NetTransport，`playerCount = players().length`、`sendInput` 記錄本地該 tick 輸入、`inputsForTick(tick)`：本地該 tick 有值時，回長度 playerCount 的陣列（本地＝記錄值、**其餘自動補中性 `{move:{x:0,y:0}}`**）；本地未送則回 null。
  - 效果：單機可起跑多人局，隊友原地待命（4C 前的可跑性）。

### FR-2 Game 多人模式
- 新增 `Game.startMultiplayer(canvasParent, seed, characters, map, transport, localIndex, bloomEnabled = true): Promise<Game>`：
  - `new World(seed, characters, map)`、`PixiRenderer.create`、`new Game(world, renderer, seed, localIndex)`。
  - `this.runner = new LockstepRunner(world, transport)`。
  - `store.onMultiUpgradePicked = (id) => { this.pendingPick = id }`。
  - 初始 loadout 推送、輸入掛載、音樂、`loop(0)`。
- Game 新增欄位：`private runner: LockstepRunner | null = null`、`private pendingPick: string | null = null`。

### FR-3 多人迴圈（與單人並存）
- `loop` 內：`if (this.runner)` 走多人分支，否則走既有單人分支（**單人完全不動**）。
- 多人分支（未暫停時）：
  1. 取本地方向 `dir`（觸控優先、否則鍵盤）。
  2. 固定步長累積：`while accumulator>=STEP`：`runner.submitLocalInput({ move: dir, pick: this.pendingPick })`；`this.pendingPick = null`；`accumulator -= STEP`。
  3. `while (runner.tryAdvance()) {}`（輸入到齊才推進；缺則停滯等待）。
  4. 推送 `store.updateSummary(world.summary(localIndex))`；`store.setMultiOffer(world.pendingOfferFor(localIndex), world.upgradeTimeRemaining(localIndex))`；排空音效/fx。
  5. 結束判定：`world.hasWon()` → victory+stop；`world.hasLost()`（全員死）→ gameOver+stop。
- **M-1**：多人分支**不呼叫** `consumeLevelUp`、不暫停；升級僅經 `pick`。
- 渲染（迴圈尾，模式外）：`renderer.render(world, localIndex)`、drawJoystick——與單人共用。

### FR-4 App 接線
- 4B-1 的 `onStart(seed, map, players)` 改為：`session.setReady`/鎖房後 → `game = await Game.startMultiplayer(canvasParent, seed, players.map(p=>p.character), map, session.toTransport(localIndexOfSelf), localIndexOfSelf, bloom)`；`store.phase` 由 `start()`/直接設為 playing。
- 本地玩家 index＝`players` 中本地 id 的位置。
- 單人 `startGame`/`Game.start` 路徑完全不變。

### FR-5 單人零退化
- `runner` 為 null 即單人；單人迴圈、暫停握手、UpgradeModal 全不變；既有測試全綠。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：`toTransport` 自動補中性使單機多人可推進；`Game.startMultiplayer` 建多人局並以 runner 驅動；M-1（多人不暫停、pick 升級）；hasWon/hasLost 結束；App onStart 開多人局；單人零退化（既有測試全綠、單人實機不變）；headless 整合測試驗多人推進/全員死/pick；型別/build 乾淨。

---

## 5. Edge Cases（邊界情況）

- **本地玩家在 players 的 index**：由 id 對應；toTransport(localIndex) 用同一值。
- **多人全員死亡**：`hasLost()` → gameOver。
- **多人本地玩家死亡但隊友存活**：續跑（觀戰），直到 hasLost。
- **升級 pick 在停滯幀**：pendingPick 保留到下次 submitLocalInput（不丟失）。
- **單機 loopback 隊友待命**：自動中性輸入，不阻塞推進。
- **stop 冪等**：多人 stop 同單人，清 runner 引用。

---

## 6. API Contracts（介面契約）

```ts
// engine/net/session.ts — NetSession 介面新增
toTransport(localIndex: number): NetTransport

// engine/net/loopbackSession.ts — LoopbackSession 實作 toTransport（auto-neutral）

// engine/Game.ts
static startMultiplayer(canvasParent: HTMLElement, seed: number, characters: CharacterKind[],
  map: MapKind, transport: NetTransport, localIndex: number, bloomEnabled?: boolean): Promise<Game>
// loop 多人分支；欄位 runner/pendingPick
```

- 單人 `Game.start` 簽章不變；store/UI 介面不變（SP3 的 setMultiOffer/onMultiUpgradePicked 已具備）。

---

## 7. Data Model Changes（資料模型變更）

- `NetSession` 加 `toTransport`；`LoopbackSession` 實作之。
- `Game` 加 `runner`/`pendingPick` + `startMultiplayer` + loop 多人分支。
- App onStart 接 startMultiplayer。

---

## 8. State Changes（狀態變更）

- 多人：onStart → startMultiplayer → runner 驅動 World；輸入經 transport、升級經 pick。
- 單人：完全不變。

---

## 9. UI Behaviour（UI 行為）

- 多人遊玩中：HUD（本地玩家）、可見隊友（SP3 渲染）、多人升級浮層（SP3）；不暫停。
- 單人：完全照舊。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：多人推進全經 LockstepRunner（4A，依 index、固定步長、seeded）；不引入時間/亂數於模擬。
- **架構邊界**：`engine/net/**`/World 純 TS；Game 為膠水層；UI 呈現層。
- **TDD**：`toTransport` 與 headless 多人整合寫單元測試；Game rAF 迴圈靠 build + 本地煙霧 + 審查。
- **N=1 零退化**：單人既有測試與行為不變。

---

## 11. 非目標（本 spec 明確不做）

- 真 Playroom 連線 / 真隊友輸入 / 種子廣播之外部實作（4C）。
- 斷線 / 房主離開處理（4C）。
- 分割畫面 / 本地第二輸入（早排除）；rollback / 抗作弊（整體不做）。
