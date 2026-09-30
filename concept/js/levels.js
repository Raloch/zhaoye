// 第 1 章灰盒（ASCII 图块）、五章节奏数据、世界地图。

import { fbm, makeNoise1D, mulberry32, rgba, TAU } from './util.js'

export const TILE = 16
export const ROWS = 17
export const COLS_PER_SCREEN = 30

// 每屏只写底部若干行，顶部自动补空行；每行不足 30 列自动补「.」。
const CH1_SCREENS = [
  [
    '.....!........!.......!..t....',
    '.................#############',
    '..P..............#############',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '......!.......................',
    '########......................',
    '########..........w...........',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '...............!..............',
    '...$..........................',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '.......====...........====....',
    '..............................',
    '...$.....^^^^....$.....^^^^...',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '...........======.............',
    '..............................',
    '..............................',
    '.N....^^^...........$...^^^^^.',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '...........========...........',
    '..............................',
    '..............................',
    '..............................',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '.......................=======',
    '..............................',
    '...............=======....f...',
    '..............................',
    '........======...........f....',
    '..............................',
    '..======......................',
    '..............................',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '........?.....................',
    '......=====...................',
    '..............................',
    '=====........======...........',
    '..............................',
    '.....................=====....',
    '.................f............',
    '..........................====',
    '..............................',
    '..............................',
    '..............................',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '........................D.....',
    '........................D.....',
    '..C......N.....!........D.....',
    '##############################',
    '##############################',
    '##############################',
  ],
  [
    '....##..................##....',
    '....##.......B..........##....',
    '##############################',
    '##############################',
    '##############################',
  ],
]

export const CH1 = {
  rows: buildRows(CH1_SCREENS),
  sections: [
    { name: '1-1 镇外山道', from: 0, to: 60, kind: 'push' },
    { name: '1-2 镇口牌坊', from: 60, to: 90, kind: 'arena' },
    { name: '1-3 集市长街', from: 90, to: 180, kind: 'push' },
    { name: '1-4 屋顶', from: 180, to: 240, kind: 'plat' },
    { name: '1-5 祠前', from: 240, to: 270, kind: 'story' },
    { name: '1-6 镇祠广场', from: 270, to: 300, kind: 'boss' },
  ],
  arenas: [
    { cols: [60, 90], label: '锁屏战：3 狼 → 2 狼 + 狼卫' },
    { cols: [150, 180], label: '锁屏战：(2 狼 + 鬼火) × 2' },
    { cols: [270, 300], label: 'Boss：黑鬃' },
  ],
  hints: ['A/D 移动', 'K 跳', 'J 攻击', 'L 格挡', '断岳 / 蓄力斩 破防', '←→J 穿云刺破门'],
}

function buildRows(screens) {
  const rows = Array.from({ length: ROWS }, () => '')
  for (const scr of screens) {
    const lines = scr.map((l) => l.padEnd(COLS_PER_SCREEN, '.').slice(0, COLS_PER_SCREEN))
    const pad = ROWS - lines.length
    for (let r = 0; r < ROWS; r++) {
      rows[r] += r < pad ? '.'.repeat(COLS_PER_SCREEN) : lines[r - pad]
    }
  }
  return rows
}

const GLYPH = {
  w: '狼',
  g: '卫',
  f: '火',
  t: '桩',
  B: '鬃',
  N: '人',
}

