# Acceptance — 手機支援（觸控 + RWD）

本檔為本功能完成與否的**唯一驗收來源**。所有項目通過才得標記為完成。

## 觸控輸入
- [ ] 新增 core/touchInput.ts：TouchInput（Pointer Events）+ joystickVector 純函式
- [ ] joystickVector：死區內回 {0,0}；死區外回正規化單位向量（方向 = cur−origin）
- [ ] TouchInput.attach/detach/direction/joystick 運作；只追第一指
- [ ] Game 合併：觸控有方向用觸控、否則用鍵盤 → world.moveInput
- [ ] Game.stop 時 detach（冪等）

## 搖桿視覺
- [ ] PixiRenderer 有螢幕固定 ui 容器（加在 app.stage、非 world）
- [ ] drawJoystick：active 畫底座圈(48)+旋鈕(22，夾半徑內)；非 active 清空
- [ ] Game 每幀 render 後 drawJoystick(touch.joystick)
- [ ] renderer destroy 一併清理 ui 層

## RWD / 視口
- [ ] index.html viewport 加 maximum-scale=1, user-scalable=no, viewport-fit=cover
- [ ] body/#app：touch-action none、overscroll-behavior none、user-select none、tap-highlight transparent
- [ ] MainMenu @media(max-width:600px) 縮小標題/卡片/間距，窄螢幕可用

## 桌機相容 / 確定性
- [ ] 桌機鍵盤操作不受影響（觸控無輸入時 direction 回 {0,0} fallback 鍵盤）
- [ ] 觸控只改 moveInput，不影響 rng/固定步長確定性
- [ ] touchInput.ts 無 Vue/Pinia 執行期 import；store/types 不變

## 驗證快照（完成時填寫）
- [ ] 單元測試（Vitest）全數通過（含 joystickVector + 既有 107）
- [ ] 型別檢查（vue-tsc）乾淨
- [ ] Production build 乾淨
- [ ] 行動裝置模擬（chrome-devtools）：搖桿可移動玩家、選單窄螢幕可用、不捲動縮放，無功能相關 console error
- [ ] progress.md 已更新
