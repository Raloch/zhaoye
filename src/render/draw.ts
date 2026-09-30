/** 绘制小工具。角度统一用「肢体约定」：0° 朝下，90° 朝前（面朝方向），180° 朝上。 */

export type Pt = { x: number; y: number }

const RAD = Math.PI / 180

export const ldir = (deg: number): Pt => ({ x: Math.sin(deg * RAD), y: Math.cos(deg * RAD) })
export const udir = (deg: number): Pt => ({ x: Math.sin(deg * RAD), y: -Math.cos(deg * RAD) })
export const add = (p: Pt, d: Pt, k = 1): Pt => ({ x: p.x + d.x * k, y: p.y + d.y * k })
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** 两端半径不同的胶囊。 */
export function capsule(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, r1: number, r2 = r1): void {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l = Math.hypot(dx, dy) || 1e-6
  const nx = -dy / l
  const ny = dx / l
  ctx.beginPath()
  ctx.moveTo(a.x + nx * r1, a.y + ny * r1)
  ctx.lineTo(b.x + nx * r2, b.y + ny * r2)
  ctx.lineTo(b.x - nx * r2, b.y - ny * r2)
  ctx.lineTo(a.x - nx * r1, a.y - ny * r1)
  ctx.closePath()
  ctx.fill()
  circle(ctx, a, r1)
  circle(ctx, b, r2)
}

export function circle(ctx: CanvasRenderingContext2D, p: Pt, r: number): void {
  ctx.beginPath()
  ctx.arc(p.x, p.y, Math.max(0.01, r), 0, Math.PI * 2)
  ctx.fill()
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  rx: number,
  ry: number,
  rot = 0,
): void {
  ctx.beginPath()
  ctx.ellipse(p.x, p.y, Math.max(0.01, rx), Math.max(0.01, ry), rot * RAD, 0, Math.PI * 2)
  ctx.fill()
}

export function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  const first = pts[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.closePath()
  ctx.fill()
}

/**
 * 两骨 IK：给定髋、目标脚位和大小腿长，求膝盖位置。膝盖朝 +x（面朝方向）弯。
 */
export function ik(hip: Pt, foot: Pt, a: number, b: number, bend: 1 | -1 = 1): Pt {
  const dx = foot.x - hip.x
  const dy = foot.y - hip.y
  const d = Math.min(Math.hypot(dx, dy), a + b - 0.01)
  const base = Math.atan2(dy, dx)
  const cos = (a * a + d * d - b * b) / (2 * a * d)
  const ang = Math.acos(Math.max(-1, Math.min(1, cos)))
  const k = base - bend * ang
  return { x: hip.x + Math.cos(k) * a, y: hip.y + Math.sin(k) * a }
}

/** 月牙形剑光：以 c 为圆心，从 a0 扫到 a1。尾细头粗。 */
export function slash(
  ctx: CanvasRenderingContext2D,
  c: Pt,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0 || Math.abs(a1 - a0) < 4) return
  const N = 24
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = lerp(a0, a1, t)
    const d = ldir(a)
    outer.push(add(c, d, r1))
    inner.push(add(c, d, lerp(r1 - 0.5, r0, t ** 1.5)))
  }
  const o0 = outer[0]
  const oN = outer[N]
  if (!o0 || !oN) return
  ctx.save()
  const g = ctx.createLinearGradient(o0.x, o0.y, oN.x, oN.y)
  g.addColorStop(0, withAlpha(color, 0))
  g.addColorStop(0.6, withAlpha(color, alpha * 0.5))
  g.addColorStop(1, withAlpha(color, alpha))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(o0.x, o0.y)
  for (const p of outer) ctx.lineTo(p.x, p.y)
  for (let i = N; i >= 0; i--) {
    const p = inner[i]
    if (p) ctx.lineTo(p.x, p.y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function withAlpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}

/** 设发光。shadowBlur 是设备像素，不受 transform 影响，要按当前缩放换算。 */
export function glow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  const m = ctx.getTransform()
  ctx.shadowColor = color
  ctx.shadowBlur = blur * Math.hypot(m.a, m.b)
}

export function noGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
}
