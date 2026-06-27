/**
 * 確定性雜湊累加器（FNV-1a，順序敏感）。
 * 對一串 number 做 32-bit 無號雜湊；浮點以 float64 的 8 個位元組（little-endian）逐一混入，
 * 確保相同數值序列 → 相同結果（供回放確定性測試與未來連線 desync 偵測）。
 * 純函式、不依賴時間/亂數。
 */
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

export class Checksum {
  private h = FNV_OFFSET >>> 0
  private readonly view = new DataView(new ArrayBuffer(8))

  /** 混入一個浮點數（以 float64 八位元組）。 */
  add(n: number): this {
    this.view.setFloat64(0, n, true) // little-endian，跨平台位元組序一致
    for (let i = 0; i < 8; i++) this.mix(this.view.getUint8(i))
    return this
  }

  /** 混入一個 32-bit 整數（四位元組）。 */
  addInt(n: number): this {
    const v = n | 0
    this.mix(v & 0xff)
    this.mix((v >>> 8) & 0xff)
    this.mix((v >>> 16) & 0xff)
    this.mix((v >>> 24) & 0xff)
    return this
  }

  /** 目前雜湊值（32-bit 無號）。 */
  value(): number {
    return this.h >>> 0
  }

  private mix(byte: number): void {
    this.h ^= byte
    this.h = Math.imul(this.h, FNV_PRIME) >>> 0
  }
}
