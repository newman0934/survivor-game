/**
 * 進度存檔模組（純邏輯）。
 *
 * 集中所有 localStorage 讀寫與序列化／合併邏輯；以注入式 `StorageLike` 解耦，
 * 既可用於正式（window.localStorage）也可在單元測試注入記憶體假物件。
 * 不碰引擎、不依賴 Vue/Pinia；無 Math.random()、不讀內部時鐘（date 由呼叫端提供）。
 *
 * 韌性原則：讀取任何異常回空白存檔、寫入任何異常靜默略過——絕不讓存檔問題影響遊玩。
 */
import type { CharacterKind, MapKind } from '../engine/types'

/** localStorage key（版號內嵌，方便日後遷移）。 */
const SAVE_KEY = 'survivor-save-v1'
/** runs 最多保留筆數（依存活時間取前 N）。 */
const MAX_RUNS = 10

/** 注入式儲存介面；正式為 window.localStorage，測試為記憶體假物件。 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 單場戰績紀錄。 */
export interface RunRecord {
  /** 存活秒數（整數）。 */
  time: number
  kills: number
  level: number
  character: CharacterKind
  map: MapKind
  /** Date.now() 毫秒時間戳（由呼叫端提供，保持本模組無時間相依）。 */
  date: number
}

/** 跨場累積統計。 */
export interface CumulativeStats {
  /** 跨場累加總擊殺（含被擠出前 10 的場次）。 */
  totalKills: number
  totalRuns: number
  bestTime: number
  bestKills: number
  maxLevel: number
}

/** 完整存檔結構。 */
export interface SaveData {
  version: 1
  /** 依 time 降冪、最多 MAX_RUNS 筆。 */
  runs: RunRecord[]
  stats: CumulativeStats
}

/** 全新空白存檔。 */
function emptySave(): SaveData {
  return {
    version: 1,
    runs: [],
    stats: { totalKills: 0, totalRuns: 0, bestTime: 0, bestKills: 0, maxLevel: 0 },
  }
}

/** 預設儲存來源；無 window（非瀏覽器環境）時回 null 觸發空白存檔。 */
function defaultStorage(): StorageLike | null {
  return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
}

/**
 * 讀取存檔。無資料／壞 JSON／版號不符／結構缺漏一律回空白存檔，永不丟例外。
 * @param storage 注入式儲存；省略時用 window.localStorage。
 */
export function loadSave(storage: StorageLike | null = defaultStorage()): SaveData {
  if (!storage) return emptySave()
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return emptySave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs) || !parsed.stats) {
      return emptySave()
    }
    const base = emptySave()
    return {
      version: 1,
      // 過濾掉竄改造成的壞元素（如 null）——讓「結構缺漏回空白/略過」延伸到陣列元素層級，
      // 避免後續 recordRun 的 sort 對 null 取 .time 而拋例外。
      runs: (parsed.runs as unknown[]).filter(
        (r): r is RunRecord => !!r && typeof (r as RunRecord).time === 'number',
      ),
      stats: { ...base.stats, ...parsed.stats },
    }
  } catch {
    return emptySave()
  }
}

/**
 * 記錄一場戰績：先以舊 stats 判定破紀錄旗標，再併入 runs（降冪截前 N）、更新 stats、寫回。
 * 寫入失敗（無痕/配額滿）靜默略過，但回傳的記憶體內 save 仍正確。
 * @param run     本場戰績。
 * @param storage 注入式儲存；省略時用 window.localStorage。
 */
export function recordRun(
  run: RunRecord,
  storage: StorageLike | null = defaultStorage(),
): { save: SaveData; isNewBestTime: boolean; isNewBestKills: boolean } {
  const save = loadSave(storage)
  const isNewBestTime = run.time > save.stats.bestTime
  const isNewBestKills = run.kills > save.stats.bestKills

  save.runs.push(run)
  save.runs.sort((a, b) => b.time - a.time)
  if (save.runs.length > MAX_RUNS) save.runs.length = MAX_RUNS

  save.stats = {
    totalKills: save.stats.totalKills + run.kills,
    totalRuns: save.stats.totalRuns + 1,
    bestTime: Math.max(save.stats.bestTime, run.time),
    bestKills: Math.max(save.stats.bestKills, run.kills),
    maxLevel: Math.max(save.stats.maxLevel, run.level),
  }

  if (storage) {
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(save))
    } catch {
      // 寫入失敗靜默略過——不影響遊玩，本次 save 仍在記憶體供結算畫面使用。
    }
  }
  return { save, isNewBestTime, isNewBestKills }
}
