# language: zh-TW
功能: 進度存檔（localStorage）
  作為玩家
  我希望遊戲記住我的歷史戰績與累積統計
  以便重開瀏覽器後仍能看到最佳成績並產生重玩動機

  背景:
    假設 存檔使用 localStorage key "survivor-save-v1"
    而且 saveStore 可注入記憶體 storage 以利測試

  # Happy Path
  場景: 首場結束記錄戰績並判為破紀錄
    假設 目前沒有任何存檔
    當 玩家結束一場「存活 75 秒、擊殺 40、等級 6、巨噬細胞、血管」的遊戲
    那麼 recordRun 回傳 isNewBestTime 為 true
    而且 recordRun 回傳 isNewBestKills 為 true
    而且 存檔的 runs 含這筆紀錄
    而且 stats 為 totalKills=40、totalRuns=1、bestTime=75、bestKills=40、maxLevel=6

  場景: 第二場更佳成績更新最佳紀錄與累積統計
    假設 已有一場「存活 75 秒、擊殺 40、等級 6」的存檔
    當 玩家結束一場「存活 120 秒、擊殺 90、等級 9」的遊戲
    那麼 isNewBestTime 為 true
    而且 stats 為 totalKills=130、totalRuns=2、bestTime=120、bestKills=90、maxLevel=9

  場景: 主選單顯示累積統計概覽
    假設 已有 totalKills=130、totalRuns=2、bestTime=120、maxLevel=9 的存檔
    當 玩家在主選單
    那麼 顯示總擊殺 130、遊玩場數 2、最佳存活 2:00、最高等級 9

  # Validation Failure（破紀錄邊界）
  場景: 存活時間平手不算破紀錄
    假設 已有 bestTime=120 的存檔
    當 玩家結束一場「存活 120 秒」的遊戲
    那麼 isNewBestTime 為 false

  場景: 較差成績不更新最佳但仍累加總計
    假設 已有 totalKills=130、totalRuns=2、bestTime=120 的存檔
    當 玩家結束一場「存活 30 秒、擊殺 10」的遊戲
    那麼 isNewBestTime 為 false
    而且 stats 為 totalKills=140、totalRuns=3、bestTime=120

  # Boundary Conditions（runs 上限）
  場景: runs 僅保留依存活時間前 10，但總計仍含被擠出者
    假設 已有 10 筆存活時間各異的戰績存檔
    當 玩家結束一場存活時間低於現有全部 10 筆的遊戲
    那麼 runs 仍為 10 筆且不含本場
    而且 totalRuns 增加 1
    而且 totalKills 含本場擊殺

  # Error Handling（容錯）
  場景: 壞掉的存檔讀取時回空白存檔
    假設 localStorage 內 "survivor-save-v1" 為無法解析的字串
    當 呼叫 loadSave
    那麼 回傳空白存檔（runs 為空、stats 全為 0）
    而且 不丟出例外

  場景: 版號不符的存檔視為空白
    假設 localStorage 內存檔的 version 不是 1
    當 呼叫 loadSave
    那麼 回傳空白存檔

  場景: 寫入失敗時不影響遊玩
    假設 storage 的 setItem 會丟出例外
    當 呼叫 recordRun
    那麼 不丟出例外
    而且 回傳的 save 與破紀錄旗標在記憶體內仍正確

  # Authorization
  場景: 存檔為本機單機資料無需授權
    假設 遊戲為純前端單機
    當 讀寫存檔
    那麼 僅存取本機 localStorage，不涉及帳號或網路請求
