// 程序化水墨场景。所有尺寸是逻辑像素；同一个种子画出来永远一样。

import { glowDot } from './figure.js'
import { fbm, lerp, makeNoise1D, mix, mulberry32, rgba, TAU } from './util.js'

export const PALETTES = {
  1: {
    name: '青崖镇 · 黄昏烽火',
    skyTop: '#f4d3a0',
    skyBot: '#e2825e',
    far: '#c99a82',
    mid: '#8e6660',
    near: '#4a3436',
    fog: '#f0c6a0',
    accent: '#ff8a3d',
    rim: '#ffd2a0',
    ground: '#14100f',
  },
  2: {
    name: '雾隐竹林 · 晨雾',
    skyTop: '#e8eee6',
    skyBot: '#c3d3c6',
    far: '#a9bfae',
    mid: '#7c9887',
    near: '#3e5448',
    fog: '#eef3ec',
    accent: '#9be38a',
    rim: '#f4faef',
    ground: '#0f1411',
  },
  3: {
    name: '断岳山 · 寒岩',
    skyTop: '#d5d9df',
    skyBot: '#9aa1ad',
    far: '#8a909b',
    mid: '#626873',
    near: '#35383f',
    fog: '#e1e4ea',
    accent: '#ff4a2a',
    rim: '#eef1f6',
    ground: '#0e0f12',
  },
  4: {
    name: '幽泽 · 紫暮',
    skyTop: '#8d7cab',
    skyBot: '#463c63',
    far: '#6a5f86',
    mid: '#4d4668',
    near: '#2a2640',
    fog: '#b9a6dc',
    accent: '#6dffd2',
    rim: '#cdb8f0',
    ground: '#0b0a11',
  },
  5: {
    name: '蜃楼幻宫 · 金紫',
    skyTop: '#231a3f',
    skyBot: '#5a3479',
    far: '#4a3268',
    mid: '#3a2955',
    near: '#1f1631',
    fog: '#9c7cc8',
    accent: '#f3c86b',
    rim: '#f3c86b',
    ground: '#09070f',
  },
}

// ───────────────────────── 基础笔触 ─────────────────────────

function sky(ctx, W, H, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, pal.skyTop)
  g.addColorStop(1, pal.skyBot)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/** 水墨山脊：山顶浓，山脚化进雾里。 */
function ridge(ctx, W, H, o) {
  const noise = makeNoise1D(o.seed)
  const pts = []
  for (let x = -6; x <= W + 6; x += 2) {
    let n = fbm(noise, (x + (o.shift ?? 0)) * o.freq, 5)
    if (o.sharp) n = lerp(n, 1 - Math.abs(n * 2 - 1), o.sharp)
    pts.push([x, o.base - o.amp * n])
  }
  const top = o.base - o.amp
  const g = ctx.createLinearGradient(0, top, 0, o.base + (o.tail ?? o.amp * 0.4))
  g.addColorStop(0, o.color)
  g.addColorStop(0.5, mix(o.color, o.fog, 0.4))
  g.addColorStop(1, rgba(o.fog, o.fade ?? 1))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-6, H)
  for (const [x, y] of pts) ctx.lineTo(x, y)
  ctx.lineTo(W + 6, H)
  ctx.closePath()
  ctx.fill()
  if (o.dots) {
    const rng = mulberry32(o.seed + 7)
    ctx.fillStyle = rgba(mix(o.color, '#000000', 0.35), 0.45)
    for (let i = 0; i < o.dots; i++) {
      const [x, y] = pts[Math.floor(rng() * pts.length)]
      ctx.beginPath()
      ctx.ellipse(x + (rng() - 0.5) * 3, y + 1 + rng() * 5, 0.6 + rng() * 0.9, 0.35 + rng() * 0.4, 0, 0, TAU)
      ctx.fill()
    }
  }
  return pts
}

function fogBand(ctx, W, y, h, color, alpha) {
  const g = ctx.createLinearGradient(0, y - h, 0, y + h)
  g.addColorStop(0, rgba(color, 0))
  g.addColorStop(0.5, rgba(color, alpha))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, y - h, W, h * 2)
}

