/**
 * 空間網格（spatial hash grid）。
 *
 * 用來加速「鄰近查詢」的空間資料結構：把 2D 世界切成邊長為 `cellSize` 的方格，
 * 物件依座標被丟進對應方格。查詢某半徑內的物件時，只需檢視涵蓋該範圍的少數方格，
 * 避免對全部物件做 O(n) 的暴力距離掃描——在敵人數量龐大時可大幅降低碰撞偵測成本。
 *
 * 已接進 {@link World}：每幀重建敵人網格供碰撞鄰近查詢。因每幀大量 insert/query，
 * 內部以巢狀 `Map<cx, Map<cy, T[]>>` 索引方格——避免每次組字串 key 的配置開銷（GC 壓力），
 * 同時原生支援負座標（無限捲動時 cx/cy 可為負）且不會發生 key 碰撞。純 TS、不依賴 Vue/Pinia。
 *
 * @typeParam T 網格中存放的物件型別
 */
export class SpatialGrid<T> {
  /** cx → (cy → 落在該方格內的物件清單)；巢狀數值索引，免字串 key 配置、原生支援負座標。 */
  private cells = new Map<number, Map<number, T[]>>()

  /**
   * @param cellSize 每個方格的邊長；通常設為略大於查詢半徑或物件尺寸，以兼顧方格數與每格物件數
   */
  constructor(private readonly cellSize: number) {}

  /**
   * 將物件插入其世界座標所對應的方格。
   * @param item 要插入的物件
   * @param x 物件的世界 X 座標
   * @param y 物件的世界 Y 座標
   */
  insert(item: T, x: number, y: number): void {
    // 由世界座標換算成方格索引
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    let col = this.cells.get(cx)
    if (!col) {
      col = new Map<number, T[]>()
      this.cells.set(cx, col)
    }
    const bucket = col.get(cy)
    if (bucket) bucket.push(item)
    else col.set(cy, [item]) // 該方格尚無清單時才建立
  }

  /**
   * 查詢以 `(x, y)` 為圓心、`radius` 為半徑的範圍內可能涵蓋的所有物件。
   *
   * 作法是先算出該圓形邊界框（bounding box）跨越的方格索引範圍，再蒐集這些方格內的全部物件。
   * 注意：回傳的是「方格層級的粗略候選集」，可能包含落在邊界框內、但實際距離超過 `radius`
   * 的物件；呼叫方需自行做精確距離過濾。
   *
   * @param x 查詢圓心的世界 X 座標
   * @param y 查詢圓心的世界 Y 座標
   * @param radius 查詢半徑
   * @returns 範圍內所有候選物件（未去重、未做精確距離篩選）
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    // 計算圓形邊界框所涵蓋的方格索引範圍
    const minCx = Math.floor((x - radius) / this.cellSize)
    const maxCx = Math.floor((x + radius) / this.cellSize)
    const minCy = Math.floor((y - radius) / this.cellSize)
    const maxCy = Math.floor((y + radius) / this.cellSize)
    const result: T[] = []
    for (let cx = minCx; cx <= maxCx; cx++) {
      const col = this.cells.get(cx)
      if (!col) continue
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = col.get(cy)
        if (bucket) for (let i = 0; i < bucket.length; i++) result.push(bucket[i])
      }
    }
    return result
  }

  /**
   * 清空整個網格。通常每幀重建網格前呼叫，因為物件位置會持續變動。
   */
  clear(): void {
    this.cells.clear()
  }
}
