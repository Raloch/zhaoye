// 非人形：灰狼、鬼火、藤精、蛊蛾、沼蛙、小蝠、枯藤姥姥、蜃龙。
// 本地坐标：原点在脚下地面（飞行单位原点在身体中心），朝右，y 向下。

import { blob, capsule, chain, circle, curve, ellipse, glowDot, poly, strip } from './figure.js'
import { add, ldir, lerp, mulberry32, P, perp, sub, unit } from './util.js'

// ───────────────────────── 灰狼妖 ─────────────────────────

const WOLF = {
  stand: {
    dy: 0,
    head: [0, 0],
    fl: [P(7, -13), P(8.6, -6.5), P(8.2, -2), P(10.6, -0.6)],
    hl: [P(-9, -13), P(-6, -7.5), P(-10, -3.4), P(-8, -0.6)],
    tail: [-78, -22],
  },
  stalk: {
    dy: 3.6,
    head: [2, 5.5],
    fl: [P(7, -9.6), P(11.4, -5.2), P(10.6, -1.6), P(13.4, -0.6)],
    hl: [P(-9, -10), P(-4, -5.2), P(-9.6, -2.6), P(-7, -0.6)],
    tail: [-96, -62],
  },
  lunge: {
    dy: 0,
    head: [2, 1],
    fl: [P(7, -13), P(12.5, -12), P(17.5, -11.5), P(20.5, -10.4)],
    hl: [P(-9, -13), P(-14, -10.5), P(-19.5, -9), P(-22.5, -8.4)],
    tail: [-100, -92],
  },
}

export function wolf(kind = 'stand') {
  const w = WOLF[kind]
  return (c, p) => {
    const dy = w.dy
    const [hx, hy] = w.head
    const leg = (pts, role, radii, dx) => {
      const q = pts.map((v) => P(v.x + dx, v.y + (v.y < -8 ? dy * 0.4 : 0)))
      p.fill(c, role)
      for (let i = 0; i < q.length - 1; i++) capsule(c, q[i], q[i + 1], radii[i], radii[i + 1])
      ellipse(c, q[q.length - 1], radii[3] * 1.5, radii[3] * 0.9)
    }
    const FR = [2.3, 1.6, 1.25, 1.15]
    const HR = [3.4, 2.0, 1.35, 1.15]
    leg(w.fl, 'far', FR, -2.4)
    leg(w.hl, 'far', HR, 2.6)
    p.fill(c, 'near')
    strip(c, chain(P(-12.5, -15 + dy), 12, 6, w.tail[0], w.tail[1], 10, 0.4), 2.8, 0.7)
    blob(c, [P(-13.5, -14 + dy), P(-9.5, -18.5 + dy), P(-2, -17.4 + dy), P(5.5, -19.8 + dy), P(11, -18.4 + dy), P(12.4, -13 + dy), P(8.4, -9.2 + dy * 0.7), P(0, -10.6 + dy * 0.8), P(-8, -10 + dy * 0.8), P(-13.4, -11.2 + dy)])
    for (let i = 0; i < 6; i++) {
      const bx = -6 + i * 3.1
      const by = -18 + dy - (i > 3 ? 0.9 : 0)
      poly(c, [P(bx - 1.4, by + 0.6), P(bx - 2.4, by - 2.2), P(bx + 1.2, by + 0.2)])
    }
    leg(w.fl, 'near', FR, 0)
    leg(w.hl, 'near', HR, 0)
    const hd = P(15.5 + hx, -21.4 + dy + hy)
    capsule(c, P(8.5, -16.6 + dy), P(hd.x - 1.5, hd.y + 1), 4.3, 3.2)
    p.fill(c, 'far')
    poly(c, [P(hd.x - 3.2, hd.y - 1.6), P(hd.x - 3, hd.y - 5.8), P(hd.x - 1.1, hd.y - 2.1)])
    p.fill(c, 'near')
    ellipse(c, hd, 3.7, 3.2)
    poly(c, [P(hd.x + 1.4, hd.y - 1.6), P(hd.x + 8, hd.y + 0.5), P(hd.x + 7.8, hd.y + 2), P(hd.x + 3, hd.y + 3.2), P(hd.x + 1, hd.y + 2.6)])
    poly(c, [P(hd.x - 1.9, hd.y - 2.2), P(hd.x - 0.9, hd.y - 6.8), P(hd.x + 0.9, hd.y - 2.6)])
    glowDot(c, P(hd.x + 1.4, hd.y - 0.7), 0.72, 'eye', 2.5, p)
  }
}

// ───────────────────────── 鬼火 / 蜃火 ─────────────────────────

