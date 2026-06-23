# language: zh-TW
功能: 多角色（可選起始角色）
  作為玩家
  我希望進場前選擇不同起始角色
  以便用不同的起始武器/數值/被動體驗多樣的開局

  背景:
    假設 遊戲以固定種子開始

  # ---------- Happy Path ----------
  場景: 以遊俠開局套用其起始狀態
    當 以角色「ranger」建立 World
    那麼 起始武器為飛刀（knife）
    並且 stats.moveSpeed 等於 ranger 的設定（240）
    並且 player.maxHp 與 hp 等於 ranger 的 maxHp（80）
    並且 playerColor 等於 ranger 的顏色

  場景: 法師起始高傷害
    當 以角色「mage」建立 World
    那麼 起始武器為聖經（bible）
    並且 stats.damageMult 等於 1.25

  場景: 豐收者起始帶被動
    當 以角色「harvester」建立 World
    那麼 起始武器為大蒜（garlic）
    並且 passives 含「crown」
    並且 stats.xpGain 大於 1（皇冠已套用）

  場景: 戰士高血與護甲
    當 以角色「warrior」建立 World
    那麼 player.maxHp 等於 140
    並且 stats.armor 大於 0

  # ---------- 選角流程（實機目視） ----------
  場景: 主選單選角後開局
    假設 玩家在主選單看到 4 張角色卡
    當 玩家選擇某角色並按開始遊戲
    那麼 該角色的起始狀態套用於本局
    並且 遊戲中玩家圓為該角色顏色

  場景: 再玩一次沿用角色
    假設 玩家以某角色遊玩並死亡
    當 玩家按「再玩一次」
    那麼 沿用上次選定的角色開新局

  # ---------- Boundary Conditions ----------
  場景: 省略角色參數時預設戰士
    當 以 new World(seed) 建立（不傳角色）
    那麼 套用 warrior 的起始狀態

  # ---------- Determinism ----------
  場景: 角色不破壞確定性
    假設 兩局使用相同 seed、相同角色、相同操作
    當 比較模擬結果
    那麼 兩局一致（角色只改起始狀態）

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端單機遊戲
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
