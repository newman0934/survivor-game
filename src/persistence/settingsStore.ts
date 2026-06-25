/**
 * 設定存檔模組（純邏輯）。
 * 與 saveStore 分離（不同生命週期）；以注入式 StorageLike 解耦、可單元測試。
 * 韌性：讀取異常回預設、寫入異常靜默略過——絕不影響遊玩。
 */
import type { StorageLike } from './saveStore'

const SETTINGS_KEY = 'survivor-settings-v1'

/** 使用者設定。 */
export interface Settings {
  /** 泛光（bloom）是否開啟。 */
  bloom: boolean
}

/** 預設設定（兩平台 bloom 預設開）。 */
function defaults(): Settings {
  return { bloom: true }
}

function defaultStorage(): StorageLike | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
}

/** 讀取設定；無資料/壞 JSON/型別不符一律回預設，永不丟例外。 */
export function loadSettings(storage: StorageLike | null = defaultStorage()): Settings {
  if (!storage) return defaults()
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Partial<Settings>
    if (!parsed || typeof parsed.bloom !== 'boolean') return defaults()
    return { bloom: parsed.bloom }
  } catch {
    return defaults()
  }
}

/** 寫入設定；無 storage 或寫入失敗靜默略過。 */
export function saveSettings(settings: Settings, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* 寫入失敗靜默略過 */
  }
}
