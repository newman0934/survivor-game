# language: zh-TW
功能: 精英怪 + 地圖事件
  作為玩家
  我希望單局中出現帶詞綴的精英怪與週期性波次事件
  以便獲得有起伏的節奏與高價值優先目標

  背景:
    假設 遊戲以固定種子開始

  # ---------- Happy Path：精英套用 ----------
  場景: 巨大化精英數值正確
    當 以 affix「giant」在某點生成一隻 virus 精英
    那麼 該敵人 affix 為「giant」
    並且 maxHp 等於 virus 基礎 hp × 3 × 3.0
    並且 radius 等於 virus 基礎 radius × 1.6
    並且 speed 等於 virus 基礎 speed × 0.8

  場景: 狂暴精英提升速度與接觸傷害
    當 以 affix「frenzy」生成一隻 virus 精英
    那麼 speed 等於 virus 基礎 speed × 1.5
    並且 damage 等於 virus 基礎 damage × 1.3

  場景: 精英死亡掉寶箱且給高經驗
    假設 場上一隻精英
    當 精英死亡
    那麼 掉落一個寶箱
    並且 掉落的經驗寶石為基礎 xp × 5

  場景: 再生精英隨時間回血
    假設 一隻 regen 精英 hp 低於 maxHp
    當 經過數個固定步長且未受傷
    那麼 hp 隨時間回升（每秒 maxHp 的 4%）
    並且 hp 不超過 maxHp

  場景: 爆裂精英死亡時範圍爆炸
    假設 一隻 volatile 精英靠近玩家
    當 精英死亡
    那麼 觸發一次範圍爆炸並對範圍內玩家造成傷害

  # ---------- Happy Path：事件 ----------
  場景: 事件每 150 秒觸發並先預警
    假設 遊戲進行中
    當 接近第 150 秒
    那麼 觸發前 5 秒 summary.eventWarning 帶警告字串
    並且 事件開始後 eventWarning 清空

  場景: 精英來襲事件生成多隻精英
    當 觸發「elite-pack」事件
    那麼 一次生成 3 隻精英
    並且 每隻各帶一個詞綴

  # ---------- Validation / 合法性 ----------
  場景: 詞綴與事件定義合法
    假設 ELITE_AFFIX_DEFS 與 GAME_EVENT_DEFS
    那麼 每個詞綴的乘區欄位為正數
    並且 每個事件含 kind/name/warning

  # ---------- Boundary Conditions ----------
  場景: 省略 affix 行為與現況一致
    當 以 spawnEnemyAt(pos, 'virus') 生成（不帶 affix）
    那麼 該敵人無 affix
    並且 hp 與既有非精英行為一致

  場景: 隨機精英僅於開局 60 秒後混入
    假設 開局未滿 60 秒
    那麼 常態生怪不會隨機產生精英

  場景: swarm 群不套隨機精英
    當 觸發 bacteria 群生成
    那麼 群中個體皆非精英

  # ---------- Error Handling ----------
  場景: 暫停期間預警計時凍結
    假設 事件預警進行中
    當 遊戲暫停（不 step）
    那麼 預警計時不前進、事件不誤觸

  # ---------- Determinism ----------
  場景: 精英與事件不破壞確定性
    假設 兩局相同 seed、相同角色/地圖、相同操作
    當 比較模擬結果
    那麼 詞綴抽選、事件挑選、事件生怪兩局一致

  # ---------- Authorization（單機前端，無權限層） ----------
  場景: 無權限概念
    假設 本功能為純前端單機遊戲
    那麼 不存在需要授權檢查的操作
    並且 此分類標記為 N/A