export function wisp({ core = '#f2ffff', body = '#6ff0ff', halo = [110, 235, 255] } = {}) {
  return (c, p) => {
    if (p.mask) return
    const [r, g, b] = halo
    const grad = c.createRadialGradient(0, 1, 0, 0, 0, 15)
    grad.addColorStop(0, `rgba(${r},${g},${b},0.75)`)
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.28)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    c.fillStyle = grad
    circle(c, P(0, 0), 15)
    c.save()
    c.shadowColor = body
    c.shadowBlur = 6 * Math.hypot(c.getTransform().a, c.getTransform().b)
    c.fillStyle = body
    blob(c, [P(0, 7), P(5.6, 3), P(5, -3), P(1.2, -7.5), P(-2.6, -13.5), P(-1.8, -6.4), P(-5.2, -2), P(-5.6, 3)])
    c.restore()
    c.fillStyle = core
    blob(c, [P(0, 5.4), P(3.4, 2.4), P(2.6, -1.8), P(-0.5, -5.6), P(-2.8, -0.8), P(-3.4, 2.4)])
    c.fillStyle = '#0d2a33'
    ellipse(c, P(-0.9, 1), 0.75, 1.15)
    ellipse(c, P(2, 0.8), 0.75, 1.15)
  }
}

// ───────────────────────── 藤精 ─────────────────────────

export function treant() {
  return (c, p) => {
    p.fill(c, 'far')
    strip(c, chain(P(-7, -25), 17, 7, -110, -10, 22, 1), 1.5, 0.4)
    capsule(c, P(-5, -3), P(-12, 0), 2.2, 1)
    p.fill(c, 'near')
    capsule(c, P(6, -3), P(13, 0), 2.4, 1)
    capsule(c, P(-1, -2), P(-4, 0.5), 2.6, 1.2)
    capsule(c, P(3, -2), P(6, 0.5), 2.4, 1.1)
    poly(c, [P(-9, -1.5), P(-10.2, -14), P(-8.6, -26), P(-9.8, -33.5), P(-6.2, -31.4), P(-4.2, -37), P(-1, -32.4), P(2, -38.2), P(4.2, -32), P(7.2, -35), P(8.4, -27), P(9.8, -14), P(9.2, -1.5)])
    p.stroke(c, 'far', 0.6)
    curve(c, [P(-6.4, -4), P(-7.2, -14), P(-5.6, -24)])
    curve(c, [P(-2.6, -3), P(-3.4, -10), P(-2.2, -18)])
    strip(c, chain(P(2, -37.5), 5, 3, 170, 150, 0), 0.6, 0.3)
    ellipse(c, P(3.6, -42.8), 2.2, 1.1, -30)
    ellipse(c, P(0.4, -42), 1.8, 0.9, 30)
    p.fill(c, 'near')
    strip(c, chain(P(7.5, -25), 18, 8, 80, -20, 22, 0), 1.7, 0.45)
    const leaves = chain(P(7.5, -25), 18, 8, 80, -20, 22, 0)
    for (let i = 2; i < leaves.length; i += 2) {
      ellipse(c, add(leaves[i], P(0.8, 0.6), 1), 1.6, 0.8, 30 + i * 10)
    }
    if (!p.mask) {
      p.fill(c, 'hole')
      ellipse(c, P(1.8, -22.2), 1.7, 2.3, -8)
      ellipse(c, P(6.2, -22.6), 1.5, 2.1, 8)
      ellipse(c, P(4.2, -15.8), 2.4, 1.2)
    }
    glowDot(c, P(1.9, -22), 0.9, 'eye', 4, p)
    glowDot(c, P(6.2, -22.4), 0.8, 'eye', 4, p)
  }
}

// ───────────────────────── 蛊蛾 ─────────────────────────

