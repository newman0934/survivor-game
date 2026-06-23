# Spec — 音效（程式合成 SFX + 背景音樂）

**日期：** 2026-06-23
**功能名稱：** sound
**所屬階段：** 階段 4 — 後設系統（音效）
**狀態：** 待批准（Approval Gate）

---

## 1. Overview（總覽）

用 Web Audio API **即時合成**音效（零外部音檔）：戰鬥 SFX（開火/命中/擊殺）、事件 SFX（拾取/升級/
受傷/Boss/死亡）、合成背景音樂與靜音開關。引擎只推「語意事件」字串，音訊全在 SoundManager。

World 事件發射為純引擎邏輯、寫單元測試；SoundManager/音樂/靜音 UI 為瀏覽器輸出膠水層、實機驗證。

---

## 2. Business Requirements（商業需求）

- 音效大幅提升打擊感與回饋，是原型走向成品的關鍵。
- 零外部資產依賴，完全可在本環境產出。
- 不破壞架構紅線：引擎純 TS、無 Vue/Pinia 執行期依賴；確定性（音訊為副作用）；固定步長。

---

## 3. Functional Requirements（功能需求）

### FR-1 語意事件佇列（World）
- `types.ts` 新增 `SoundEvent = 'shoot'|'hit'|'kill'|'pickup'|'levelup'|'hurt'|'boss'|'chest'`。
- `World` 新增 `soundEvents: SoundEvent[]` 與 `consumeSoundEvents()`（回傳並清空）。
- step 關鍵點 push：開火（wand/knife 產生投射物）→ 'shoot'；投射物命中扣血 → 'hit'；
  `killEnemy` → 'kill'；撿寶石 → 'pickup'；`grantXp` 升一級 → 'levelup'；接觸傷害 → 'hurt'；
  `spawnBossAt` → 'boss'；撿寶箱 → 'chest'。

### FR-2 SoundManager（單例，Web Audio）
- `src/engine/core/soundManager.ts`：用瀏覽器 Web Audio、不依賴 Vue/Pinia（與 KeyboardInput 同層）。
- `AudioContext` + 單一 `masterGain`；`play(event)` 依事件以振盪器/噪訊 + ADSR 合成短音。
- **節流**：每事件型別最小間隔（shoot 60ms、hit 50ms、hurt 200ms…），避免高頻爆音。
- `resume()`（手勢內啟動/恢復 context）、`setMuted(bool)`（masterGain 0/正常）、
  `startMusic()` / `stopMusic()`（合成琶音循環）。
- 匯出單例 `soundManager` 供 Game 與 UI 共用。
- play/resume 以 try/catch 包覆，context 未就緒時靜默失敗不丟錯。

### FR-3 Game 串接
- 每幀 step 後 `for (const ev of world.consumeSoundEvents()) soundManager.play(ev)`。
- 死亡分支 `soundManager.play('gameover')`。
- `Game.start`：`soundManager.resume()` + `startMusic()`；`Game.stop`：`stopMusic()`（冪等）。

### FR-4 靜音 UI
- `ui/MuteButton.vue`（右上角，🔊/🔇）切換 `soundManager.setMuted`；`App.vue` 在非選單階段顯示。

---

## 4. Acceptance Criteria（驗收標準）

詳見 `acceptance.md`。摘要：各動作發出對應語意事件、SoundManager 合成播放並節流、靜音鈕可切換、
背景音樂播放/停止；既有測試全綠、型別/build 乾淨、實機 AudioContext running 且無 console error。

---

## 5. Edge Cases（邊界情況）

- **高頻事件**（shoot/hit/hurt）：SoundManager 每型別最小間隔節流。
- **一格多殺**：佇列多筆 'kill'，節流後合為少數播放。
- **AudioContext 未經手勢**：在 Game.start / 靜音鈕點擊內 resume()；仍 suspended 時 play 靜默失敗（try/catch）。
- **靜音中**：事件照常入佇列，masterGain 0 不出聲。
- **重開/回選單**：`stopMusic()`；單例 AudioContext 重用、不重建。
- **暫停（升級彈窗）**：loop 不 step、不發事件。

---

## 6. API Contracts（介面契約）

```ts
// types.ts
export type SoundEvent = 'shoot' | 'hit' | 'kill' | 'pickup' | 'levelup' | 'hurt' | 'boss' | 'chest'

// World.ts
soundEvents: SoundEvent[]
consumeSoundEvents(): SoundEvent[]   // 回傳並清空

// engine/core/soundManager.ts
export const soundManager: {
  resume(): void
  play(event: SoundEvent | 'gameover'): void
  setMuted(muted: boolean): void
  startMusic(): void
  stopMusic(): void
}
```

- store / Summary 不變。

---

## 7. Data Model Changes（資料模型變更）

- 新增 `SoundEvent` 型別。
- `World` 新增 `soundEvents` 與 `consumeSoundEvents()`。
- 新增 `soundManager` 單例與 `MuteButton.vue`。

---

## 8. State Changes（狀態變更）

- World step 在關鍵點推語意事件；Game 每幀排空並交 SoundManager 播放。
- Game.start/stop 控制音樂與 context resume。
- 其餘流程不變。

---

## 9. UI Behaviour（UI 行為）

- 右上角靜音鈕；遊戲中各動作有對應音效；背景音樂於遊玩時循環。
- HUD / 選單 / 升級彈窗 / Boss 血條數值與佈局不變。

---

## 10. Non-Functional Requirements（非功能需求）

- **確定性**：音訊純副作用、不進 sim、不碰 rng/固定步長。
- **架構邊界**：`soundManager.ts` 用瀏覽器 API、無 Vue/Pinia；World 只推語意字串；MuteButton 為呈現層。
- **TDD**：World 事件發射 + consumeSoundEvents 寫單元測試；SoundManager/音樂/UI 實機驗證。
- **資源清理**：`Game.stop()` 呼叫 `stopMusic()`（冪等）；AudioContext 單例重用。

---

## 11. 合成配方（草案，定稿於 soundManager.ts）

| 事件 | 合成 |
|------|------|
| shoot | 方波 600→300Hz、0.08s |
| hit | 白噪短爆 + lowpass、0.05s |
| kill | 方波下滑 400→120Hz、0.12s |
| pickup | 正弦 660→990Hz、0.08s |
| levelup | 523→784Hz 兩音、0.25s |
| hurt | 低方波 160→80Hz、0.15s |
| boss | 鋸齒 80→120Hz + 噪訊、~0.5s |
| chest | 784→988→1318Hz 三音、0.3s |
| gameover | 440→330→220Hz、0.6s |

背景音樂：低音量正弦音符短 pattern 循環。

---

## 12. 非目標（本 spec 明確不做）

- 多軌動態音樂、空間化音效、每武器專屬音、音量滑桿（只做靜音開關）。
- 音檔載入 / atlas。