/** 灰盒：图块 + 实体图标 + 锁屏范围 + 段落标签。颜色从页面主题取。 */
export function drawGreybox(ctx, level, theme) {
  const cols = level.rows[0].length
  const W = cols * TILE
  const top = 34
  const H = ROWS * TILE
  ctx.fillStyle = theme.panel
  ctx.fillRect(0, 0, W, H + top)
  ctx.save()
  ctx.translate(0, top)
  ctx.strokeStyle = rgba(theme.inkHex, 0.07)
  ctx.lineWidth = 0.6
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath()
    ctx.moveTo(x * TILE, 0)
    ctx.lineTo(x * TILE, H)
    ctx.stroke()
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * TILE)
    ctx.lineTo(W, y * TILE)
    ctx.stroke()
  }
  for (const a of level.arenas) {
    ctx.fillStyle = rgba(theme.sealHex, 0.1)
    ctx.fillRect(a.cols[0] * TILE, 0, (a.cols[1] - a.cols[0]) * TILE, H)
    ctx.strokeStyle = rgba(theme.sealHex, 0.7)
    ctx.lineWidth = 2
    for (const cx of a.cols) {
      ctx.beginPath()
      ctx.moveTo(cx * TILE, 0)
      ctx.lineTo(cx * TILE, H)
      ctx.stroke()
    }
    ctx.fillStyle = theme.seal
    ctx.font = `600 14px ${theme.body}`
    ctx.fillText(a.label, a.cols[0] * TILE + 8, 22)
  }
  let hint = 0
  for (let r = 0; r < ROWS; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const ch = level.rows[r][cIdx]
      const x = cIdx * TILE
      const y = r * TILE
      if (ch === '#') {
        ctx.fillStyle = theme.ink
        ctx.fillRect(x, y, TILE, TILE)
        const above = r > 0 ? level.rows[r - 1][cIdx] : '.'
        if (above !== '#') {
          ctx.fillStyle = rgba(theme.panelHex, 0.28)
          ctx.fillRect(x, y, TILE, 2)
        }
      } else if (ch === '=') {
        ctx.fillStyle = theme.wood
        ctx.fillRect(x, y, TILE, 5)
        ctx.fillStyle = rgba(theme.inkHex, 0.35)
        ctx.fillRect(x + TILE - 1, y, 1, 5)
      } else if (ch === '^') {
        ctx.fillStyle = theme.fire
        ctx.beginPath()
        ctx.moveTo(x + 1, y + TILE)
        ctx.lineTo(x + 5, y + 5)
        ctx.lineTo(x + 8, y + 10)
        ctx.lineTo(x + 11, y + 3)
        ctx.lineTo(x + TILE - 1, y + TILE)
        ctx.fill()
      } else if (ch === 'D') {
        ctx.fillStyle = theme.wood
        ctx.fillRect(x + 3, y, TILE - 6, TILE)
        ctx.strokeStyle = theme.ink
        ctx.lineWidth = 1
        ctx.strokeRect(x + 3.5, y + 0.5, TILE - 7, TILE - 1)
      } else if (ch === '$') {
        ctx.fillStyle = theme.muted
        ctx.beginPath()
        ctx.ellipse(x + 8, y + 10, 5, 6, 0, 0, TAU)
        ctx.fill()
        ctx.fillRect(x + 5, y + 2, 6, 3)
      } else if (ch === '?') {
        ctx.fillStyle = theme.gold
        ctx.fillRect(x + 2, y + 4, 12, 9)
        ctx.fillStyle = theme.ink
        ctx.font = `700 8px ${theme.body}`
        ctx.fillText('谱', x + 4, y + 11.5)
      } else if (ch === 'C') {
        ctx.fillStyle = theme.seal
        ctx.beginPath()
        ctx.ellipse(x + 8, y + 8, 5, 6.5, 0, 0, TAU)
        ctx.fill()
        ctx.fillStyle = theme.ink
        ctx.fillRect(x + 7.4, y - 6, 1.2, 8)
        ctx.fillRect(x + 7.4, y + 14, 1.2, 2)
      } else if (ch === 'P') {
        ctx.fillStyle = theme.teal
        ctx.fillRect(x + 4, y - 10, 1.6, 26)
        ctx.beginPath()
        ctx.moveTo(x + 5.6, y - 10)
        ctx.lineTo(x + 16, y - 6)
        ctx.lineTo(x + 5.6, y - 2)
        ctx.fill()
      } else if (ch === '!') {
        const text = level.hints[hint++] ?? ''
        ctx.font = `600 12px ${theme.body}`
        const tw = ctx.measureText(text).width + 12
        ctx.fillStyle = theme.teal
        ctx.beginPath()
        ctx.roundRect(x - 2, y - 6, tw, 19, 3)
        ctx.fill()
        ctx.fillStyle = theme.panel
        ctx.fillText(text, x + 4, y + 8)
      } else if (GLYPH[ch]) {
        const big = ch === 'B'
        const rr = big ? 15 : 8
        const cx = x + 8
        const cy = y + 16 - rr
        ctx.fillStyle = ch === 't' || ch === 'N' ? theme.muted : theme.seal
        ctx.beginPath()
        ctx.arc(cx, cy, rr, 0, TAU)
        ctx.fill()
        ctx.fillStyle = theme.panel
        ctx.font = `700 ${big ? 17 : 10}px ${theme.body}`
        ctx.textAlign = 'center'
        ctx.fillText(GLYPH[ch], cx, cy + (big ? 6 : 3.6))
        ctx.textAlign = 'left'
      }
    }
  }
  ctx.restore()
  for (let s = 0; s * COLS_PER_SCREEN < cols; s++) {
    const x = s * COLS_PER_SCREEN * TILE
    ctx.strokeStyle = rgba(theme.inkHex, 0.35)
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, top + H)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = theme.muted
    ctx.font = `500 12px ${theme.body}`
    ctx.fillStyle = rgba(theme.panelHex, 0.85)
    ctx.fillText(`第 ${s + 1} 屏`, x + 6, top + H - 8)
  }
  for (const sec of level.sections) {
    const x0 = sec.from * TILE
    const x1 = sec.to * TILE
    ctx.fillStyle = theme.ink
    ctx.fillRect(x0 + 2, 8, x1 - x0 - 4, 2)
    ctx.font = `700 15px ${theme.body}`
    ctx.fillText(sec.name, x0 + 4, 28)
  }
  return { W, H: H + top }
}

