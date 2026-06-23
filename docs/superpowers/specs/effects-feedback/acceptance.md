# Acceptance — 打擊反饋特效（A 批）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。
（呈現層功能，特效以實機目視驗證；引擎不動、既有測試維持全綠。）

_驗證日期：2026-06-23（程式/型別/build/單元測試 + 實機目視全數通過）_

## EffectsLayer 模組
- [x] 新增 `engine/effects.ts` 的 `class EffectsLayer`
- [x] 持 worldFx（隨鏡頭）+ screenFx（螢幕固定）兩容器
- [x] 內部陣列管理活躍特效，壽命到自動移除並 destroy
- [x] `destroy()` 冪等、清空所有特效容器與陣列

## 事件偵測接線（PixiRenderer）
- [x] 敵人 sprite 消失 → spawnKill（敵色）
- [x] 寶石 sprite 消失 → spawnPickup
- [x] 敵人 hp 下降 → spawnDamage（prevHp - hp）
- [x] 玩家 hp 下降 → hurt（boss 更強）
- [x] world.currentLevel 上升沿 → spawnLevelUp（玩家位置）

## 擊殺特效
- [x] 敵色 8–10 粒子隨機噴射 + 微重力 + 0.4s 淡出縮小
- [x] 環形衝擊波擴張淡出

## 收集閃光
- [x] 寶石位置亮綠星芒 + 擴張光圈（約 0.25s）

## 升級光環
- [x] 玩家身上金色光環擴張 + 上升光點（約 0.6s）
- [x] World 新增唯讀 `get currentLevel()`，不改模擬邏輯

## 傷害數字 + 節流
- [x] 白色數字向上飄 + 淡出（約 0.5s）
- [x] 同時存活上限 MAX_DAMAGE_TEXTS（達上限不生成新字）

## 受傷紅暈 + 鏡頭震動
- [x] 螢幕邊緣紅色 vignette，hurt 拉高 alpha、每幀衰減
- [x] update() 回傳 shake 偏移，PixiRenderer 加到鏡頭 position
- [x] resize 重畫紅暈

## 效能 / 節流
- [x] 擊殺粒子全域上限 MAX_PARTICLES（達上限只出環波）
- [x] 所有特效固定壽命自動回收、不累積

## 不變項
- [x] 既有造型、命中閃白、動畫、相機跟隨照舊
- [x] 模擬、碰撞、生怪、難度倍率、store/Summary 不變
- [x] Game.stop() / PixiRenderer.destroy() / EffectsLayer.destroy() 冪等

## 確定性與架構邊界
- [x] 特效純視覺、不進 sim；相同 seed 模擬結果不變
- [x] 只新增 effects.ts（呈現層）+ PixiRenderer 接線 + World 一個唯讀 getter；引擎/store/型別契約不變

## 驗證快照（完成時填寫）
- [x] 既有單元測試（Vitest）全數維持通過（122）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 實機驗證：擊殺/收集/升級/傷害數字/受傷紅暈+震動皆如設計、節流有效、FPS 正常、0 功能相關 console error
- [x] progress.md 已更新
