# Acceptance — 音效

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

## 語意事件（World，純引擎）
- [ ] types.ts 新增 SoundEvent union
- [ ] World 有 soundEvents 與 consumeSoundEvents()（回傳並清空）
- [ ] killEnemy → 'kill'；spawnBossAt → 'boss'；撿寶箱 → 'chest'；撿寶石 → 'pickup'
- [ ] grantXp 升級 → 'levelup'；開火（wand/knife 產生投射物）→ 'shoot'
- [ ] 投射物命中扣血 → 'hit'；接觸傷害 → 'hurt'
- [ ] consumeSoundEvents 回傳後再呼叫為空

## SoundManager（單例，Web Audio）
- [ ] src/engine/core/soundManager.ts，匯出單例，無 Vue/Pinia
- [ ] play(event) 依事件合成短音（振盪器/噪訊 + ADSR）；接至單一 masterGain
- [ ] 每事件型別最小間隔節流（避免高頻爆音）
- [ ] resume()、setMuted()、startMusic()、stopMusic()
- [ ] play/resume try/catch，context 未就緒靜默失敗不丟錯

## Game 串接
- [ ] 每幀 step 後 consumeSoundEvents → soundManager.play
- [ ] 死亡 → play('gameover')
- [ ] Game.start：resume() + startMusic()；Game.stop：stopMusic()（冪等）
- [ ] AudioContext 在開始點擊手勢內 resume

## 靜音 UI
- [ ] MuteButton.vue（🔊/🔇）切換 setMuted；App.vue 非選單階段顯示

## 確定性與架構邊界
- [ ] 音訊純副作用、不進 sim、不碰 rng/固定步長；相同 seed 結果不變
- [ ] soundManager.ts 無 Vue/Pinia；World 只推語意字串；MuteButton 為呈現層
- [ ] store/Summary 不變

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含 soundEvents 發射/consume + 既有 115）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 實機驗證：AudioContext running、靜音鈕可切換、遊玩有音效且無爆音、無功能相關 console error
- [ ] progress.md 已更新