export function moth() {
  return (c, p) => {
    const wing = (s, role, lift) => {
      p.fill(c, role)
      blob(c, [P(0, -1), P(s * 5, -9 - lift), P(s * 13, -13 - lift), P(s * 14.5, -8 - lift), P(s * 10, -2), P(s * 2, 1)])
      blob(c, [P(0, 0.5), P(s * 8, 1), P(s * 10.5, 6), P(s * 6, 8.5), P(s * 1.5, 4)])
    }
    wing(-1, 'far', 2)
    p.fill(c, 'near')
    ellipse(c, P(0, 1.5), 1.8, 5.2, 8)
    circle(c, P(0.6, -4.2), 1.8)
    p.stroke(c, 'near', 0.4)
    curve(c, [P(0.8, -5.4), P(2.4, -9), P(4.6, -10.6)])
    curve(c, [P(0, -5.6), P(-0.8, -9.4), P(-2.6, -11.2)])
    wing(1, 'near', 0)
    if (!p.mask) {
      c.save()
      p.glow(c, 'accent', 3)
      p.stroke(c, 'accent', 0.7)
      c.beginPath()
      c.arc(8.6, -7.6, 2.2, 0, Math.PI * 2)
      c.stroke()
      p.fill(c, 'accent')
      circle(c, P(8.6, -7.6), 0.8)
      circle(c, P(6.6, 4.2), 0.9)
      c.restore()
      c.globalAlpha = 0.55
      const rng = mulberry32(5)
      for (let i = 0; i < 16; i++) {
        p.fill(c, 'accent')
        circle(c, P((rng() - 0.5) * 12, 7 + rng() * 12), 0.25 + rng() * 0.35)
      }
      c.globalAlpha = 1
    }
  }
}

// ───────────────────────── 沼蛙妖 ─────────────────────────

export function frog() {
  return (c, p) => {
    p.fill(c, 'far')
    capsule(c, P(3, -18), P(6, -10), 2.1, 1.7)
    capsule(c, P(6, -10), P(7, -2), 1.7, 1.4)
    ellipse(c, P(-8, -8), 6.6, 5.2, -12)
    capsule(c, P(-6, -1.4), P(1, -1), 1.4, 1.1)
    p.fill(c, 'near')
    blob(c, [P(-13, -6), P(-15.5, -15), P(-12.5, -24), P(-5, -29), P(4, -30.5), P(11.5, -27.5), P(15.5, -22), P(15.4, -17), P(12, -12), P(8, -6.5), P(2, -3.4), P(-6, -2.2)])
    circle(c, P(4, -30.5), 3.9)
    ellipse(c, P(-5, -7.4), 7.4, 6, -14)
    capsule(c, P(-1, -3), P(4, -2.2), 2.2, 1.8)
    poly(c, [P(2, -3), P(10, -2.2), P(11.4, -0.8), P(10.6, 0.3), P(1.4, 0.3)])
    for (const [wx, wy, wr] of [
      [-10, -21, 1.3],
      [-13, -14.5, 1.1],
      [-6.5, -26, 1],
      [-14, -9, 0.9],
      [-3, -28.8, 0.8],
    ]) {
      circle(c, P(wx - 0.9, wy - 0.5), wr)
    }
    p.fill(c, 'far')
    circle(c, P(9.4, -29.2), 3)
    blob(c, [P(6, -19.5), P(13.5, -20), P(14.5, -15), P(10.5, -12.5), P(6.5, -14.5)])
    p.fill(c, 'near')
    capsule(c, P(7.5, -18), P(12.5, -11), 2.4, 1.9)
    capsule(c, P(12.5, -11), P(13.4, -2.4), 1.9, 1.5)
    poly(c, [P(11.2, -2.2), P(16.8, -1), P(16.4, 0.3), P(11.2, 0.3)])
    if (!p.mask) {
      p.stroke(c, 'mouth', 0.75)
      curve(c, [P(15.6, -21.6), P(10, -20.4), P(3.2, -21.8)])
      p.fill(c, 'mouth')
      circle(c, P(14.4, -24.2), 0.45)
    }
    glowDot(c, P(5.2, -31.4), 1.35, 'eye', 3, p)
    if (!p.mask) {
      c.fillStyle = '#1a1510'
      ellipse(c, P(5.4, -31.4), 0.32, 1.05)
    }
  }
}

// ───────────────────────── 小蝠 ─────────────────────────

export function bat() {
  return (c, p) => {
    c.translate(0, -14)
    const wing = (s, role) => {
      p.fill(c, role)
      poly(c, [P(s * 2.5, -3.5), P(s * 7.5, -9.6), P(s * 13, -8.4), P(s * 14.6, -3.2), P(s * 12.2, -1.8), P(s * 10.6, 0.6), P(s * 8.2, -0.9), P(s * 6, 1.4), P(s * 3.2, 0.4)])
    }
    wing(-1, 'far')
    wing(1, 'near')
    p.fill(c, 'near')
    blob(c, [P(-3.6, -6), P(-5.4, -14), P(-2.8, -12.8), P(-1.1, -7.4)])
    blob(c, [P(1.2, -7.2), P(3.2, -14.2), P(5.5, -13), P(3.6, -6)])
    ellipse(c, P(0, -0.8), 4.3, 4.8)
    ellipse(c, P(0, -5.6), 3.9, 3.4)
    capsule(c, P(-1.3, 3.2), P(-1.6, 5.2), 0.55, 0.4)
    capsule(c, P(1.3, 3.2), P(1.6, 5.2), 0.55, 0.4)
    p.stroke(c, 'accent', 0.7)
    c.beginPath()
    c.moveTo(-3, -4.2)
    c.lineTo(3.4, 2)
    c.stroke()
    p.fill(c, 'accent')
    blob(c, [P(2.2, 1.2), P(5.8, 1.4), P(5.6, 4.4), P(2.4, 4.2)])
    if (!p.mask) {
      c.fillStyle = '#f5f1e6'
      ellipse(c, P(-1.4, -5.9), 1.0, 1.15)
      ellipse(c, P(1.6, -5.9), 1.0, 1.15)
      c.fillStyle = '#101217'
      circle(c, P(-1.1, -5.7), 0.5)
      circle(c, P(1.9, -5.7), 0.5)
      c.fillStyle = '#f5f1e6'
      poly(c, [P(0.2, -3.8), P(0.8, -3.8), P(0.5, -2.9)])
    }
  }
}