function glowDisc(ctx, x, y, r, inner, outer, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
  g.addColorStop(0, rgba(inner, alpha))
  g.addColorStop(0.36, rgba(inner, alpha * 0.95))
  g.addColorStop(0.4, rgba(outer, alpha * 0.4))
  g.addColorStop(1, rgba(outer, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r * 2.6, 0, TAU)
  ctx.fill()
}

function ground(ctx, W, H, y, pal, rng, kind = 'grass') {
  ctx.fillStyle = pal.ground
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(0, y)
  for (let x = 0; x <= W; x += 3) ctx.lineTo(x, y + Math.sin(x * 0.07) * 0.4 + (rng() - 0.5) * 0.5)
  ctx.lineTo(W, H)
  ctx.closePath()
  ctx.fill()
  if (kind === 'grass') {
    for (let x = 0; x < W; x += 2 + rng() * 5) {
      const h = 1 + rng() * 3.2
      ctx.beginPath()
      ctx.moveTo(x - 0.8, y + 0.5)
      ctx.lineTo(x + (rng() - 0.3) * 1.5, y - h)
      ctx.lineTo(x + 0.8, y + 0.5)
      ctx.fill()
    }
  } else if (kind === 'stone') {
    for (let x = 0; x < W; x += 6 + rng() * 14) {
      ctx.beginPath()
      ctx.ellipse(x, y, 2 + rng() * 4, 1 + rng() * 1.6, 0, Math.PI, TAU)
      ctx.fill()
    }
  } else if (kind === 'tile') {
    ctx.fillStyle = rgba(pal.accent, 0.35)
    ctx.fillRect(0, y, W, 0.6)
    ctx.fillStyle = pal.ground
    for (let x = 6; x < W; x += 22) {
      ctx.fillRect(x, y - 9, 1.6, 9)
      ctx.fillRect(x - 1, y - 10, 3.6, 1.2)
    }
    ctx.fillRect(0, y - 7.4, W, 1)
    ctx.fillRect(0, y - 3.4, W, 0.8)
  }
}

// ───────────────────────── 建筑与物件 ─────────────────────────

/** 飞檐屋顶。 */
function roof(ctx, x, y, w, h, color) {
  const ov = w * 0.16
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - ov, y - h * 0.34)
  ctx.quadraticCurveTo(x + w * 0.05, y - h * 0.05, x + w * 0.18, y - h * 0.62)
  ctx.lineTo(x + w * 0.24, y - h)
  ctx.lineTo(x + w * 0.76, y - h)
  ctx.lineTo(x + w * 0.82, y - h * 0.62)
  ctx.quadraticCurveTo(x + w * 0.95, y - h * 0.05, x + w + ov, y - h * 0.34)
  ctx.lineTo(x + w + ov * 0.6, y)
  ctx.lineTo(x - ov * 0.6, y)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + w * 0.22, y - h)
  ctx.lineTo(x + w * 0.2, y - h * 1.28)
  ctx.lineTo(x + w * 0.28, y - h)
  ctx.moveTo(x + w * 0.78, y - h)
  ctx.lineTo(x + w * 0.8, y - h * 1.28)
  ctx.lineTo(x + w * 0.72, y - h)
  ctx.fill()
}

function house(ctx, x, base, w, h, color, windowColor, rng) {
  ctx.fillStyle = color
  ctx.fillRect(x, base - h, w, h)
  roof(ctx, x, base - h, w, h * 0.55, color)
  if (windowColor && rng() < 0.7) {
    ctx.fillStyle = windowColor
    const ww = w * 0.16
    ctx.fillRect(x + w * 0.22, base - h * 0.68, ww, h * 0.3)
    if (w > 22) ctx.fillRect(x + w * 0.62, base - h * 0.68, ww, h * 0.3)
  }
}

function pagoda(ctx, x, base, w, tiers, color) {
  let y = base
  let tw = w
  for (let i = 0; i < tiers; i++) {
    const bh = tw * 0.5
    ctx.fillStyle = color
    ctx.fillRect(x - tw * 0.32, y - bh, tw * 0.64, bh)
    roof(ctx, x - tw * 0.5, y - bh, tw, tw * 0.28, color)
    y -= bh + tw * 0.2
    tw *= 0.82
  }
  ctx.fillRect(x - 0.5, y - tw * 1.4, 1, tw * 1.4)
  ctx.beginPath()
  ctx.arc(x, y - tw * 0.4, tw * 0.14, 0, TAU)
  ctx.fill()
}

