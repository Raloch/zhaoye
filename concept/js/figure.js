// 剪影合成与基础形状。
//
// 每个角色画两遍：
//   1. 遮罩遍：所有形状都用边缘光颜色填充；
//   2. 着色遍：真正的颜色（近侧 / 远侧 / 点缀 / 发光）。
// 合成时先把遮罩朝光源方向偏移一点点画出来，再把着色遍盖上去，
// 露出来的那一圈就是边缘光。这样任何剪影都能自动获得一道轮廓光。

import { add, ldir, lerp, perp, rad, sub, TAU, unit } from './util.js'

const offscreen = []

function getOff(i, w, h) {
  let cv = offscreen[i]
  if (!cv) {
    cv = document.createElement('canvas')
    offscreen[i] = cv
  }
  if (cv.width !== w || cv.height !== h) {
    cv.width = w
    cv.height = h
  }
  const c = cv.getContext('2d')
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, w, h)
  return cv
}

export const BODY = {
  near: '#101217',
  far: '#2a2e38',
  iron: '#3a3f48',
  blade: '#eefcff',
  bladeGlow: '#7fe8ff',
}

function scaleOf(c) {
  const m = c.getTransform()
  return Math.hypot(m.a, m.b)
}

function colorPaint(colors) {
  return {
    mask: false,
    fill(c, role) {
      c.fillStyle = colors[role] ?? role
    },
    stroke(c, role, width) {
      c.strokeStyle = colors[role] ?? role
      c.lineWidth = width
    },
    color(role) {
      return colors[role] ?? role
    },
    glow(c, role, blur) {
      c.shadowColor = colors[role] ?? role
      c.shadowBlur = blur * scaleOf(c)
    },
    noGlow(c) {
      c.shadowBlur = 0
      c.shadowColor = 'transparent'
    },
  }
}

function maskPaint(rim) {
  return {
    mask: true,
    fill(c) {
      c.fillStyle = rim
    },
    stroke(c, _role, width) {
      c.strokeStyle = rim
      c.lineWidth = width
    },
    color() {
      return rim
    },
    glow() {},
    noGlow() {},
  }
}

/**
 * 在 ctx 上画一个角色。
 * fn(c, paint) 在角色本地坐标系里绘制：原点在脚下，朝右，y 向下。
 */
export function drawFigure(ctx, fn, o) {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const m = ctx.getTransform()
  const scale = o.scale ?? 1
  const facing = o.facing ?? 1
  const colors = { ...BODY, ...(o.colors ?? {}) }
  const rim = o.rim ?? null

  const A = rim ? getOff(0, W, H) : null
  const B = getOff(1, W, H)
  const passes = rim ? [[A, maskPaint(rim)], [B, colorPaint(colors)]] : [[B, colorPaint(colors)]]
  for (const [cv, paint] of passes) {
    const c = cv.getContext('2d')
    c.setTransform(m)
    c.translate(o.x, o.y)
    if (o.rotate) c.rotate(rad(o.rotate))
    c.scale(facing * scale, scale)
    c.lineCap = 'round'
    c.lineJoin = 'round'
    fn(c, paint)
  }

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const alpha = o.alpha ?? 1
  if (rim) {
    const d = (o.rimWidth ?? 0.9) * Math.hypot(m.a, m.b) * scale
    const [lx, ly] = o.light ?? [-0.7, -0.7]
    ctx.globalAlpha = alpha * (o.rimAlpha ?? 0.9)
    ctx.drawImage(A, lx * d, ly * d)
  }
  ctx.globalAlpha = alpha
  if (o.shadowGlow) {
    ctx.shadowColor = o.shadowGlow
    ctx.shadowBlur = (o.shadowBlur ?? 8) * Math.hypot(m.a, m.b)
  }
  ctx.drawImage(B, 0, 0)
  ctx.restore()
}

// ───────────────────────── 基础形状（本地坐标） ─────────────────────────

export function circle(c, p, r) {
  c.beginPath()
  c.arc(p.x, p.y, Math.max(r, 0.01), 0, TAU)
  c.fill()
}

export function ellipse(c, p, rx, ry, rot = 0) {
  c.beginPath()
  c.ellipse(p.x, p.y, Math.max(rx, 0.01), Math.max(ry, 0.01), rad(rot), 0, TAU)
  c.fill()
}

/** 两端半径不同的胶囊：四肢、躯干用它。 */
export function capsule(c, a, b, r1, r2 = r1) {
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

export function poly(c, pts) {
  c.beginPath()
  c.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y)
  c.closePath()
  c.fill()
}

/** 过控制点的平滑闭合曲线（中点二次贝塞尔）。 */
export function blob(c, pts) {
  const n = pts.length
  c.beginPath()
  const m0 = { x: (pts[n - 1].x + pts[0].x) / 2, y: (pts[n - 1].y + pts[0].y) / 2 }
  c.moveTo(m0.x, m0.y)
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % n]
    c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  c.closePath()
  c.fill()
}

