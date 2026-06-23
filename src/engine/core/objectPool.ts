/**
 * 泛型物件池（object pool）。
 *
 * 為「高物件數」情境預備的記憶體最佳化工具：與其在每幀大量 new／丟棄物件（會頻繁觸發
 * GC、造成卡頓），改為回收用過的物件重複利用。典型用途是子彈、經驗寶石等生命週期短、
 * 數量龐大的 entity。
 *
 * 註：目前（階段 0/1）尚未接進 {@link World}，是為階段 2 高物件數預留。純 TS、不依賴 Vue/Pinia。
 */

/**
 * 以工廠函式建立的物件池。
 *
 * @typeParam T 池中管理的物件型別
 */
export class ObjectPool<T> {
  /** 目前閒置、可被重新取用的物件堆疊。 */
  private free: T[] = []

  /**
   * @param factory 池內無可用物件時，用來產生新物件的工廠函式
   */
  constructor(private readonly factory: () => T) {}

  /**
   * 取得一個物件：優先回收閒置物件，沒有時才呼叫工廠新建。
   * @returns 一個可用的物件實例
   */
  acquire(): T {
    return this.free.pop() ?? this.factory()
  }

  /**
   * 歸還物件回池中以供後續重複使用。
   * @param obj 不再使用、要回收的物件（呼叫方應自行確保其欄位已重置）
   */
  release(obj: T): void {
    this.free.push(obj)
  }
}