// ───────────────────────── 节奏条 ─────────────────────────

export const PACING = [
  {
    ch: '第一章 青崖镇',
    segs: [
      ['山道', 2, 'push', 1],
      ['牌坊', 1, 'arena', 3],
      ['集市', 2, 'push', 2],
      ['锁屏', 1, 'arena', 3],
      ['屋顶', 2, 'plat', 2],
      ['祠前', 1, 'story', 1],
      ['黑鬃', 1, 'boss', 5],
    ],
  },
  {
    ch: '第二章 雾隐竹林',
    segs: [
      ['入口', 2, 'push', 1],
      ['竹海', 4, 'plat', 2],
      ['溪谷', 1, 'arena', 4],
      ['雾径', 4, 'plat', 2],
      ['祭坛', 1, 'arena', 3],
      ['姥姥', 1, 'boss', 5],
    ],
  },
  {
    ch: '第三章 断岳山',
    segs: [
      ['栈道', 3, 'push', 2],
      ['吊桥', 2, 'arena', 3],
      ['碑林', 3, 'arena', 4],
      ['洞窟', 4, 'plat', 2],
      ['镇岳', 1, 'boss', 5],
      ['回忆', 1, 'story', 4],
    ],
  },
  {
    ch: '第四章 幽泽',
    segs: [
      ['泽边', 3, 'push', 2],
      ['村落', 2, 'peace', 0],
      ['迷径', 6, 'plat', 3],
      ['关前', 1, 'arena', 4],
      ['骨刹', 2, 'boss', 5],
    ],
  },
  {
    ch: '第五章 蜃楼幻宫',
    segs: [
      ['宫门', 2, 'arena', 4],
      ['镜廊', 4, 'plat', 3],
      ['倒悬殿', 3, 'plat', 2],
      ['镜狱', 1, 'story', 1],
      ['蜃楼', 2, 'boss', 5],
      ['蜃龙', 2, 'boss', 5],
    ],
  },
]

export const PACE_KIND = {
  push: '推进',
  arena: '锁屏战',
  plat: '平台 / 解谜',
  peace: '和平区',
  story: '剧情',
  boss: 'Boss',
}

// ───────────────────────── 世界地图 ─────────────────────────

