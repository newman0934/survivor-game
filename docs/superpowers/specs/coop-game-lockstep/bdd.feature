# language: zh-TW
功能: Game 多人 lockstep 模式 + M-1（多人合作 4B-2）
  作為玩家
  我希望在等待室開始後，多人局以 lockstep 跑起來且升級非阻塞
  以便（4C 接真連線後）跨機合作

  背景:
    假設 使用 LoopbackSession（真連線屬 4C）

  # ---------- toTransport 自動補中性 ----------
  場景: 單機多人可推進（隊友自動中性）
    假設 2 玩家、本地 index 0、用 session.toTransport(0)
    當 只送出本地玩家某 tick 輸入
    那麼 inputsForTick(該 tick) 非 null（非本地玩家自動補中性）

  # ---------- Game 多人模式 ----------
  場景: onStart 開多人局
    假設 等待室房主按開始觸發 onStart(seed, map, players)
    當 App 呼叫 Game.startMultiplayer
    那麼 以 new World(seed, characters, map) + LockstepRunner 開局
    並且 store.phase 為 playing

  場景: 多人不暫停、升級走 pick（M-1）
    假設 多人局進行中、本地玩家升級
    那麼 不觸發單人暫停握手
    並且 本地點選升級卡 → pendingPick → 下次 submitLocalInput 帶 pick → chooseUpgrade

  場景: 多人推進（headless 整合）
    假設 多人 World + LockstepRunner + auto-neutral transport
    當 每 tick 送本地輸入並 tryAdvance
    那麼 World 持續推進、不停滯

  場景: 全員死亡結束
    假設 多人局所有玩家死亡
    當 推進
    那麼 world.hasLost() 為 true → 進結算

  # ---------- 單人零退化 ----------
  場景: 單人不走 runner
    假設 單人 startGame
    那麼 Game.runner 為 null、走既有單人迴圈
    並且 單人暫停握手/UpgradeModal 不變

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 私房合作、無權威防護（設計 Non-Goal）
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
