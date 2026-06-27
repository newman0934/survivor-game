# Acceptance — 多玩家 World 結構重構（多人合作 1A）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-27 — 單元測試 241 全過（既有 World 測試零改動 = N=1 回歸護欄）、vue-tsc 乾淨、production build 乾淨、Game.ts/PixiRenderer 零改動；SDD 雙階段審查（8 task + 全分支廣審）皆 Approved（廣審 I-1 回復段 N=1 等價、M-1 已修並複審）。單人實機目視待玩家確認。_

## N=1 回歸（最重要）
- [x] 既有 `World.test.ts` 全套**未修改**即通過（行為等同保證）
- [x] `new World(seed)` / `new World(seed,'neutrophil')` / `new World(seed,'macrophage','stomach')` 皆照舊
- [x] 相容存取器 `player/stats/weapons/passives/level/playerColor/playerCharacter` 指向 players[0]、行為不變
- [x] `isPlayerDead()/loadoutSnapshot()/grantXp()/consumeLevelUp()/applyUpgrade()/moveInput=` 作用於 players[0]
- [x] `Game.ts`/`PixiRenderer` 零改動（相容存取器覆蓋）
- [ ] 單人實機（dev）行為照舊：移動/開火/升級/撿取/Boss/結算無差異（待玩家目視）

## PlayerState 與 players[]
- [x] 新增 `PlayerState`（entity/character/color/stats/weapons/passives/level/xp/pendingLevelUps/lastMoveDir/moveInput/vacuumTimer/alive/bibleAngle/orbitEntities/bibleHitTimers）
- [x] `World.players: PlayerState[]`；共享狀態（enemies/gems/chests/pickups/rng/elapsed/計時器/kills/map*）維持單份
- [x] 建構子 `character` 接受 `CharacterKind | CharacterKind[]`；陣列建立 N 名玩家
- [x] `playerCount` 正確；`setMoveInput(i, dir)` 設定對應玩家

## 多玩家機制
- [x] 各玩家獨立 weapons/stats/level/xp/loadout；玩家 0 收經驗只有玩家 0 升級
- [x] 敵人每幀追最近的存活玩家（死者被排除）
- [x] 每位存活玩家武器瞄準離自己最近的敵人、用自己 stats 開火（含聖經 per-player）
- [x] 接觸傷害/敵彈只打到重疊的玩家（套該玩家護甲）
- [x] 寶石被最近存活玩家收取（單一吸引者、每幀一次位移、確定性）
- [x] heal 回收者補血；vacuum 吸向最近玩家；mercy 門檻＝任一存活玩家 <50%
- [x] 寶箱碰到的玩家 pendingLevelUps +1

## 難度依人數
- [x] 常態生怪間隔 = `spawnInterval × mapSpawnIntervalMult ÷ playerCount`
- [x] Boss 與終局 Boss hp × playerCount（疊乘既有縮放）
- [x] 一般敵人個體數值不因人數改變

## 死亡 / 觀戰 / 結束
- [x] 玩家 hp≤0 → alive=false，不被瞄準/不開火/不受傷/不收撿取
- [x] `hasLost()` = 全員不存活；N=1 與 isPlayerDead() 等價
- [x] 持回復被動瀕死當格不被 regen 救回（N=1 紅線，廣審 I-1 已修 + 測試）

## 確定性與架構邊界
- [x] 玩家以固定 index 順序迭代；寶石/碰撞判定順序固定；模擬中不呼叫 Math.random()
- [x] 相同 seed + 相同角色陣列 + 各玩家相同輸入 → 兩局結果一致（回放測試）
- [x] World/types/systems 無 Vue/Pinia 執行期 import；固定步長 1/60 不變
- [x] Game.stop()/PixiRenderer.destroy() 維持冪等（未動）

## 驗證快照
- [x] 單元測試（Vitest）全數通過（既有 N=1 全綠 + 新增 N>1 一組）— 241 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 單人實機煙霧測試：行為與現況無差異（待玩家於 `npm run dev` 確認）
- [x] progress.md 已更新

## 後續技術債（廣審記錄，非本份阻斷）
- World.ts 921 行、step 可抽 `fireWeaponsFor(p)`/`collectPickupsFor(p)` per-player 方法（SP2/SP3 前）。
- 確定性測試覆蓋面可擴充（SP2 全面稽核時）。
