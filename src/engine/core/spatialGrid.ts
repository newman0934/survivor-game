export class SpatialGrid<T> {
  private cells = new Map<string, T[]>()
  constructor(private readonly cellSize: number) {}

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`
  }

  insert(item: T, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const k = this.key(cx, cy)
    const bucket = this.cells.get(k)
    if (bucket) bucket.push(item)
    else this.cells.set(k, [item])
  }

  queryRadius(x: number, y: number, radius: number): T[] {
    const minCx = Math.floor((x - radius) / this.cellSize)
    const maxCx = Math.floor((x + radius) / this.cellSize)
    const minCy = Math.floor((y - radius) / this.cellSize)
    const maxCy = Math.floor((y + radius) / this.cellSize)
    const result: T[] = []
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.cells.get(this.key(cx, cy))
        if (bucket) result.push(...bucket)
      }
    }
    return result
  }

  clear(): void {
    this.cells.clear()
  }
}
