# language: zh-TW
功能: 確定性全面稽核 + 回放雜湊測試（多人合作 2）
  作為開發者
  我希望有自動化護欄保證模擬確定性
  以便 lockstep 多人不會因非確定性而 desync，並供日後迴歸把關

  背景:
    假設 引擎為固定步長、seeded rng 的純 TS 模擬

  # ---------- Checksum 工具 ----------
  場景: Checksum 確定且順序敏感
    當 用相同 number 序列各建一個 Checksum 並 add
    那麼 兩者 value() 相同
    並且 交換其中兩個數的順序後 value() 不同

  # ---------- World.checksum ----------
  場景: 同狀態同 checksum
    假設 兩個以相同 seed/角色建立、未 step 的 World
    那麼 兩者 checksum() 相同

  場景: 狀態改變則 checksum 改變
    假設 一個 World
    當 step 推進若干幀（產生敵人/移動）
    那麼 checksum() 與初始不同

  # ---------- 回放確定性 ----------
  場景: 同 seed 同輸入兩 run 相同
    假設 固定輸入腳本（2 玩家、N 幀）
    當 以兩個全新 World 各跑一次該腳本
    那麼 兩次最終 checksum() 完全相同

  場景: 不同 seed 結果不同
    假設 相同輸入腳本、不同 seed
    當 各跑一次
    那麼 兩次 checksum() 不同（確認 checksum 非定值）

  場景: 單人也確定
    假設 單一玩家、固定輸入、相同 seed
    當 跑兩次
    那麼 兩次 checksum() 相同

  # ---------- 原始碼守護 ----------
  場景: 模擬路徑無非確定性 global
    假設 src/engine 中模擬路徑檔（排除呈現/IO/驅動/測試）
    當 去除註解後掃描
    那麼 不含 Math.random( / Date.now( / performance.now(

  場景: 守護範圍排除呈現/驅動層
    假設 呈現層（renderer/sprites/audio/effects/背景）與驅動層（Game）合法使用 Math.random/時間
    那麼 這些檔不在守護掃描範圍內

  # ---------- 不退化 ----------
  場景: 不改遊戲行為
    假設 本功能僅新增 checksum 與測試
    那麼 既有單元測試全數通過
    並且 遊戲執行行為不變

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端引擎工具/測試
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