function paifang(ctx, x, base, w, h, color) {
  ctx.fillStyle = color
  const pw = w * 0.07
  for (const px of [x, x + w - pw, x + w * 0.3, x + w * 0.7 - pw]) {
    const ph = px === x || px === x + w - pw ? h * 0.72 : h * 0.86
    ctx.fillRect(px, base - ph, pw, ph)
  }
  ctx.fillRect(x - w * 0.04, base - h * 0.72, w * 1.08, h * 0.06)
  ctx.fillRect(x + w * 0.26, base - h * 0.86, w * 0.48, h * 0.07)
  roof(ctx, x - w * 0.02, base - h * 0.76, w * 0.3, h * 0.13, color)
  roof(ctx, x + w * 0.72, base - h * 0.76, w * 0.3, h * 0.13, color)
  roof(ctx, x + w * 0.25, base - h * 0.92, w * 0.5, h * 0.16, color)
  ctx.fillRect(x + w * 0.4, base - h * 0.84, w * 0.2, h * 0.08)
}

function smoke(ctx, x, base, height, color, rng, drift = 0.5) {
  for (let i = 0; i < 26; i++) {
    const t = i / 26
    const px = x + drift * height * t * t + Math.sin(t * 6 + x) * 3
    const py = base - height * t
    const r = 3 + t * 16
    ctx.fillStyle = rgba(color, 0.08 * (1 - t) + 0.02)
    ctx.beginPath()
    ctx.arc(px + (rng() - 0.5) * 3, py, r, 0, TAU)
    ctx.fill()
  }
}

function bamboo(ctx, x, top, bottom, w, color, rng, lean = 0) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = w
  ctx.lineCap = 'butt'
  const seg = 14 + rng() * 8
  for (let y = bottom; y > top; y -= seg) {
    const x0 = x + lean * (bottom - y)
    const x1 = x + lean * (bottom - y + seg - 1.2)
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y - seg + 1.2)
    ctx.stroke()
    if (rng() < 0.35) {
      const dir = rng() < 0.5 ? -1 : 1
      for (let k = 0; k < 4; k++) {
        const lx = x1
        const ly = y - seg + 1.5
        const ang = dir * (0.5 + k * 0.28) + (rng() - 0.5) * 0.2
        const L = 7 + rng() * 6
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.quadraticCurveTo(lx + Math.sin(ang) * L * 0.6, ly + Math.cos(ang) * L * 0.2, lx + Math.sin(ang) * L, ly + Math.cos(ang) * L * 0.55)
        ctx.quadraticCurveTo(lx + Math.sin(ang) * L * 0.5, ly + Math.cos(ang) * L * 0.4 + 0.8, lx, ly + 0.4)
        ctx.fill()
      }
    }
  }
}

function cliff(ctx, x, w, top, bottom, color, rng, pines = 0) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, bottom)
  let y = bottom
  while (y > top + 8) {
    y -= 5 + rng() * 12
    const jut = (rng() - 0.35) * 9
    ctx.lineTo(x + jut, y)
    if (rng() < 0.3) ctx.lineTo(x + jut - 3 - rng() * 3, y - 1.5)
  }
  const peak = [x + w * (0.2 + rng() * 0.2), top - 4 - rng() * 8]
  ctx.lineTo(x + w * 0.08, top + 3)
  ctx.lineTo(peak[0], peak[1])
  ctx.lineTo(x + w * 0.62, top + rng() * 5)
  ctx.lineTo(x + w * 0.86, top + 6 + rng() * 6)
  y = top + 10
  while (y < bottom) {
    y += 5 + rng() * 12
    const jut = (rng() - 0.65) * 9
    ctx.lineTo(x + w + jut, Math.min(y, bottom))
    if (rng() < 0.3) ctx.lineTo(x + w + jut + 3 + rng() * 3, Math.min(y + 1.5, bottom))
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgba('#ffffff', 0.09)
  ctx.lineWidth = 0.6
  for (let s = top + 12; s < bottom; s += 8 + rng() * 9) {
    ctx.beginPath()
    ctx.moveTo(x + 2 + rng() * 4, s)
    ctx.lineTo(x + w * (0.4 + rng() * 0.45), s + (rng() - 0.5) * 3)
    ctx.stroke()
  }
  for (let i = 0; i < pines; i++) pine(ctx, peak[0] + (i - 0.5) * w * 0.4, peak[1] + 4 + i * 3, 0.8 + rng() * 0.5, color, rng, i % 2 ? 1 : -1)
}