/** 平滑开放折线的描边。 */
export function curve(c, pts) {
  c.beginPath()
  c.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]
    const q = pts[i + 1]
    c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  const last = pts[pts.length - 1]
  c.lineTo(last.x, last.y)
  c.stroke()
}

/**
 * 软链：发带、马尾、衣摆、披风、胡须。
 * 角度从 a0 渐变到 a1（肢体角度约定），叠加正弦摆动。
 */
export function chain(start, length, segs, a0, a1, wave = 0, phase = 0) {
  // 走最短的角度路径，避免 350° → 10° 转一整圈
  while (a1 - a0 > 180) a1 -= 360
  while (a1 - a0 < -180) a1 += 360
  const pts = [start]
  let p = start
  for (let i = 1; i <= segs; i++) {
    const t = i / segs
    const a = lerp(a0, a1, t) + wave * Math.sin(t * 5.2 + phase) * t
    p = add(p, ldir(a), length / segs)
    pts.push(p)
  }
  return pts
}

/** 沿折线画一条宽度渐变的带子。 */
export function strip(c, pts, w0, w1 = 0.2) {
  const n = pts.length
  const L = []
  const R = []
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)]
    const next = pts[Math.min(n - 1, i + 1)]
    const nrm = perp(unit(sub(next, prev)))
    const w = lerp(w0, w1, i / (n - 1))
    L.push(add(pts[i], nrm, w))
    R.push(add(pts[i], nrm, -w))
  }
  c.beginPath()
  c.moveTo(L[0].x, L[0].y)
  for (let i = 1; i < n - 1; i++) {
    c.quadraticCurveTo(L[i].x, L[i].y, (L[i].x + L[i + 1].x) / 2, (L[i].y + L[i + 1].y) / 2)
  }
  c.lineTo(L[n - 1].x, L[n - 1].y)
  c.lineTo(R[n - 1].x, R[n - 1].y)
  for (let i = n - 2; i > 0; i--) {
    c.quadraticCurveTo(R[i].x, R[i].y, (R[i].x + R[i - 1].x) / 2, (R[i].y + R[i - 1].y) / 2)
  }
  c.lineTo(R[0].x, R[0].y)
  c.closePath()
  c.fill()
}

/** 发光的小点：眼睛、磷火、核心。 */
export function glowDot(c, p, r, color, blur, paint) {
  if (paint.mask) return
  c.save()
  paint.glow(c, color, blur)
  c.fillStyle = paint.color(color)
  circle(c, p, r)
  c.restore()
}

/**
 * 剑光：以 center 为圆心，从角度 aStart 扫到 aEnd 的月牙。
 * 角度用肢体约定。尾部细、头部粗。
 */
export function slashArc(c, center, r0, r1, aStart, aEnd, color, alpha = 0.8) {
  const N = 28
  const outer = []
  const inner = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = lerp(aStart, aEnd, t)
    const d = ldir(a)
    const thick = t ** 1.6
    outer.push(add(center, d, r1))
    inner.push(add(center, d, lerp(r1 - 0.4, r0, thick)))
  }
  c.save()
  const g = c.createLinearGradient(outer[0].x, outer[0].y, outer[N].x, outer[N].y)
  g.addColorStop(0, rgbaSafe(color, 0))
  g.addColorStop(0.6, rgbaSafe(color, alpha * 0.55))
  g.addColorStop(1, rgbaSafe(color, alpha))
  c.fillStyle = g
  c.beginPath()
  c.moveTo(outer[0].x, outer[0].y)
  for (const p of outer) c.lineTo(p.x, p.y)
  for (let i = N; i >= 0; i--) c.lineTo(inner[i].x, inner[i].y)
  c.closePath()
  c.fill()
  c.strokeStyle = rgbaSafe('#ffffff', alpha * 0.9)
  c.lineWidth = 0.35
  c.beginPath()
  for (let i = Math.floor(N * 0.35); i <= N; i++) c.lineTo(outer[i].x, outer[i].y)
  c.stroke()
  c.restore()
}

function rgbaSafe(hex, a) {
  const h = hex.replace('#', '')
  const n = Number.parseInt(h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** 墨溅：命中特效。在 ctx（非角色本地）坐标里画。 */
export function inkSplash(ctx, x, y, r, rng, color = '#101217', count = 14) {
  ctx.save()
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU
    const d = r * (0.3 + rng() * 0.9)
    const s = r * (0.04 + rng() * 0.1)
    const px = x + Math.cos(a) * d
    const py = y + Math.sin(a) * d
    ctx.beginPath()
    ctx.ellipse(px, py, s * 2.2, s, a, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/** 冲击环：一圈断续的亮线。 */
export function impactRing(ctx, x, y, r, color, width = 0.8, rng = Math.random) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  const n = 12
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + rng() * 0.2
    const a1 = a0 + (TAU / n) * (0.35 + rng() * 0.3)
    ctx.beginPath()
    ctx.arc(x, y, r * (0.9 + rng() * 0.2), a0, a1)
    ctx.stroke()
  }
  for (let i = 0; i < 7; i++) {
    const a = rng() * TAU
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5)
    ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5)
    ctx.stroke()
  }
  ctx.restore()
}
