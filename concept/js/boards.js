// 设定集里的每一幅画：目标画面、章节场景、角色、怪物、Boss、体型对比。

import * as B from './beasts.js'
import { hero, HERO_POSES, heroTrail } from './cast.js'
import { drawFigure, impactRing, inkSplash, slashArc } from './figure.js'
import * as H from './people.js'
import { paintScene } from './scenes.js'
import { mulberry32, TAU } from './util.js'

export const COLORS = {
  hero: { accent: '#3fd0c9' },
  xuanyi: { accent: '#c9a55a', pale: '#d8d2c2' },
  bat: { accent: '#e0a94a' },
  xuanshuang: { accent: '#9fd8ff', hair: '#8fa3c4' },
  shenlou: { accent2: '#f3c86b', mist: '#b36bff', fanFace: '#3d2466' },
  gusha: { accent: '#6b4a3a', eye: '#b36bff', socket: '#05060a' },
  wolf: { eye: '#ff4a3d' },
  wolfGuard: { eye: '#ff4a3d', accent: '#7a3b2e' },
  heizong: { eye: '#b36bff', fang: '#f2ecff' },
  skeleton: { eye: '#ff4a3d', socket: '#05060a', string: '#c8c0b0' },
  golem: { eye: '#ff4a2a', accent: '#ff4a2a' },
  treant: { eye: '#9be38a', hole: '#050806' },
  moth: { accent: '#c9e04a' },
  frog: { eye: '#e6d45a', mouth: '#5a4a6a' },
  phantom: { near: '#7a52c0', far: '#523a90', accent: '#c07bff', eye: '#f0e0ff' },
  phantomReal: { accent: '#c07bff', eye: '#c07bff' },
  mirror: { shardLight: '#dfe9ff', shardMid: '#9fb1d6', shardDark: '#5c6a8f', edge: '#1a1f2e' },
  zhenyue: { near: '#24272e', far: '#393d46', accent: '#ff4a2a', eye: '#ff7a3a' },
  vineHag: { eye: '#c07bff', hole: '#050308', core: '#b36bff' },
  dragon: { near: '#161225', far: '#2d2345', eye: '#f3c86b', accent2: '#f3c86b', mist: '#b36bff' },
}

const heroFig = (pose, extra = {}) => ({ fn: hero(HERO_POSES[pose]), colors: COLORS.hero, ...extra })

function put(ctx, pal, f) {
  drawFigure(ctx, f.fn, {
    x: f.x,
    y: f.y,
    scale: f.scale ?? 1,
    facing: f.facing ?? 1,
    rotate: f.rotate,
    colors: f.colors,
    rim: f.rim ?? pal.rim,
    rimWidth: f.rimWidth,
    alpha: f.alpha,
    shadowGlow: f.glow,
    shadowBlur: f.glowBlur,
  })
}

function trail(ctx, poseName, x, y, s = 1, color = '#c9fbff', alpha = 0.85) {
  const t = heroTrail(HERO_POSES[poseName])
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  slashArc(ctx, t.center, t.r0, t.r1, t.a0, t.a1, color, alpha)
  ctx.restore()
}

function shadow(ctx, x, y, w, a = 0.35) {
  ctx.fillStyle = `rgba(0,0,0,${a})`
  ctx.beginPath()
  ctx.ellipse(x, y + 0.5, w, w * 0.18, 0, 0, TAU)
  ctx.fill()
}

// ───────────────────────── 目标画面 ─────────────────────────

export function targetFrame(ctx, fonts) {
  const W = 480
  const Hh = 270
  const gy = 226
  const pal = paintScene(ctx, W, Hh, 1, { gy, seed: 11, pan: 40 })
  const rng = mulberry32(9)
  put(ctx, pal, { fn: H.wolfGuard(), colors: COLORS.wolfGuard, x: 402, y: gy, facing: -1 })
  put(ctx, pal, { fn: B.wolf('stalk'), colors: COLORS.wolf, x: 88, y: gy })
  put(ctx, pal, {
    fn: B.wolf('stalk'),
    colors: COLORS.wolf,
    x: 322,
    y: gy,
    facing: -1,
    rim: '#ffffff',
    rimWidth: 1.6,
    glow: 'rgba(255,255,255,0.9)',
    glowBlur: 6,
  })
  drawFigure(ctx, B.wisp(), { x: 404, y: 126, scale: 1.1 })
  trail(ctx, 'rise', 196, gy, 1.12)
  put(ctx, pal, heroFig('rise', { x: 196, y: gy, scale: 1.12 }))
  put(ctx, pal, { fn: B.wolf('lunge'), colors: COLORS.wolf, x: 252, y: 178, rotate: -38 })
  inkSplash(ctx, 236, 164, 16, rng, '#101217', 18)
  impactRing(ctx, 236, 164, 11, 'rgba(210,250,255,0.9)', 0.9, rng)
  shadow(ctx, 196, gy, 12)
  shadow(ctx, 244, gy, 10, 0.2)
  drawHud(ctx, W, Hh, fonts)
}

