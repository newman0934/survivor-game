# language: zh-TW
功能: 終局 Boss + 勝利條件（有限關卡）
  作為玩家
  我希望撐到關卡終點面對終局 Boss 並擊敗以通關
  以便讓單局有明確目標、高潮與勝利結局

  背景:
    假設 遊戲以固定種子開始

  # ---------- Happy Path ----------
  場景: 15:00 生成終局 Boss
    當 遊戲時間到達 900 秒
    那麼 場上出現一隻 finalboss
    並且 只會生成一隻（重複到點不再生）

  場景: 終局 Boss 出現後停止 60s Boss 與地圖事件
    假設 終局 Boss 已生成
    當 繼續經過數十秒
    那麼 不再生成新的 60 秒 Boss
    並且 不再觸發地圖事件
    並且 一般怪仍持續生成

  場景: 擊敗終局 Boss 即通關
    假設 場上一隻終局 Boss
    當 終局 Boss 死亡
    那麼 World.hasWon() 為 true
    並且 store.phase 變為「won」
    並且 顯示「通關！」勝利畫面

  場景: 通關記錄為 cleared
    假設 玩家擊敗終局 Boss
    當 進入勝利結局
    那麼 該局戰績 cleared 為 true
    並且 累積統計 clears 加一

  場景: 死亡仍為失敗結局
    假設 玩家在通關前死亡
    當 進入結束畫面
    那麼 store.phase 為「over」
    並且 該局戰績 cleared 為 false

  # ---------- Boss 血條 ----------
  場景: 終局 Boss 顯示於 Boss 血條
    假設 終局 Boss 存活
    那麼 summary.bossActive 為 true
    並且 summary.isFinalBoss 為 true

  # ---------- Validation / 相容 ----------
  場景: 舊存檔無 cleared 欄位正規化
    假設 既有存檔的 runs 沒有 cleared 欄位
    當 loadSave 讀取
    那麼 每筆 cleared 正規化為 false
    並且 stats.clears 正規化為 0
    並且 不丟出例外

  # ---------- Boundary Conditions ----------
  場景: 同幀死亡與勝利以勝利優先
    假設 玩家在擊殺終局 Boss 的同一幀也歸零
    那麼 判定為通關（hasWon 優先於 isPlayerDead）

  場景: finalboss 不套地圖 enemyHpMult
    當 於 stomach 地圖（敵人 hp×1.25）生成終局 Boss
    那麼 終局 Boss hp 為固定數值、不乘地圖倍率

  場景: 再玩一次重置關卡進度
    假設 上一局已通關
    當 以 new World 開新局
    那麼 finalBossSpawned 與 won 皆為初值
    並且 關卡重新計時

  # ---------- Error Handling ----------
  場景: 暫停期間到達 15:00 不誤生終局 Boss
    假設 遊戲於接近 15:00 暫停（不 step）
    那麼 計時不前進、終局 Boss 不生成

  # ---------- Determinism ----------
  場景: 終局 Boss 與勝利不破壞確定性
    假設 兩局相同 seed、相同角色/地圖、相同操作
    當 比較模擬結果
    那麼 終局 Boss 生成時間與勝利判定兩局一致

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端單機遊戲
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
