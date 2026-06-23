# language: zh-TW
功能: 音效（程式合成 SFX + 背景音樂）
  作為玩家
  我希望遊戲動作有音效回饋並可靜音
  以便獲得更有打擊感的體驗

  背景:
    假設 遊戲以固定種子開始

  # ---------- 語意事件發射（純引擎邏輯） ----------
  場景: 擊殺敵人發出 kill 事件
    假設 一隻敵人 hp 被打到 0
    當 World 結算其死亡（killEnemy）
    那麼 soundEvents 含 'kill'

  場景: Boss 生成發出 boss 事件
    當 spawnBossAt 生成 Boss
    那麼 soundEvents 含 'boss'

  場景: 撿寶箱發出 chest、撿寶石發出 pickup
    假設 玩家分別撿取寶箱與寶石
    那麼 soundEvents 含 'chest' 與 'pickup'

  場景: 升級發出 levelup 事件
    假設 玩家經驗跨越升級門檻
    當 grantXp 升一級
    那麼 soundEvents 含 'levelup'

  場景: 開火發出 shoot 事件
    假設 場上有敵人、武器冷卻歸零
    當 武器開火產生投射物
    那麼 soundEvents 含 'shoot'

  場景: consumeSoundEvents 回傳後清空
    假設 soundEvents 有若干事件
    當 呼叫 consumeSoundEvents
    那麼 回傳該批事件
    並且 再次呼叫回傳空陣列

  # ---------- 音訊輸出（實機目視/聆聽） ----------
  場景: 各動作有對應音效
    假設 在瀏覽器遊玩（AudioContext 已啟動）
    當 開火/擊殺/撿取/升級/受傷/Boss 出現
    那麼 播放對應合成音效（節流避免爆音）

  場景: 靜音開關
    假設 玩家點擊靜音鈕
    那麼 SFX 與背景音樂靜音；再點擊恢復

  場景: 背景音樂於遊玩時循環、死亡/回選單停止
    假設 開始遊戲
    那麼 背景音樂播放；死亡或回選單時停止

  # ---------- Determinism ----------
  場景: 音效不影響確定性
    假設 音訊為副作用、不進 sim
    那麼 相同 seed 的模擬結果不變

  # ---------- Error Handling ----------
  場景: AudioContext 未就緒不丟錯
    假設 尚未經使用者手勢
    當 play 被呼叫
    那麼 靜默失敗、不丟出例外

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端單機遊戲
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