function drawHud(ctx, W, Hh, f) {
  ctx.save()
  const plate = ctx.createLinearGradient(0, 0, 190, 0)
  plate.addColorStop(0, 'rgba(16,18,23,0.55)')
  plate.addColorStop(1, 'rgba(16,18,23,0)')
  ctx.fillStyle = plate
  ctx.fillRect(0, 0, 190, 44)
  ctx.fillStyle = '#c8372d'
  ctx.beginPath()
  ctx.roundRect(12, 11, 22, 22, 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243,236,220,0.7)'
  ctx.lineWidth = 0.6
  ctx.strokeRect(14, 13, 18, 18)
  ctx.fillStyle = '#f3ecdc'
  ctx.font = `17px ${f.display}`
  ctx.textAlign = 'center'
  ctx.fillText('昭', 23, 28.5)
  ctx.textAlign = 'left'
  const bar = (x, y, w, h, pct, color, lag = 0) => {
    ctx.fillStyle = 'rgba(16,18,23,0.62)'
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
    if (lag) {
      ctx.fillStyle = 'rgba(243,236,220,0.85)'
      ctx.fillRect(x, y, w * (pct + lag), h)
    }
    ctx.fillStyle = color
    ctx.fillRect(x, y, w * pct, h)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(x, y, w * pct, 1)
  }
  bar(40, 13, 118, 5, 0.72, '#d9483b', 0.08)
  bar(40, 22, 94, 3.6, 0.46, '#3fd0c9')
  for (let i = 0; i < 5; i++) {
    const x = 44 + i * 9
    const y = 31
    ctx.beginPath()
    ctx.moveTo(x, y - 3.4)
    ctx.lineTo(x + 3.4, y)
    ctx.lineTo(x, y + 3.4)
    ctx.lineTo(x - 3.4, y)
    ctx.closePath()
    if (i < 3) {
      ctx.fillStyle = '#f3c86b'
      ctx.fill()
    } else {
      ctx.strokeStyle = 'rgba(243,200,107,0.8)'
      ctx.lineWidth = 0.7
      ctx.fillStyle = 'rgba(16,18,23,0.5)'
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.font = `600 6px ${f.body}`
  ctx.fillStyle = 'rgba(243,236,220,0.9)'
  ctx.fillText('剑意', 90, 33.2)
  ctx.fillStyle = 'rgba(16,18,23,0.55)'
  ctx.beginPath()
  ctx.roundRect(W - 92, 10, 80, 16, 3)
  ctx.fill()
  ctx.fillStyle = '#7fe8ff'
  ctx.beginPath()
  ctx.moveTo(W - 84, 13.5)
  ctx.lineTo(W - 80.5, 18)
  ctx.lineTo(W - 84, 22.5)
  ctx.lineTo(W - 87.5, 18)
  ctx.fill()
  ctx.fillStyle = '#f3ecdc'
  ctx.font = `600 9px ${f.mono}`
  ctx.fillText('1,280', W - 76, 21.4)
  ctx.fillStyle = '#d9483b'
  ctx.beginPath()
  ctx.arc(W - 38, 18, 3.4, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#f3ecdc'
  ctx.font = `600 7px ${f.body}`
  ctx.fillText('×3', W - 33, 20.6)
  ctx.strokeStyle = 'rgba(243,236,220,0.7)'
  ctx.lineWidth = 0.6
  ctx.strokeRect(W - 22.5, 13.5, 9, 9)
  ctx.font = `700 6.5px ${f.mono}`
  ctx.fillText('I', W - 19.6, 20.2)
  ctx.textAlign = 'right'
  ctx.font = `44px ${f.display}`
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(16,18,23,0.85)'
  ctx.strokeText('12', W - 38, 102)
  ctx.fillStyle = '#f3ecdc'
  ctx.fillText('12', W - 38, 102)
  ctx.font = `14px ${f.display}`
  ctx.strokeText('连击', W - 14, 101)
  ctx.fillText('连击', W - 14, 101)
  ctx.textAlign = 'left'
  ctx.save()
  ctx.translate(W - 36, 124)
  ctx.rotate(-0.14)
  ctx.fillStyle = '#c8372d'
  ctx.fillRect(-12, -12, 24, 24)
  ctx.strokeStyle = 'rgba(243,236,220,0.8)'
  ctx.lineWidth = 0.8
  ctx.strokeRect(-10, -10, 20, 20)
  ctx.fillStyle = '#f3ecdc'
  ctx.font = `19px ${f.display}`
  ctx.textAlign = 'center'
  ctx.fillText('妙', 0, 7)
  ctx.restore()
  ctx.font = `14px ${f.display}`
  ctx.textAlign = 'center'
  ctx.lineWidth = 2.4
  ctx.strokeStyle = 'rgba(16,18,23,0.9)'
  ctx.strokeText('18', 262, 146)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('18', 262, 146)
  ctx.font = `10px ${f.display}`
  ctx.strokeText('14', 250, 128)
  ctx.fillText('14', 250, 128)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `700 8px ${f.body}`
  ctx.fillText('白光：可格挡', 294, 186)
  ctx.restore()
}

// ───────────────────────── 章节场景 ─────────────────────────

export function chapterBanner(ctx, ch) {
  const W = 480
  const Hh = 150
  const gy = 136
  const pal = paintScene(ctx, W, Hh, ch, { gy, seed: ch * 131 })
  if (ch === 1) {
    put(ctx, pal, { fn: B.wolf('stand'), colors: COLORS.wolf, x: 250, y: gy, facing: -1 })
    put(ctx, pal, { fn: B.wolf('stalk'), colors: COLORS.wolf, x: 290, y: gy, facing: -1 })
    trail(ctx, 'slam', 190, gy, 1)
    put(ctx, pal, heroFig('slam', { x: 190, y: gy }))
  } else if (ch === 2) {
    put(ctx, pal, { fn: B.treant(), colors: COLORS.treant, x: 330, y: gy, facing: -1 })
    drawFigure(ctx, B.moth(), { x: 280, y: 70, colors: COLORS.moth, rim: pal.rim })
    put(ctx, pal, { fn: B.bat(), colors: COLORS.bat, x: 118, y: gy - 6, scale: 0.9 })
    put(ctx, pal, heroFig('guard', { x: 196, y: gy }))
  } else if (ch === 3) {
    put(ctx, pal, { fn: H.golem(), colors: COLORS.golem, x: 330, y: gy, facing: -1 })
    put(ctx, pal, { fn: H.skeletonSoldier('bow'), colors: COLORS.skeleton, x: 420, y: gy, facing: -1 })
    put(ctx, pal, heroFig('run', { x: 160, y: gy }))
  } else if (ch === 4) {
    put(ctx, pal, { fn: B.frog(), colors: COLORS.frog, x: 320, y: gy, facing: -1 })
    put(ctx, pal, {
      fn: H.phantom(),
      colors: COLORS.phantom,
      x: 390,
      y: gy,
      facing: -1,
      alpha: 0.6,
      rim: '#e9d8ff',
      glow: 'rgba(192,123,255,0.8)',
      glowBlur: 6,
    })
    drawFigure(ctx, B.wisp({ core: '#f7eaff', body: '#c07bff', halo: [192, 123, 255] }), { x: 250, y: 60 })
    put(ctx, pal, heroFig('idle', { x: 190, y: gy }))
  } else {
    put(ctx, pal, { fn: H.shenlou(), colors: COLORS.shenlou, x: 380, y: gy - 30, facing: -1, scale: 0.8 })
    put(ctx, pal, { fn: H.mirrorSpirit(), colors: COLORS.mirror, x: 290, y: gy, facing: -1 })
    put(ctx, pal, heroFig('rising', { x: 190, y: gy }))
    shadow(ctx, 190, gy, 10)
  }
  return pal
}

// ───────────────────────── 主角姿势条 ─────────────────────────

export const HERO_STRIP = [
  ['idle', '待机'],
  ['run', '疾跑'],
  ['slam', '青锋·四「断岳」'],
  ['rise', '上挑'],
  ['plunge', '坠星'],
  ['rising', '升龙斩'],
]

export function heroStrip(ctx) {
  const W = 480
  const Hh = 120
  const gy = 108
  const g = ctx.createLinearGradient(0, 0, 0, Hh)
  g.addColorStop(0, '#e6e9e4')
  g.addColorStop(1, '#bcc6c0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, Hh)
  ctx.fillStyle = '#101217'
  ctx.fillRect(0, gy, W, Hh - gy)
  const s = 1.3
  HERO_STRIP.forEach(([pose], i) => {
    const x = W / 12 + (i * W) / 6 - 6
    const base = HERO_POSES[pose]
    const p = base.air ? { ...base, air: pose === 'plunge' ? 12 : 6 } : base
    if (base.trail) trail(ctx, pose, x, gy, s, '#8feaf2', 0.75)
    if (base.air) shadow(ctx, x, gy, 9, 0.3)
    drawFigure(ctx, hero(p), { x, y: gy, scale: s, colors: COLORS.hero, rim: '#ffffff', rimWidth: 0.7 })
  })
}

// ───────────────────────── 角色卡 ─────────────────────────

export const NPCS = {
  xuanyi: { ch: 2, fn: () => H.xuanyi(), colors: COLORS.xuanyi, scale: 2.1, dx: -6 },
  bat: { ch: 4, fn: () => B.bat(), colors: COLORS.bat, scale: 2.8, dx: 0, dy: -18 },
  xuanshuang: { ch: 5, fn: () => H.xuanshuang(), colors: COLORS.xuanshuang, scale: 1.85, dx: -4 },
  shenlou: { ch: 5, fn: () => H.shenlou(), colors: COLORS.shenlou, scale: 1.55, dx: -6, seed: 9 },
}

export function npcCard(ctx, id) {
  const c = NPCS[id]
  const W = 120
  const Hh = 120
  const gy = 110
  const pal = paintScene(ctx, W, Hh, c.ch, { gy, seed: c.seed ?? c.ch * 17 })
  put(ctx, pal, { fn: c.fn(), colors: c.colors, x: W / 2 + c.dx, y: gy + (c.dy ?? 0), scale: c.scale })
}

// ───────────────────────── 杂兵卡 ─────────────────────────

export const ENEMIES = [
  { id: 'wolf', ch: 1, figs: [{ fn: () => B.wolf('stalk'), colors: COLORS.wolf, x: 82, scale: 2.2 }] },
  { id: 'wisp', ch: 1, figs: [{ fn: () => B.wisp(), x: 80, y: 46, scale: 2.2, noRim: true }] },
  { id: 'wolfGuard', ch: 1, figs: [{ fn: () => H.wolfGuard(), colors: COLORS.wolfGuard, x: 80, scale: 1.55 }] },
  { id: 'treant', ch: 2, figs: [{ fn: () => B.treant(), colors: COLORS.treant, x: 80, scale: 1.7 }] },
  { id: 'moth', ch: 2, figs: [{ fn: () => B.moth(), colors: COLORS.moth, x: 80, y: 42, scale: 2.4 }] },
  {
    id: 'skeleton',
    ch: 3,
    figs: [
      { fn: () => H.skeletonSoldier('blade'), colors: COLORS.skeleton, x: 58, scale: 1.55 },
      { fn: () => H.skeletonSoldier('bow'), colors: COLORS.skeleton, x: 112, scale: 1.55 },
    ],
  },
  { id: 'golem', ch: 3, figs: [{ fn: () => H.golem(), colors: COLORS.golem, x: 76, scale: 1.25 }] },
  { id: 'frog', ch: 4, figs: [{ fn: () => B.frog(), colors: COLORS.frog, x: 80, scale: 2.0 }] },
  {
    id: 'phantom',
    ch: 4,
    figs: [
      { fn: () => H.phantom(), colors: COLORS.phantom, x: 56, scale: 1.45, alpha: 0.6, rim: '#e9d8ff', glow: 'rgba(192,123,255,0.8)' },
      { fn: () => H.phantom(), colors: COLORS.phantomReal, x: 112, scale: 1.45 },
    ],
  },
  { id: 'mirror', ch: 5, figs: [{ fn: () => H.mirrorSpirit(), colors: COLORS.mirror, x: 80, scale: 1.55 }] },
]

export function enemyCard(ctx, id) {
  const e = ENEMIES.find((v) => v.id === id)
  const W = 160
  const Hh = 100
  const gy = 90
  const pal = paintScene(ctx, W, Hh, e.ch, { gy, seed: e.ch * 57 + id.length })
  for (const f of e.figs) {
    if (f.noRim) {
      drawFigure(ctx, f.fn(), { x: f.x, y: f.y, scale: f.scale })
      continue
    }
    put(ctx, pal, { ...f, fn: f.fn(), y: f.y ?? gy, glowBlur: 6 })
  }
}

// ───────────────────────── Boss 卡 ─────────────────────────

export const BOSSES = [
  { id: 'heizong', ch: 1, fn: () => H.heizong(), colors: COLORS.heizong, x: 196, scale: 1 },
  { id: 'vineHag', ch: 2, fn: () => B.vineHag(), colors: COLORS.vineHag, x: 216, scale: 0.84 },
  { id: 'zhenyue', ch: 3, fn: () => H.zhenyue(), colors: COLORS.zhenyue, x: 238, scale: 0.8, facing: -1 },
  { id: 'gusha', ch: 4, fn: () => H.gusha(), colors: COLORS.gusha, x: 196, scale: 1.2, facing: -1 },
  { id: 'shenlou', ch: 5, fn: () => H.shenlou(), colors: COLORS.shenlou, x: 200, scale: 1.45, facing: -1 },
  { id: 'dragon', ch: 5, fn: () => B.mirageDragon(), colors: COLORS.dragon, x: 196, y: 132, scale: 1, facing: -1 },
]

export function bossCard(ctx, id) {
  const b = BOSSES.find((v) => v.id === id)
  const W = 300
  const Hh = 150
  const gy = 138
  const pal = paintScene(ctx, W, Hh, b.ch, { gy, seed: b.ch * 71 + id.length * 3 })
  put(ctx, pal, { fn: b.fn(), colors: b.colors, x: b.x, y: b.y ?? gy, scale: b.scale, facing: b.facing ?? -1 })
  put(ctx, pal, heroFig(id === 'dragon' ? 'rising' : 'idle', { x: 70, y: gy, scale: id === 'dragon' ? 0.95 : b.scale }))
}

// ───────────────────────── 体型对比 ─────────────────────────

export const LINEUP = [
  ['鬼火', () => B.wisp(), null, 16, -26],
  ['小蝠', () => B.bat(), COLORS.bat, 18, 0],
  ['灰狼', () => B.wolf('stand'), COLORS.wolf, 30, 0],
  ['蛊蛾', () => B.moth(), COLORS.moth, 20, -28],
  ['叶昭', () => hero(HERO_POSES.idle), COLORS.hero, 26, 0],
  ['骷髅兵', () => H.skeletonSoldier('blade'), COLORS.skeleton, 22, 0],
  ['狼卫', () => H.wolfGuard(), COLORS.wolfGuard, 26, 0],
  ['幻影魔兵', () => H.phantom(), COLORS.phantomReal, 26, 0],
  ['镜魅', () => H.mirrorSpirit(), COLORS.mirror, 22, 0],
  ['藤精', () => B.treant(), COLORS.treant, 24, 0],
  ['沼蛙妖', () => B.frog(), COLORS.frog, 26, 0],
  ['骨刹', () => H.gusha(), COLORS.gusha, 40, 0],
  ['蜃楼', () => H.shenlou(), COLORS.shenlou, 30, 0],
  ['石傀儡', () => H.golem(), COLORS.golem, 34, 0],
  ['黑鬃', () => H.heizong(), COLORS.heizong, 50, 0],
  ['镇岳', () => H.zhenyue(), COLORS.zhenyue, 64, 0],
  ['枯藤姥姥', () => B.vineHag(), COLORS.vineHag, 66, 0],
]

export function lineup(ctx, fonts) {
  const W = 800
  const Hh = 150
  const gy = 130
  const g = ctx.createLinearGradient(0, 0, 0, Hh)
  g.addColorStop(0, '#e3e6ea')
  g.addColorStop(1, '#b8bec8')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, Hh)
  const s = 0.64
  ctx.strokeStyle = 'rgba(16,18,23,0.22)'
  ctx.lineWidth = 0.6
  ctx.setLineDash([3, 3])
  ctx.font = `500 8px ${fonts.body}`
  ctx.fillStyle = 'rgba(16,18,23,0.55)'
  for (const m of [1, 2, 3]) {
    const y = gy - 44 * m * s
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
    ctx.fillText(`${m}× 主角身高`, 4, y - 2)
  }
  ctx.setLineDash([])
  let x = 30
  for (const [name, fn, colors, halfW, dy] of LINEUP) {
    x += halfW * s
    if (colors) {
      drawFigure(ctx, fn(), { x, y: gy + dy * s, scale: s, colors, rim: '#ffffff', rimWidth: 0.6 })
    } else {
      drawFigure(ctx, fn(), { x, y: gy + dy * s, scale: s })
    }
    ctx.fillStyle = name === '叶昭' ? '#1f8f8a' : '#101217'
    ctx.font = `600 8.5px ${fonts.body}`
    ctx.textAlign = 'center'
    ctx.fillText(name, x, gy + 13)
    ctx.textAlign = 'left'
    x += halfW * s + 4
  }
  ctx.fillStyle = '#101217'
  ctx.fillRect(0, gy, W, 1.2)
}
