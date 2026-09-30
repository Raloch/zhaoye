import { add, lerp, P, type Pt, perp, sub, unit } from './math'

/**
 * 剪影分两遍画：遮罩遍（全部涂成边缘光颜色）和着色遍（真正的颜色）。
 * 合成时遮罩朝光源方向偏移一点点先画，着色遍盖上去，露出来的一圈就是轮廓光。
 * 所以每个部件都通过 Paint 取色，而不是直接写 fillStyle。
 */
export type Paint = {
  mask: boolean
  fill(c: CanvasRenderingContext2D, role: string): void
  stroke(c: CanvasRenderingContext2D, role: string, width: number): void
  color(role: string): string
  glow(c: CanvasRenderingContext2D, role: string, blur: number): void
}

export type Palette = Record<string, string>

function scaleOf(c: CanvasRenderingContext2D): number {
  const m = c.getTransform()
  return Math.hypot(m.a, m.b)
}

export function colorPaint(colors: Palette): Paint {
  return {
    mask: false,
    fill(c, role) {
      c.fillStyle = colors[role] ?? role
    },
    stroke(c, role, width) {
      c.strokeStyle = colors[role] ?? role
      c.lineWidth = width
    },
    color: (role) => colors[role] ?? role,
    glow(c, role, blur) {
      c.shadowColor = colors[role] ?? role
      c.shadowBlur = blur * scaleOf(c)
    },
  }
}

export function maskPaint(rim: string): Paint {
  return {
    mask: true,
    fill(c) {
      c.fillStyle = rim
    },
    stroke(c, _role, width) {
      c.strokeStyle = rim
      c.lineWidth = width
    },
    color: () => rim,
    glow() {},
  }
}

/** 单色：残影、受击闪白用。 */
export function flatPaint(color: string): Paint {
  return {
    mask: true,
    fill(c) {
      c.fillStyle = color
    },
    stroke(c, _r, width) {
      c.strokeStyle = color
      c.lineWidth = width
    },
    color: () => color,
    glow() {},
  }
}

export function circle(c: CanvasRenderingContext2D, p: Pt, r: number): void {
  c.beginPath()
  c.arc(p.x, p.y, Math.max(r, 0.01), 0, Math.PI * 2)
  c.fill()
}

export function ellipse(
  c: CanvasRenderingContext2D,
  p: Pt,
  rx: number,
  ry: number,
  rotDeg = 0,
): void {
  c.beginPath()
  c.ellipse(
    p.x,
    p.y,
    Math.max(rx, 0.01),
    Math.max(ry, 0.01),
    (rotDeg * Math.PI) / 180,
    0,
    Math.PI * 2,
  )
  c.fill()
}

/** 两端半径不同的胶囊：四肢、躯干用它。 */
export function capsule(c: CanvasRenderingContext2D, a: Pt, b: Pt, r1: number, r2 = r1): void {
  const n = perp(unit(sub(b, a)))
  c.beginPath()
  c.moveTo(a.x + n.x * r1, a.y + n.y * r1)
  c.lineTo(b.x + n.x * r2, b.y + n.y * r2)
  c.lineTo(b.x - n.x * r2, b.y - n.y * r2)
  c.lineTo(a.x - n.x * r1, a.y - n.y * r1)
  c.closePath()
  c.fill()
  circle(c, a, r1)
  circle(c, b, r2)
}

export function poly(c: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  const first = pts[0]
  if (!first) return
  c.beginPath()
  c.moveTo(first.x, first.y)
  for (const p of pts.slice(1)) c.lineTo(p.x, p.y)
  c.closePath()
  c.fill()
}

/** 过控制点的平滑闭合曲线。 */
export function blob(c: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  const n = pts.length
  const last = pts[n - 1]
  const first = pts[0]
  if (!last || !first) return
  c.beginPath()
  c.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2)
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % n]
    if (!p || !q) continue
    c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  c.closePath()
  c.fill()
}

/** 沿折线画一条宽度渐变的带子（发带、马尾、披风）。 */
export function strip(c: CanvasRenderingContext2D, pts: readonly Pt[], w0: number, w1 = 0.2): void {
  const n = pts.length
  if (n < 2) return
  const L: Pt[] = []
  const R: Pt[] = []
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)] ?? P(0, 0)
    const next = pts[Math.min(n - 1, i + 1)] ?? P(0, 0)
    const cur = pts[i] ?? P(0, 0)
    const nrm = perp(unit(sub(next, prev)))
    const w = lerp(w0, w1, i / (n - 1))
    L.push(add(cur, nrm, w))
    R.push(add(cur, nrm, -w))
  }
  c.beginPath()
  const l0 = L[0] ?? P(0, 0)
  c.moveTo(l0.x, l0.y)
  for (let i = 1; i < n - 1; i++) {
    const a = L[i] ?? l0
    const b = L[i + 1] ?? a
    c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
  }
  const le = L[n - 1] ?? l0
  const re = R[n - 1] ?? l0
  c.lineTo(le.x, le.y)
  c.lineTo(re.x, re.y)
  for (let i = n - 2; i > 0; i--) {
    const a = R[i] ?? re
    const b = R[i - 1] ?? a
    c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
  }
  const r0 = R[0] ?? l0
  c.lineTo(r0.x, r0.y)
  c.closePath()
  c.fill()
}

export function glowDot(
  c: CanvasRenderingContext2D,
  p: Pt,
  r: number,
  role: string,
  blur: number,
  paint: Paint,
): void {
  if (paint.mask) return
  c.save()
  paint.glow(c, role, blur)
  c.fillStyle = paint.color(role)
  circle(c, p, r)
  c.restore()
}
