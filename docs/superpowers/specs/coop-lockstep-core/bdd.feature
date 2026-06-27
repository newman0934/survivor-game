# language: zh-TW
功能: Lockstep 核心（多人合作 4A）
  作為開發者
  我希望有傳輸無關的 lockstep 輸入迴圈與 loopback，並能用 checksum 驗多端同步
  以便為真連線（4C）打下可測、確定的同步基礎

  背景:
    假設 引擎為固定步長、seeded、且有 World.checksum()（SP2）

  # ---------- LoopbackTransport ----------
  場景: 全員到齊才回 TickInputs
    假設 playerCount 2 的 LoopbackBus
    當 只有玩家 0 送出某 tick 輸入
    那麼 inputsForTick(該 tick) 回 null
    當 玩家 1 也送出該 tick 輸入
    那麼 inputsForTick(該 tick) 回兩人的 TickInputs

  # ---------- 兩端 lockstep 同步（核心） ----------
  場景: 兩 runner 經共享 bus 同步推進
    假設 兩個各自的 World 透過同一 LoopbackBus、各驅動自己的 LockstepRunner（localIndex 0/1）
    當 每幀各送自己玩家的腳本輸入並 tryAdvance 到底
    那麼 兩 runner 每個 tick 的 checksum 完全相同

  場景: 缺輸入時停滯
    假設 某 tick 只有部分玩家輸入到齊
    當 tryAdvance()
    那麼 回 false、currentTick 不前進
    當 其餘玩家輸入到齊後 tryAdvance()
    那麼 回 true、推進一個 tick

  # ---------- 輸入延遲 ----------
  場景: inputDelay 生效
    假設 inputDelay = 2
    當 在某 tick 送出本地輸入
    那麼 該輸入於 tick+2 才被套用

  # ---------- 升級走輸入流 ----------
  場景: pick 於該 tick 套用
    假設 某玩家該 tick 的 PlayerInput 帶 pick=某待選 id
    當 runner 執行該 tick
    那麼 以 world.chooseUpgrade(該玩家, pick) 套用該升級

  # ---------- 確定性 ----------
  場景: 相同腳本兩跑一致
    假設 相同 seed、相同全員輸入腳本
    當 跑兩次 lockstep
    那麼 兩次 checksum 序列完全相同

  # ---------- 不退化 ----------
  場景: 不動既有檔案
    假設 本功能僅新增 engine/net/ 與測試
    那麼 既有單元測試全數通過
    並且 單人執行路徑不受影響

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端引擎核心（真連線/權限屬 4C，且為私房合作不需權威防護）
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
