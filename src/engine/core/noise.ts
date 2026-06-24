/**
 * 程序噪聲（value noise + fBm）。純函式、確定性（給定 seed 可重現）。
 * 供呈現層生成有機背景紋理用；不進入模擬。
 */

/** 整數格點雜湊 → [0,1)。 */
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1274126177) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 100000) / 100000
}

/** smoothstep 緩和插值。 */
function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * value noise（雙線性 + smoothstep），輸出 0..1。
 * @param period >0 時格點環繞此週期，使紋理無縫平鋪。
 */
export function valueNoise(x: number, y: number, seed: number, period = 0): number {
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const fx = smooth(x - x0), fy = smooth(y - y0)
  const wrap = (v: number): number => (period > 0 ? ((v % period) + period) % period : v)
  const a = hash2(wrap(x0), wrap(y0), seed)
  const b = hash2(wrap(x0 + 1), wrap(y0), seed)
  const c = hash2(wrap(x0), wrap(y0 + 1), seed)
  const d = hash2(wrap(x0 + 1), wrap(y0 + 1), seed)
  const top = a + (b - a) * fx
  const bot = c + (d - c) * fx
  return top + (bot - top) * fy
}

/**
 * 分形布朗運動（多八度疊加），輸出正規化 0..1。
 * @param period >0 時各八度格點環繞（period × 該八度頻率），維持無縫平鋪。
 */
export function fbm(x: number, y: number, seed: number, octaves = 4, period = 0): number {
  let sum = 0, amp = 1, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i, period > 0 ? period * freq : 0)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

/**
 * 脊狀 fBm（ridged）：每八度取 1-|2n-1| 形成脊線，疊出折痕/皺褶質感。輸出 0..1。
 * 適合胃黏膜皺褶這類「有方向折痕」的結構。
 */
export function ridgedFbm(x: number, y: number, seed: number, octaves = 4, period = 0): number {
  let sum = 0, amp = 1, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise(x * freq, y * freq, seed + i, period > 0 ? period * freq : 0)
    sum += amp * (1 - Math.abs(2 * n - 1))
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}

/**
 * 細胞噪聲（Voronoi F1）：到最近特徵點的距離，形成蜂窩/泡狀結構。輸出 0..1（近 0、遠接近 1）。
 * 適合肺泡囊這類「細胞分格」的結構。
 * @param period >0 時格點環繞此週期，使紋理無縫平鋪。
 */
export function cellular(x: number, y: number, seed: number, period = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y)
  const wrap = (v: number): number => (period > 0 ? ((v % period) + period) % period : v)
  let best = 1e9
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox, cy = yi + oy
      // 特徵點位置 = 格原點(連續) + 雜湊偏移(以環繞索引取，維持平鋪)
      const fx = cx + hash2(wrap(cx), wrap(cy), seed)
      const fy = cy + hash2(wrap(cx), wrap(cy), seed + 7)
      const dx = x - fx, dy = y - fy
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < best) best = d
    }
  }
  return Math.min(1, best)
}