export function drawWorldMap(ctx, W, H, theme) {
  const rng = mulberry32(77)
  ctx.fillStyle = theme.panel
  ctx.fillRect(0, 0, W, H)
  const layers = [
    { base: H * 0.62, amp: 38, freq: 0.018, a: 0.16, seed: 3 },
    { base: H * 0.76, amp: 28, freq: 0.026, a: 0.24, seed: 4 },
    { base: H * 0.92, amp: 18, freq: 0.04, a: 0.32, seed: 5 },
  ]
  for (const l of layers) {
    const noise = makeNoise1D(l.seed)
    const g = ctx.createLinearGradient(0, l.base - l.amp, 0, l.base + 10)
    g.addColorStop(0, rgba(theme.inkHex, l.a))
    g.addColorStop(1, rgba(theme.inkHex, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 2) ctx.lineTo(x, l.base - l.amp * fbm(noise, x * l.freq, 5))
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = rgba(theme.tealHex, 0.5)
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(0, H * 0.9)
  ctx.bezierCurveTo(W * 0.2, H * 0.8, W * 0.3, H * 0.98, W * 0.5, H * 0.88)
  ctx.bezierCurveTo(W * 0.7, H * 0.8, W * 0.8, H * 0.96, W, H * 0.86)
  ctx.stroke()
  const nodes = [
    { x: 0.1, y: 0.66, name: '青崖镇', ch: '一' },
    { x: 0.3, y: 0.58, name: '雾隐竹林', ch: '二' },
    { x: 0.52, y: 0.4, name: '断岳山', ch: '三' },
    { x: 0.73, y: 0.66, name: '幽泽', ch: '四' },
    { x: 0.86, y: 0.2, name: '蜃楼幻宫', ch: '五' },
  ]
  ctx.strokeStyle = theme.seal
  ctx.lineWidth = 1.4
  ctx.setLineDash([3, 4])
  ctx.beginPath()
  nodes.forEach((n, i) => {
    const x = n.x * W
    const y = n.y * H
    if (i === 0) ctx.moveTo(x, y)
    else {
      const p = nodes[i - 1]
      ctx.quadraticCurveTo((p.x * W + x) / 2, Math.min(p.y, n.y) * H - 18, x, y)
    }
  })
  ctx.stroke()
  ctx.setLineDash([])
  const stele = { x: 0.52 * W, y: 0.4 * H }
  ctx.fillStyle = theme.ink
  ctx.fillRect(stele.x - 2.5, stele.y - 26, 5, 16)
  ctx.beginPath()
  ctx.arc(stele.x, stele.y - 26, 2.5, Math.PI, 0)
  ctx.fill()
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.fillStyle = theme.ink
  const px = 0.86 * W
  const py = 0.2 * H - 16
  ctx.fillRect(px - 16, py, 32, 3)
  ctx.fillRect(px - 10, py - 7, 20, 7)
  ctx.beginPath()
  ctx.moveTo(px - 15, py - 7)
  ctx.lineTo(px, py - 14)
  ctx.lineTo(px + 15, py - 7)
  ctx.fill()
  ctx.restore()
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rgba(theme.inkHex, 0.18)
    ctx.beginPath()
    ctx.arc(rng() * W, H * (0.5 + rng() * 0.4), 0.6 + rng(), 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = rgba(theme.inkHex, 0.5)
  ctx.font = `500 9px ${theme.body}`
  ctx.fillText('青崖观', 0.06 * W, 0.4 * H)
  ctx.fillRect(0.1 * W - 0.5, 0.43 * H, 1, 0.16 * H)
  ctx.fillText('镇魔碑', stele.x + 6, stele.y - 16)
  ctx.fillText('九幽 · 烛幽', stele.x - 20, H * 0.97)
  for (const n of nodes) {
    const x = n.x * W
    const y = n.y * H
    ctx.fillStyle = theme.seal
    ctx.beginPath()
    ctx.roundRect(x - 8, y - 8, 16, 16, 2)
    ctx.fill()
    ctx.fillStyle = theme.panel
    ctx.font = `400 12px ${theme.display}`
    ctx.textAlign = 'center'
    ctx.fillText(n.ch, x, y + 4.5)
    ctx.fillStyle = theme.ink
    ctx.font = `400 15px ${theme.display}`
    ctx.fillText(n.name, x, y + 26)
    ctx.textAlign = 'left'
  }
}