/** 水墨松树：弯曲的树干 + 几团横向的松针。 */
function pine(ctx, x, y, s, color, rng, dir = 1) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.4 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + dir * 4 * s, y - 8 * s, x + dir * 10 * s, y - 12 * s)
  ctx.stroke()
  const clumps = [
    [dir * 10, -13, 9, 2.4],
    [dir * 3, -9, 7, 2],
    [dir * 15, -9.5, 6, 1.8],
    [dir * 6, -16, 6, 1.8],
  ]
  for (const [cx, cy, rx, ry] of clumps) {
    ctx.beginPath()
    ctx.ellipse(x + cx * s, y + cy * s, rx * s * (0.8 + rng() * 0.4), ry * s, 0, 0, TAU)
    ctx.fill()
  }
}

function stele(ctx, x, base, w, h, color, crack) {
  ctx.fillStyle = color
  ctx.fillRect(x - w * 0.75, base - h * 0.08, w * 1.5, h * 0.08)
  ctx.fillRect(x - w * 0.62, base - h * 0.13, w * 1.24, h * 0.06)
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, base - h * 0.12)
  ctx.lineTo(x - w * 0.5, base - h * 0.86)
  ctx.quadraticCurveTo(x - w * 0.5, base - h, x, base - h)
  ctx.quadraticCurveTo(x + w * 0.5, base - h, x + w * 0.5, base - h * 0.86)
  ctx.lineTo(x + w * 0.5, base - h * 0.12)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgba('#ffffff', 0.12)
  ctx.lineWidth = 0.5
  ctx.strokeRect(x - w * 0.36, base - h * 0.8, w * 0.72, h * 0.56)
  ctx.save()
  ctx.shadowColor = crack
  ctx.shadowBlur = 8 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
  ctx.strokeStyle = crack
  ctx.lineWidth = 1
  ctx.beginPath()
  const pts = [
    [0.04, 0.95],
    [-0.08, 0.8],
    [0.1, 0.66],
    [-0.04, 0.5],
    [0.12, 0.36],
    [0.02, 0.2],
  ]
  ctx.moveTo(x + pts[0][0] * w, base - pts[0][1] * h)
  for (const [px, py] of pts.slice(1)) ctx.lineTo(x + px * w, base - py * h)
  ctx.stroke()
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x + 0.1 * w, base - 0.66 * h)
  ctx.lineTo(x + 0.3 * w, base - 0.6 * h)
  ctx.moveTo(x - 0.04 * w, base - 0.5 * h)
  ctx.lineTo(x - 0.26 * w, base - 0.44 * h)
  ctx.stroke()
  ctx.restore()
}

function bridge(ctx, x0, y0, x1, y1, sag, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = 0.6
  const mx = (x0 + x1) / 2
  const my = Math.max(y0, y1) + sag
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx, my, x1, y1)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x0, y0 - 5)
  ctx.quadraticCurveTo(mx, my - 5, x1, y1 - 5)
  ctx.stroke()
  for (let i = 1; i < 24; i++) {
    const t = i / 24
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 5)
    ctx.stroke()
  }
}

function deadTree(ctx, x, base, h, color, rng) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  const grow = (x0, y0, a, L, w, d) => {
    const x1 = x0 + Math.sin(a) * L
    const y1 = y0 - Math.cos(a) * L
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    if (d > 0) {
      grow(x1, y1, a - 0.4 - rng() * 0.4, L * 0.68, w * 0.62, d - 1)
      grow(x1, y1, a + 0.3 + rng() * 0.4, L * 0.64, w * 0.6, d - 1)
    }
  }
  grow(x, base, (rng() - 0.5) * 0.3, h * 0.45, h * 0.06, 4)
}