// ───────────────────────── 枯藤姥姥 ─────────────────────────

export function vineHag() {
  return (c, p) => {
    const rng = mulberry32(21)
    p.fill(c, 'far')
    const branch = (x0, y0, a, l, w, depth) => {
      const d = ldir(a)
      const x1 = x0 + d.x * l
      const y1 = y0 + d.y * l
      capsule(c, P(x0, y0), P(x1, y1), w, w * 0.65)
      if (depth > 0) {
        branch(x1, y1, a - 18 - rng() * 16, l * 0.72, w * 0.62, depth - 1)
        branch(x1, y1, a + 16 + rng() * 18, l * 0.68, w * 0.6, depth - 1)
      }
    }
    branch(-10, -112, 200, 22, 3.2, 3)
    branch(12, -114, 160, 24, 3.2, 3)
    branch(0, -120, 180, 18, 2.6, 2)
    for (let i = 0; i < 7; i++) {
      const x0 = -26 + i * 8.5
      strip(c, chain(P(x0, -106 + Math.abs(i - 3) * 3), 30 + rng() * 26, 8, 2, -6 + rng() * 12, 6, i), 1.1, 0.25)
    }
    p.fill(c, 'near')
    for (const [ax, dir] of [
      [-18, -1],
      [18, 1],
    ]) {
      capsule(c, P(ax, -8), P(ax + dir * 16, -1), 5, 1.8)
      capsule(c, P(ax * 0.6, -6), P(ax * 0.6 + dir * 26, 0), 3.6, 1.2)
    }
    poly(c, [P(-26, -2), P(-24, -30), P(-20, -62), P(-26, -86), P(-22, -104), P(-10, -116), P(4, -120), P(18, -112), P(26, -96), P(22, -72), P(24, -40), P(28, -2)])
    strip(c, chain(P(20, -80), 58, 12, 70, -40, 30, 0.2), 5.4, 1.2)
    p.fill(c, 'far')
    strip(c, chain(P(-18, -84), 50, 12, -80, 20, 28, 1.5), 4.4, 1)
    p.fill(c, 'near')
    for (let i = 0; i < 9; i++) {
      const x0 = -20 + i * 5.2
      strip(c, chain(P(x0, -104 + Math.abs(i - 4) * 1.5), 22 + rng() * 34, 8, 4, -4 + rng() * 8, 5, i * 1.3), 1.2, 0.25)
    }
    p.stroke(c, 'far', 1.2)
    curve(c, [P(-14, -6), P(-16, -30), P(-12, -52)])
    curve(c, [P(14, -8), P(17, -26), P(13, -44)])
    if (!p.mask) {
      p.fill(c, 'hole')
      ellipse(c, P(-8, -80), 5, 3.6, 12)
      ellipse(c, P(9, -80), 5, 3.6, -12)
      blob(c, [P(-8, -62), P(0, -66), P(8, -62), P(6, -55), P(2, -58), P(-1, -53), P(-4, -58), P(-7, -55)])
    }
    p.fill(c, 'near')
    blob(c, [P(-15, -86), P(-4, -88), P(-1, -84), P(-12, -83)])
    blob(c, [P(15, -86), P(4, -88), P(1, -84), P(12, -83)])
    poly(c, [P(-1.6, -80), P(1.6, -80), P(3, -69), P(-3, -69)])
    glowDot(c, P(-8, -80), 1.6, 'eye', 6, p)
    glowDot(c, P(9, -80), 1.6, 'eye', 6, p)
    if (!p.mask) {
      c.save()
      p.glow(c, 'core', 10)
      p.fill(c, 'core')
      circle(c, P(0, -40), 5.2)
      p.stroke(c, 'core', 0.6)
      c.beginPath()
      c.arc(0, -40, 8.4, 0, Math.PI * 2)
      c.stroke()
      c.setLineDash([1.6, 1.8])
      c.beginPath()
      c.arc(0, -40, 11, 0, Math.PI * 2)
      c.stroke()
      c.restore()
      c.fillStyle = '#f6eaff'
      circle(c, P(-1.2, -41.4), 1.5)
    }
  }
}

