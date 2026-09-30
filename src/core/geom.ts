export type Facing = 1 | -1

/** 相对角色脚底中心、面朝右时的矩形。y 向下为正，所以身体在负 y 一侧。 */
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** 世界坐标的矩形。 */
export type Rect = { x: number; y: number; w: number; h: number }

export const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h })

/** 把相对框按朝向翻转后放到 (ox, oy)。 */
export function toWorld(b: Box, ox: number, oy: number, facing: Facing): Rect {
  const x = facing === 1 ? ox + b.x : ox - b.x - b.w
  return { x, y: oy + b.y, w: b.w, h: b.h }
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** 两个矩形重叠部分的中心，用来放命中特效。 */
export function overlapCenter(a: Rect, b: Rect): { x: number; y: number } {
  const x0 = Math.max(a.x, b.x)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y0 = Math.max(a.y, b.y)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** 把 v 朝 target 推进最多 step。 */
export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(v + step, target)
  if (v > target) return Math.max(v - step, target)
  return v
}

export const sign = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0)