function palace(ctx, x, base, s, color) {
  ctx.fillStyle = color
  ctx.fillRect(x - 30 * s, base - 4 * s, 60 * s, 4 * s)
  ctx.fillRect(x - 22 * s, base - 16 * s, 44 * s, 12 * s)
  roof(ctx, x - 26 * s, base - 16 * s, 52 * s, 9 * s, color)
  ctx.fillRect(x - 14 * s, base - 30 * s, 28 * s, 9 * s)
  roof(ctx, x - 18 * s, base - 30 * s, 36 * s, 8 * s, color)
  for (const dx of [-42, 42]) {
    ctx.fillRect(x + dx * s - 5 * s, base - 22 * s, 10 * s, 22 * s)
    roof(ctx, x + dx * s - 7 * s, base - 22 * s, 14 * s, 6 * s, color)
  }
}

function island(ctx, x, y, w, color, edge, rng) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y)
  let px = x - w / 2
  while (px < x + w / 2) {
    px += 3 + rng() * 5
    ctx.lineTo(Math.min(px, x + w / 2), y - rng() * 1.5)
  }
  const depth = w * (0.55 + rng() * 0.25)
  ctx.lineTo(x + w * 0.3, y + depth * 0.35)
  ctx.lineTo(x + w * 0.08, y + depth * 0.7)
  ctx.lineTo(x - w * 0.02, y + depth)
  ctx.lineTo(x - w * 0.16, y + depth * 0.62)
  ctx.lineTo(x - w * 0.36, y + depth * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.save()
  ctx.strokeStyle = edge
  ctx.shadowColor = edge
  ctx.shadowBlur = 4 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y)
  ctx.lineTo(x + w / 2, y)
  ctx.stroke()
  ctx.restore()
}

function cloudBank(ctx, W, y, color, rng, size = 14) {
  ctx.fillStyle = color
  for (let x = -10; x < W + 10; x += size * 0.7) {
    const r = size * (0.6 + rng() * 0.7)
    ctx.beginPath()
    ctx.arc(x, y - r * 0.3 + rng() * 4, r, 0, TAU)
    ctx.fill()
  }
  ctx.fillRect(-10, y, W + 20, 200)
}

function particles(ctx, W, H, rng, kind, pal, n) {
  for (let i = 0; i < n; i++) {
    const x = rng() * W
    const y = rng() * H
    if (kind === 'ember') {
      ctx.fillStyle = rgba(pal.accent, 0.5 + rng() * 0.5)
      ctx.fillRect(x, y, 0.8, 0.8)
    } else if (kind === 'leaf') {
      ctx.fillStyle = rgba(pal.near, 0.55)
      ctx.beginPath()
      ctx.ellipse(x, y, 1.6, 0.5, rng() * 3, 0, TAU)
      ctx.fill()
    } else if (kind === 'ash') {
      ctx.fillStyle = rgba('#ffffff', 0.35 + rng() * 0.3)
      ctx.fillRect(x, y, 0.7, 0.7)
    } else if (kind === 'firefly' || kind === 'gold') {
      const col = kind === 'gold' ? pal.accent : pal.accent
      ctx.save()
      ctx.shadowColor = col
      ctx.shadowBlur = 4 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
      ctx.fillStyle = rgba(col, 0.6 + rng() * 0.4)
      ctx.beginPath()
      ctx.arc(x, y, kind === 'gold' ? 0.45 : 0.8, 0, TAU)
      ctx.fill()
      ctx.restore()
    }
  }
}

// ───────────────────────── 五章场景 ─────────────────────────

/**
 * 画一整幅场景。gy = 地面高度（逻辑像素）。
 * opts.pan 让远近各层按视差系数错开，方便同一章画出不同位置的画面。
 */
export function paintScene(ctx, W, H, ch, opts = {}) {
  const pal = PALETTES[ch]
  const gy = opts.gy ?? H - 20
  const seed = opts.seed ?? ch * 101
  const pan = opts.pan ?? 0
  const rng = mulberry32(seed)
  sky(ctx, W, gy, pal)
  const k = gy / 150
  if (ch === 1) sceneQingya(ctx, W, H, gy, pal, rng, seed, pan, k)
  else if (ch === 2) sceneBamboo(ctx, W, H, gy, pal, rng, seed, pan, k)
  else if (ch === 3) sceneCliff(ctx, W, H, gy, pal, rng, seed, pan, k)
  else if (ch === 4) sceneSwamp(ctx, W, H, gy, pal, rng, seed, pan, k)
  else sceneMirage(ctx, W, H, gy, pal, rng, seed, pan, k)
  if (!opts.noGround) {
    ground(ctx, W, H, gy, pal, rng, ch === 5 ? 'tile' : ch === 3 ? 'stone' : 'grass')
  }
  return pal
}

