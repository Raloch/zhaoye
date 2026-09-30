// 通用工具：种子随机数、一维噪声、角度与颜色

export const TAU = Math.PI * 2
export const rad = (d) => (d * Math.PI) / 180
export const lerp = (a, b, t) => a + (b - a) * t
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** 与 adder 相同的 mulberry32：同一个种子，永远得到同一串随机数。 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 一维值噪声，平滑插值。返回 0..1。 */
export function makeNoise1D(seed) {
  const r = mulberry32(seed)
  const N = 512
  const v = Array.from({ length: N }, r)
  return (x) => {
    const i = Math.floor(x)
    const f = x - i
    const a = v[((i % N) + N) % N]
    const b = v[(((i + 1) % N) + N) % N]
    const u = f * f * (3 - 2 * f)
    return a + (b - a) * u
  }
}

export function fbm(noise, x, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq + i * 17.3)
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / norm
}

/** 肢体角度约定：0° 朝正下，90° 朝面朝方向，180° 朝正上，-90° 朝背后。 */
export const ldir = (a) => ({ x: Math.sin(rad(a)), y: Math.cos(rad(a)) })
/** 躯干角度约定：0° 朝正上，正值向前倾。 */
export const udir = (a) => ({ x: Math.sin(rad(a)), y: -Math.cos(rad(a)) })

export const add = (p, d, s = 1) => ({ x: p.x + d.x * s, y: p.y + d.y * s })
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y })
export const len = (v) => Math.hypot(v.x, v.y)
export const unit = (v) => {
  const l = len(v) || 1e-6
  return { x: v.x / l, y: v.y / l }
}
export const perp = (v) => ({ x: -v.y, y: v.x })
export const dot = (a, b) => a.x * b.x + a.y * b.y
export const mid = (a, b, t = 0.5) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })
export const P = (x, y) => ({ x, y })

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = Number.parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  )
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(c1, c2, t) {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  const m = a.map((v, i) => Math.round(lerp(v, b[i], t)))
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}
