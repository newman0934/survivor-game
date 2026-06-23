# Acceptance — 手機支援（觸控 + RWD）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

_驗證日期：2026-06-23 — 單元測試 111 全過、vue-tsc 乾淨、build 乾淨、行動裝置模擬驗證通過。_

## 觸控輸入
- [x] 新增 core/touchInput.ts：TouchInput（Pointer Events）+ joystickVector 純函式
- [x] joystickVector：死區內回 {0,0}；死區外回正規化單位向量（方向 = cur−origin）
- [x] TouchInput.attach/detach/direction/joystick 運作；只追第一指
- [x] Game 合併：觸控有方向用觸控、否則用鍵盤 → world.moveInput
- [x] Game.stop 時 detach（冪等）

## 搖桿視覺
- [x] PixiRenderer 有螢幕固定 ui 容器（加在 app.stage、非 world）
- [x] drawJoystick：active 畫底座圈(48)+旋鈕(22，夾半徑內)；非 active 清空
- [x] Game 每幀 render 後 drawJoystick(touch.joystick)
- [x] renderer destroy 一併清理 ui 層

## RWD / 視口
- [x] index.html viewport 加 maximum-scale=1, user-scalable=no, viewport-fit=cover
- [x] body/#app：touch-action none、overscroll-behavior none、user-select none、tap-highlight transparent
- [x] MainMenu @media(max-width:600px) 縮小標題/卡片/間距，窄螢幕可用

## 桌機相容 / 確定性
- [x] 桌機鍵盤操作不受影響（觸控無輸入時 direction 回 {0,0} fallback 鍵盤）
- [x] 觸控只改 moveInput，不影響 rng/固定步長確定性
- [x] touchInput.ts 無 Vue/Pinia 執行期 import；store/types 不變

## 驗證快照（完成時填寫）
- [x] 單元測試（Vitest）全數通過（含 joystickVector + 既有 107）
- [x] 型別檢查（vue-tsc）乾淨
- [x] Production build 乾淨
- [x] 行動裝置模擬（chrome-devtools）：搖桿可移動玩家、選單窄螢幕可用、不捲動縮放，無功能相關 console error
- [x] progress.md 已更新