// ───────────────────────── 蜃龙 ─────────────────────────

export function mirageDragon() {
  return (c, p) => {
    const body = [P(-150, 60), P(-126, 22), P(-96, -6), P(-66, -30), P(-36, -48), P(-12, -58)]
    p.fill(c, 'far')
    strip(c, [P(-40, 70), P(-60, 40), P(-90, 30), P(-128, 44), P(-160, 34)], 14, 7)
    p.fill(c, 'near')
    strip(c, body, 20, 11)
    for (let i = 1; i < body.length; i++) {
      const a = body[i - 1]
      const b = body[i]
      const d = unit(sub(b, a))
      const n = perp(d)
      const m = add(P((a.x + b.x) / 2, (a.y + b.y) / 2), n, lerp(19, 11, i / body.length))
      poly(c, [add(m, d, -4), add(m, n, 7 - i * 0.6), add(m, d, 3)])
    }
    capsule(c, P(-60, -22), P(-38, -2), 6, 4.2)
    capsule(c, P(-38, -2), P(-18, -6), 4.2, 3)
    for (let i = -1; i <= 1; i++) {
      strip(c, chain(P(-18, -6), 9, 3, 90 + i * 22, 30 + i * 22, 0), 1.8, 0.2)
    }
    const shell = P(-14, -74)
    p.fill(c, 'far')
    c.beginPath()
    const toC = (a) => ((90 - a) * Math.PI) / 180
    c.moveTo(shell.x, shell.y)
    c.arc(shell.x, shell.y, 34, toC(120), toC(-110), true)
    c.closePath()
    c.fill()
    if (!p.mask) {
      p.stroke(c, 'near', 1)
      for (let i = 0; i <= 9; i++) {
        const a = 120 + ((250 - 120) * i) / 9
        const d = ldir(a)
        c.beginPath()
        c.moveTo(shell.x + d.x * 6, shell.y + d.y * 6)
        c.lineTo(shell.x + d.x * 33, shell.y + d.y * 33)
        c.stroke()
      }
      c.save()
      p.glow(c, 'accent2', 4)
      p.stroke(c, 'accent2', 0.7)
      c.beginPath()
      c.arc(shell.x, shell.y, 33.5, toC(120), toC(-110), true)
      c.stroke()
      c.restore()
    }
    p.fill(c, 'near')
    strip(c, chain(P(-6, -68), 26, 6, -150, 170, 0), 2.4, 0.3)
    p.fill(c, 'far')
    strip(c, chain(P(-12, -66), 22, 6, -140, -175, 0), 2, 0.3)
    p.fill(c, 'near')
    blob(c, [P(-18, -54), P(-14, -70), P(0, -72), P(20, -66), P(38, -62), P(40, -56), P(22, -54), P(4, -50)])
    blob(c, [P(-8, -50), P(8, -48), P(34, -40), P(32, -36), P(10, -40), P(-10, -42)])
    if (!p.mask) {
      c.fillStyle = '#f2ecff'
      for (let i = 0; i < 6; i++) {
        const tx = 8 + i * 4.6
        poly(c, [P(tx, -54.5 + i * 0.4), P(tx + 1.4, -51 + i * 0.4), P(tx + 2.6, -54.3 + i * 0.4)])
        poly(c, [P(tx + 1, -43.5 + i * 0.6), P(tx + 2.2, -47 + i * 0.6), P(tx + 3.2, -43 + i * 0.6)])
      }
    }
    p.fill(c, 'near')
    strip(c, chain(P(34, -60), 38, 9, -60, -120, 16, 0.5), 0.9, 0.2)
    strip(c, chain(P(30, -58), 30, 8, -40, -100, 18, 2), 0.8, 0.2)
    glowDot(c, P(6, -64), 1.7, 'eye', 7, p)
    if (!p.mask) {
      c.save()
      c.globalAlpha = 0.5
      p.glow(c, 'mist', 10)
      p.fill(c, 'mist')
      blob(c, [P(38, -50), P(56, -58), P(74, -48), P(86, -54), P(92, -40), P(72, -34), P(52, -40)])
      c.restore()
    }
  }
}
