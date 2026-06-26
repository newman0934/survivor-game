# Acceptance — 精英怪 + 地圖事件

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-26 — 單元測試 217 全過、vue-tsc 乾淨、production build 乾淨、SDD 雙階段審查（4 task + 全分支廣審）皆 Approved（廣審 I-1/M-2/M-4/M-5 已修並複審）。實機目視待玩家確認。_

## 詞綴定義
- [x] 新增 `EliteAffix`（4 種）、`EliteAffixDef`；`ELITE_AFFIX_DEFS` + `ELITE_AFFIX_ORDER`
- [x] 四詞綴數值正確：giant(hp×3,r×1.6,spd×0.8)、frenzy(spd×1.5,dmg×1.3)、regen(0.04/s)、volatile(explodeOnDeath,90/18)
- [x] 每詞綴含 affix/name/auraColor/各乘區/regenPerSec/explodeOnDeath/explodeRadius/explodeDamage 完整欄位

## 精英基線與套用
- [x] `spawnEnemyAt(pos, kind, affix?)` 新增選填 affix，省略時行為與現況一致
- [x] 精英 maxHp = baseHp × mapEnemyHpMult × 3 × hpMult
- [x] 精英 radius/speed/damage 各乘對應 mult；掉落經驗寶石為 baseXp × 5
- [x] entity.affix 正確設定

## 精英行為
- [x] regen 精英每幀回血 maxHp × 0.04 × dt，且不超過 maxHp
- [x] volatile 精英死亡觸發一次範圍爆炸（半徑 90/傷害 18，套玩家護甲）對玩家造成傷害
- [x] 精英死亡額外掉一個寶箱
- [x] exploder 敵種的 def.explode 優先於 volatile affix（?? 短路），不雙重爆炸

## 精英隨機混入
- [x] 開局滿 60 秒後，常態生怪以 0.02 機率改生精英（詞綴走 seeded rng）
- [x] swarm（bacteria 群）不套隨機精英

## 地圖事件
- [x] 新增 `GameEventKind`（3 種）、`GameEventDef`；`GAME_EVENT_DEFS` + `GAME_EVENT_ORDER`
- [x] `pickEvent(rng)` 確定性挑選
- [x] 每 150 秒觸發一個事件；觸發前 5 秒 `summary.eventWarning` 帶警告字串、開始後清空
- [x] swarm-rush 單方向湧入弱怪(12)；elite-pack 生成 3 隻精英；encircle 整圈生成(16)
- [x] 預警窗鎖定 pendingEvent，預警文字與觸發事件同種；觸發後敵人數確實增加

## 確定性與架構邊界
- [x] 詞綴抽選/事件挑選/事件生怪一律走 seeded rng；模擬中不呼叫 Math.random()
- [x] eliteDefs.ts/eventDefs.ts/events.ts/World 無 Vue/Pinia 執行期 import
- [x] 固定步長 1/60 不變；升級/戰鬥/結算/勝負流程不變
- [x] 暫停期間（不 step）預警計時凍結、事件不誤觸（Game 迴圈層 !paused gate）
- [x] 既有 spawnEnemyAt 呼叫端（分裂/boss/測試）不帶 affix、行為不變；store reset 清 eventWarning
- [x] triggerEvent 對 GameEventKind 有 exhaustive guard（新增事件編譯期攔）

## 呈現層（實機目視 — 待玩家確認）
- [ ] 精英帶詞綴色發光光環，與一般怪明顯區隔
- [ ] 事件預警橫幅於觸發前顯示、事件開始後消失（含 reduced-motion 關閉脈動）

## 驗證快照
- [x] 單元測試（Vitest）全數通過（含 events 挑選/排程、精英套用/行為）— 217 passed
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [ ] 實機煙霧測試：精英光環可辨、事件預警與三種事件行為正確（待玩家於 `npm run dev` 確認）
- [x] progress.md 已更新
