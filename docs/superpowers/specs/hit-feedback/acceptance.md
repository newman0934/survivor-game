# Acceptance — 打擊反饋特效強化（B3）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（純 renderer 特效屬呈現層、不寫單元測試；以 typecheck/build + 瀏覽器實機（打怪看特效）驗證；既有 181 測試維持全綠、引擎/store 零改動。）

_驗證日期：（待填）_

## 命中火花/濺紅（spawnHit）
- [ ] `EffectsLayer.spawnHit(x, y, color)`：亮火花（~3，快短壽）+ 主題色體液滴（~2，輕重力），接 bloom
- [ ] PixiRenderer 在敵人 hp 下降處加呼叫 `spawnHit(敵人pos, 敵人色)`，仍保留傷害數字
- [ ] 走既有粒子系統、上限保護

## 逐病原死亡（spawnKill 依 kind）
- [ ] `spawnKill` 接受 `kind?: EnemyKind`；PixiRenderer 敵 sprite 消失時帶入
- [ ] 細菌體液大濺射 / 病毒外殼碎片 / 孢子爆孢 / 自爆大爆裂 / 超級病原加大版
- [ ] 其餘（螺旋/噴吐/分裂）保留既有基礎爆裂
- [ ] 碎片以多邊形 Graphics 走既有粒子系統

## 效能克制
- [ ] 每事件粒子數克制；達 MAX_PARTICLES 上限略過、不掉幀

## 不變項（硬性）
- [ ] 只動 `effects.ts` + `PixiRenderer.ts`；引擎/模擬/ World / store 零改動
- [ ] 特效不影響碰撞/傷害/掉落；確定性不變
- [ ] 既有 181 單元測試全綠；destroy 清掉所有粒子（含 spawnHit）

## 驗證快照（完成時填寫）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 單元測試全綠（181，不新增/不破壞）
- [ ] 實機驗證（瀏覽器）：命中見火花+濺紅、各病原死法不同、與 bloom 呼應、高頻不爆量掉幀、可讀性維持、重開無殘留、0 功能相關 console error
- [ ] progress.md 已更新