function sceneQingya(ctx, W, H, gy, pal, rng, seed, pan, k) {
  glowDisc(ctx, W * 0.64 - pan * 0.02, gy * 0.6, 14 * k, '#fff0cf', '#ff9a5a', 0.95)
  ridge(ctx, W, H, { base: gy * 0.78, amp: 34 * k, freq: 0.012, color: pal.far, fog: pal.fog, seed, dots: 60, shift: pan * 0.1 })
  pagoda(ctx, W * 0.2 - pan * 0.1, gy * 0.64, 12 * k, 6, mix(pal.far, pal.mid, 0.5))
  fogBand(ctx, W, gy * 0.74, 10 * k, pal.fog, 0.8)
  ridge(ctx, W, H, { base: gy * 0.88, amp: 18 * k, freq: 0.02, color: pal.mid, fog: pal.fog, seed: seed + 1, dots: 40, shift: pan * 0.2 })
  for (let i = 0; i < 4; i++) smoke(ctx, W * (0.12 + i * 0.26) - pan * 0.3, gy * 0.9, gy * 0.72, '#4a3a38', rng, 0.35)
  let x = -20 - ((pan * 0.3) % 40)
  while (x < W + 20) {
    const w = 18 + rng() * 22
    const h = 8 + rng() * 10
    house(ctx, x, gy - 6 * k, w, h * k * 0.9, mix(pal.mid, pal.near, 0.55), rgba(pal.accent, 0.8), rng)
    x += w + 6 + rng() * 10
  }
  const glow = ctx.createLinearGradient(0, gy - 40 * k, 0, gy)
  glow.addColorStop(0, rgba(pal.accent, 0))
  glow.addColorStop(1, rgba(pal.accent, 0.4))
  ctx.fillStyle = glow
  ctx.fillRect(0, gy - 40 * k, W, 40 * k)
  paifang(ctx, W * 0.7 - pan * 0.6, gy, 60 * k, 48 * k, pal.near)
  x = -30 - ((pan * 0.6) % 60)
  while (x < W * 0.62) {
    const w = 28 + rng() * 16
    house(ctx, x, gy, w, (14 + rng() * 8) * k, pal.near, rgba('#ffb060', 0.9), rng)
    x += w + 16 + rng() * 30
  }
  for (let i = 0; i < 3; i++) {
    const lx = W * (0.15 + i * 0.3) - pan * 0.6
    ctx.save()
    ctx.shadowColor = '#ff5a2a'
    ctx.shadowBlur = 6 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
    ctx.fillStyle = '#d8402a'
    ctx.beginPath()
    ctx.ellipse(lx, gy - 26 * k, 2.2, 2.8, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  particles(ctx, W, gy, rng, 'ember', pal, 60)
}

function sceneBamboo(ctx, W, H, gy, pal, rng, seed, pan, k) {
  glowDisc(ctx, W * 0.3, gy * 0.35, 12 * k, '#ffffff', '#ffffff', 0.55)
  ridge(ctx, W, H, { base: gy * 0.62, amp: 40 * k, freq: 0.01, color: mix(pal.far, pal.fog, 0.35), fog: pal.fog, seed, dots: 30 })
  fogBand(ctx, W, gy * 0.6, 14 * k, pal.fog, 0.9)
  for (let i = 0; i < 26; i++) bamboo(ctx, rng() * W, -10, gy, 1.2, mix(pal.far, pal.fog, 0.3), rng, (rng() - 0.5) * 0.04)
  fogBand(ctx, W, gy * 0.72, 18 * k, pal.fog, 0.85)
  for (let i = 0; i < 16; i++) bamboo(ctx, rng() * W, -10, gy, 2, pal.mid, rng, (rng() - 0.5) * 0.05)
  fogBand(ctx, W, gy * 0.86, 12 * k, pal.fog, 0.6)
  ctx.save()
  ctx.globalAlpha = 0.22
  for (let i = 0; i < 4; i++) {
    const g = ctx.createRadialGradient(W * (0.2 + i * 0.22), gy - 6, 0, W * (0.2 + i * 0.22), gy - 6, 40 * k)
    g.addColorStop(0, '#b36bff')
    g.addColorStop(1, 'rgba(179,107,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, gy - 50 * k, W, 50 * k)
  }
  ctx.restore()
  for (let i = 0; i < 7; i++) bamboo(ctx, rng() * W, -10, gy, 3.6, pal.near, rng, (rng() - 0.5) * 0.06)
  particles(ctx, W, gy, rng, 'leaf', pal, 30)
}

function sceneCliff(ctx, W, H, gy, pal, rng, seed, pan, k) {
  ridge(ctx, W, H, { base: gy * 0.66, amp: 60 * k, freq: 0.016, color: pal.far, fog: pal.fog, seed, sharp: 0.7, dots: 50 })
  fogBand(ctx, W, gy * 0.64, 12 * k, pal.fog, 0.8)
  cliff(ctx, W * 0.04, 34 * k, gy * 0.18, gy, mix(pal.mid, pal.fog, 0.25), rng, 1)
  cliff(ctx, W * 0.82, 40 * k, gy * 0.1, gy, mix(pal.mid, pal.fog, 0.25), rng, 2)
  bridge(ctx, W * 0.04 + 30 * k, gy * 0.34, W * 0.82, gy * 0.3, 18 * k, mix(pal.mid, '#000000', 0.2))
  fogBand(ctx, W, gy * 0.8, 16 * k, pal.fog, 0.7)
  stele(ctx, W * 0.5, gy, 22 * k, 92 * k, pal.near, pal.accent)
  cliff(ctx, -10, 26 * k, gy * 0.3, gy, pal.near, rng, 1)
  cliff(ctx, W - 22 * k, 30 * k, gy * 0.22, gy, pal.near, rng, 1)
  ctx.save()
  ctx.shadowColor = pal.accent
  ctx.shadowBlur = 6 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
  ctx.strokeStyle = pal.accent
  ctx.lineWidth = 0.8
  for (let i = 0; i < 5; i++) {
    const x0 = rng() * W
    ctx.beginPath()
    ctx.moveTo(x0, gy + 1)
    ctx.lineTo(x0 + 6 + rng() * 6, gy + 3 + rng() * 3)
    ctx.lineTo(x0 + 12 + rng() * 10, gy + 2)
    ctx.stroke()
  }
  ctx.restore()
  particles(ctx, W, gy, rng, 'ash', pal, 70)
}

function sceneSwamp(ctx, W, H, gy, pal, rng, seed, pan, k) {
  glowDisc(ctx, W * 0.74, gy * 0.26, 11 * k, '#f2eaff', '#b9a6dc', 0.9)
  ctx.save()
  ctx.globalAlpha = 0.28
  palace(ctx, W * 0.34, gy * 0.42, 1.1 * k, '#e7dcff')
  ctx.scale(1, -1)
  ctx.globalAlpha = 0.1
  palace(ctx, W * 0.34, -gy * 0.42 - 2, 1.1 * k, '#e7dcff')
  ctx.restore()
  ridge(ctx, W, H, { base: gy * 0.8, amp: 20 * k, freq: 0.014, color: pal.far, fog: pal.fog, seed, dots: 30 })
  fogBand(ctx, W, gy * 0.8, 10 * k, pal.fog, 0.6)
  const wy = gy - 22 * k
  const wg = ctx.createLinearGradient(0, wy, 0, gy)
  wg.addColorStop(0, mix(pal.mid, pal.fog, 0.2))
  wg.addColorStop(1, pal.near)
  ctx.fillStyle = wg
  ctx.fillRect(0, wy, W, gy - wy)
  ctx.strokeStyle = rgba(pal.fog, 0.35)
  ctx.lineWidth = 0.5
  for (let i = 0; i < 40; i++) {
    const y = wy + rng() * (gy - wy)
    const x = rng() * W
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 6 + rng() * 16, y)
    ctx.stroke()
  }
  for (let i = 0; i < 5; i++) {
    const tx = W * (0.08 + i * 0.22) + rng() * 20
    deadTree(ctx, tx, wy + 2, (40 + rng() * 30) * k, pal.near, rng)
    ctx.save()
    ctx.globalAlpha = 0.2
    ctx.translate(0, (wy + 2) * 2)
    ctx.scale(1, -1)
    deadTree(ctx, tx, wy + 2, (40 + rng() * 30) * k * 0.5, pal.near, mulberry32(i))
    ctx.restore()
  }
  ctx.fillStyle = pal.ground
  for (let x = 0; x < W; x += 3 + rng() * 6) {
    const h = (5 + rng() * 12) * k
    ctx.beginPath()
    ctx.moveTo(x - 0.6, gy)
    ctx.quadraticCurveTo(x + 1, gy - h * 0.6, x + (rng() - 0.3) * 3, gy - h)
    ctx.lineTo(x + 0.6, gy)
    ctx.fill()
  }
  particles(ctx, W, gy, rng, 'firefly', pal, 22)
}

function sceneMirage(ctx, W, H, gy, pal, rng, seed, pan, k) {
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = rgba('#ffffff', 0.2 + rng() * 0.5)
    ctx.fillRect(rng() * W, rng() * gy * 0.6, 0.6, 0.6)
  }
  ctx.save()
  ctx.strokeStyle = rgba(pal.accent, 0.5)
  ctx.lineWidth = 1.2
  ctx.shadowColor = pal.accent
  ctx.shadowBlur = 10 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
  ctx.beginPath()
  ctx.arc(W * 0.62, gy * 0.36, 26 * k, 0, TAU)
  ctx.stroke()
  ctx.restore()
  const horizon = ctx.createRadialGradient(W * 0.5, gy * 0.95, 0, W * 0.5, gy * 0.95, W * 0.62)
  horizon.addColorStop(0, rgba('#e7c9ff', 0.75))
  horizon.addColorStop(0.45, rgba('#b58ad8', 0.35))
  horizon.addColorStop(1, rgba('#b58ad8', 0))
  ctx.fillStyle = horizon
  ctx.fillRect(0, 0, W, gy)
  ridge(ctx, W, H, { base: gy * 0.86, amp: 14 * k, freq: 0.01, color: pal.far, fog: pal.fog, seed, fade: 0.6 })
  cloudBank(ctx, W, gy * 0.84, rgba('#c4a6e6', 0.45), rng, 18 * k)
  const isles = [
    [0.16, 0.3, 46, true],
    [0.44, 0.18, 30, false],
    [0.86, 0.34, 54, true],
    [0.64, 0.56, 24, false],
  ]
  for (const [ix, iy, iw, pav] of isles) {
    const x = W * ix
    const y = gy * iy
    if (pav) palace(ctx, x, y, 0.42 * k * (iw / 46), pal.near)
    island(ctx, x, y, iw * k, pal.near, pal.accent, rng)
  }
  ctx.save()
  ctx.translate(W * 0.34, gy * 0.12)
  ctx.scale(1, -1)
  palace(ctx, 0, 0, 0.36 * k, mix(pal.near, pal.mid, 0.4))
  ctx.restore()
  for (let i = 0; i < 7; i++) {
    const x = rng() * W
    const y = gy * (0.3 + rng() * 0.5)
    const s = (3 + rng() * 5) * k
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((rng() - 0.5) * 1.2)
    const g = ctx.createLinearGradient(-s, -s, s, s)
    g.addColorStop(0, rgba('#ffffff', 0.7))
    g.addColorStop(1, rgba(pal.fog, 0.15))
    ctx.fillStyle = g
    ctx.fillRect(-s * 0.4, -s, s * 0.8, s * 2)
    ctx.strokeStyle = rgba(pal.accent, 0.6)
    ctx.lineWidth = 0.3
    ctx.strokeRect(-s * 0.4, -s, s * 0.8, s * 2)
    ctx.restore()
  }
  cloudBank(ctx, W, gy - 4 * k, rgba('#d9c2f2', 0.6), rng, 12 * k)
  particles(ctx, W, gy, rng, 'gold', pal, 50)
}

export { glowDot }
