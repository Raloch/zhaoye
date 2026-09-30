/**
 * 骨骼用的小数学。角度两套约定（与 concept/ 一致）：
 * - 肢体：0° 朝正下，90° 朝面朝方向，180° 朝正上，-90° 朝背后。
 * - 躯干：0° 朝正上，正值向前倾。
 */

export type Pt = { x: number; y: number }

const RAD = Math.PI / 180
export const rad = (d: number): number => d * RAD
export const P = (x: number, y: number): Pt => ({ x, y })
export const ldir = (a: number): Pt => ({ x: Math.sin(a * RAD), y: Math.cos(a * RAD) })
export const udir = (a: number): Pt => ({ x: Math.sin(a * RAD), y: -Math.cos(a * RAD) })
export const add = (p: Pt, d: Pt, k = 1): Pt => ({ x: p.x + d.x * k, y: p.y + d.y * k })
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
export const len = (v: Pt): number => Math.hypot(v.x, v.y)
export const unit = (v: Pt): Pt => {
  const l = len(v) || 1e-6
  return { x: v.x / l, y: v.y / l }
}
export const perp = (v: Pt): Pt => ({ x: -v.y, y: v.x })
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const mid = (a: Pt, b: Pt, t = 0.5): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) })

/** 走最短路径的角度插值。 */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a
  while (d > 180) d -= 360
  while (d < -180) d += 360
  return a + d * t
}

export const ease = {
  linear: (t: number) => t,
  in: (t: number) => t * t,
  out: (t: number) => 1 - (1 - t) ** 2,
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  /** 出招：几乎瞬间到位，最后一点点缓一下。 */
  snap: (t: number) => 1 - (1 - t) ** 4,
  /** 带一点过冲，收招时用。 */
  back: (t: number) => {
    const c = 1.4
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
  },
} as const

export type EaseName = keyof typeof ease
