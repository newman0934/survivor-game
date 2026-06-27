# language: zh-TW
功能: Playroom（Free）adapter — 真連線 NetSession + NetTransport（多人合作 4C）
  作為想跟好友合作的玩家
  我希望用真房間跨機連線並以確定性 lockstep 合作
  以便在 GitHub Pages 上免伺服器遊玩

  背景:
    假設 已安裝 playroomkit
    並且 adapter 位於 src/net/playroom/，僅 import type 引擎型別

  # ---------- Happy Path：大廳 ----------
  場景: 建立房間並取得房間碼
    假設 房主呼叫 insertCoin({ skipLobby: true })
    當 連線完成
    那麼 PlayroomSession.isHost 為 true
    並且 roomCode 來自 getRoomCode() 可供分享

  場景: 加入指定房間
    假設 加入者帶 roomCode 呼叫 insertCoin({ roomCode })
    當 連線完成
    那麼 onPlayerJoin 將其加入玩家列表
    並且 onChange 推送更新給 store

  場景: 角色與就緒同步
    假設 多名玩家在等待室
    當 某玩家 setCharacter 或 setReady
    那麼 對應 player.setState 寫入
    並且 各端透過 onChange 看到一致列表

  場景: 房主開始遊戲廣播種子
    假設 人數 ≥2 且全員就緒（canStart 為 true）
    當 房主 start(seed)
    那麼 seed 與 started 廣播給全房
    並且 各端 onStart(seed, map, players) 觸發

  # ---------- playerIndex 一致性 ----------
  場景: 各機 playerIndex 共識一致
    假設 開局凍結 player.id 排序快照
    當 各端計算 index
    那麼 同一玩家在所有端得到相同 index
    並且 localIndex 為本地 id 在快照中的位置

  # ---------- 局內輸入傳輸 ----------
  場景: 每 tick 廣播並湊齊輸入才推進
    假設 PlayroomTransport playerCount=2、localIndex=0
    當 本地 sendInput(tick, input) 經 RPC 廣播且寫入自身格
    那麼 該 tick 湊齊兩格前 inputsForTick 回 null
    並且 收到對端輸入湊齊後回 TickInputs

  場景: RPC 亂序仍以 tick 為 key 正確歸位
    假設 對端輸入較晚到達
    當 收到時以 tick 與 senderIndex 寫入 buffer
    那麼 對應 tick 湊齊後可推進、不錯位

  # ---------- Validation Failure ----------
  場景: 加入不存在或已滿房間
    假設 加入失敗（Playroom 回報錯誤）
    當 adapter 捕捉錯誤
    那麼 回主選單並顯示錯誤訊息

  # ---------- Error Handling：斷線 ----------
  場景: 任一玩家離線則本局結束
    假設 多人局進行中
    當 某玩家 onPlayerQuit 觸發
    那麼 本局所有端結束、回主選單
    並且 顯示「有玩家離線，本局結束」

  場景: 房主於大廳離開
    假設 等待室中房主離開
    那麼 其他玩家回主選單（無房主遷移）

  # ---------- Boundary：人數 ----------
  場景: 人數邊界
    假設 房間人數介於 2 至 MAX_PLAYERS(4)
    那麼 canStart 僅在 ≥2 且全員就緒時為 true
    並且 滿員後拒絕再加入

  # ---------- Authorization ----------
  場景: 無權限概念
    假設 私房合作、無權威伺服器（設計 Non-Goal）
    那麼 不存在需授權檢查的操作
    並且 此分類標記為 N/A

  # ---------- 單人零退化 ----------
  場景: 單人與既有測試不受影響
    假設 加入 adapter 與相依
    那麼 單人路徑不動、既有 312 測試全綠、typecheck/build 乾淨
