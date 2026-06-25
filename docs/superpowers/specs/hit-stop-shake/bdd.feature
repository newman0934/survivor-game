# language: zh-TW
功能: 打擊頓挫 + 震屏（hit-stop-shake）
  作為玩家
  我希望擊殺與大事件有鏡頭震動與短暫頓挫
  以便獲得更有重量感的打擊回饋

  背景:
    假設 遊戲進行中且 EffectsLayer 已啟用

  # Happy Path
  場景: 擊殺與大事件分級震屏
    當 擊殺一般小怪
    那麼 鏡頭微幅震動
    當 觸發 nova / 進化大招命中
    那麼 鏡頭中幅震動
    當 Boss 受擊或死亡
    那麼 鏡頭大幅震動

  # Happy Path
  場景: 大時刻頓挫
    當 Boss 受擊、Boss 死亡、或自爆體/超級病原死亡
    那麼 遊戲短暫凍結（hit-stop）後恢復
    並且 凍結期間畫面持續渲染、恢復後無事後追趕

  # Validation Failure（節流）
  場景: Boss 高頻受擊不連續頓挫
    假設 Boss 被自動火力每秒多次命中
    當 多次受擊在冷卻時間內發生
    那麼 頓挫受全域冷卻節流、不連發、不造成卡頓

  # Boundary Conditions
  場景: 一般擊殺不頓挫
    當 高頻擊殺大量小怪
    那麼 僅微幅震屏、不觸發頓挫
    並且 不掉幀卡頓

  # Boundary Conditions
  場景: 同幀多個大型死亡
    當 多個大型敵人同一幀死亡
    那麼 頓挫不疊加（受冷卻）
    並且 震屏不超過既有上限

  # Error Handling / 不變項
  場景: 頓挫不影響確定性
    當 頓挫凍結迴圈
    那麼 模擬內容與隨機序列不變
    並且 僅本地 wall-clock 推進被暫停

  # Boundary Conditions（可及性）
  場景: 減少動態偏好關閉震屏與頓挫
    假設 使用者系統設定 prefers-reduced-motion: reduce
    當 擊殺或大事件發生
    那麼 不震屏、不頓挫
    並且 畫面保持穩定

  # Boundary Conditions
  場景: 玩家受傷震屏不變
    當 玩家受到傷害
    那麼 沿用既有依傷害強度的紅暈與震屏行為
