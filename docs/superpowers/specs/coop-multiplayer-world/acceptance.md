# Acceptance — 多玩家 World 結構重構（多人合作 1A）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：（待填）_

## N=1 回歸（最重要）
- [ ] 既有 `World.test.ts` 全套**不修改**即通過（行為等同保證）
- [ ] `new World(seed)` / `new World(seed, 'neutrophil')` / `new World(seed,'macrophage','stomach')` 皆照舊
- [ ] 相容存取器 `player/stats/weapons/passives/level/playerColor/playerCharacter` 指向 players[0]、行為不變
- [ ] `isPlayerDead()/loadoutSnapshot()/grantXp()/consumeLevelUp()/applyUpgrade()/moveInput=` 作用於 players[0]
- [ ] 單人實機（dev）行為照舊：移動/開火/升級/撿取/Boss/結算無差異

## PlayerState 與 players[]
- [ ] 新增 `PlayerState`（entity/character/stats/weapons/passives/level/xp/pendingLevelUps/lastMoveDir/vacuumTimer/alive）
- [ ] `World.players: PlayerState[]`；共享狀態（enemies/gems/chests/pickups/rng/elapsed/計時器/map*）維持單份
- [ ] 建構子 `character` 接受 `CharacterKind | CharacterKind[]`；陣列建立 N 名玩家
- [ ] `playerCount` 正確；`setMoveInput(i, dir)` 設定對應玩家

## 多玩家機制
- [ ] 各玩家獨立 weapons/stats/level/xp/loadout；玩家 0 收經驗只有玩家 0 升級
- [ ] 敵人每幀追最近的存活玩家（死者被排除）
- [ ] 每位存活玩家武器瞄準離自己最近的敵人、用自己 stats 開火
- [ ] 接觸傷害只打到重疊的玩家（套該玩家護甲）
- [ ] 寶石被進入範圍的玩家逐顆收取；同幀多玩家觸及由 index 較小者收取
- [ ] heal 回收者補血；vacuum 吸向觸發玩家；mercy 門檻＝任一存活玩家 <50%
- [ ] 寶箱碰到的玩家 pendingLevelUps +1

## 難度依人數
- [ ] 常態生怪間隔 = `spawnInterval × mapSpawnIntervalMult ÷ playerCount`
- [ ] Boss 與終局 Boss hp × playerCount（疊乘既有縮放）
- [ ] 一般敵人個體數值不因人數改變

## 死亡 / 觀戰 / 結束
- [ ] 玩家 hp≤0 → alive=false，不被瞄準/不開火/不受傷/不收撿取
- [ ] `hasLost()` = 全員不存活；N=1 與 isPlayerDead() 等價

## 確定性與架構邊界
- [ ] 玩家以固定 index 順序迭代；寶石/碰撞判定順序固定；模擬中不呼叫 Math.random()
- [ ] 相同 seed + 相同角色陣列 + 各玩家相同輸入 → 兩局結果一致
- [ ] World/types/systems 無 Vue/Pinia 執行期 import；固定步長 1/60 不變
- [ ] Game.stop()/PixiRenderer.destroy() 維持冪等

## 驗證快照
- [ ] 單元測試（Vitest）全數通過（既有 N=1 全綠 + 新增 N>1 一組）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單人實機煙霧測試：行為與現況無差異
- [ ] progress.md 已更新
