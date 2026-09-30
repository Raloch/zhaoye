import { MOVES, type MoveId, totalFrames } from './core/moves'
import { drawHeroPose } from './render/rig/hero'
import {
  movePose,
  PLUNGE_FALL,
  PLUNGE_LAND,
  POSES,
  runPose,
  STANCE,
  walkPose,
} from './render/rig/heroPoses'
import type { Pose } from './render/rig/skeleton'

/**
 * 姿势实验室（仅开发）：把每个招式的预备、出招、收势放大排成一张表，调姿势时对着看。
 * 打开 http://localhost:5174/lab.html
 */

type Cell = { label: string; pose: Pose; air?: boolean }

const rows: Cell[][] = []
rows.push([
  { label: '站姿', pose: STANCE },
  { label: '走 0', pose: walkPose(0) },
  { label: '走 ½π', pose: walkPose(Math.PI / 2) },
  { label: '跑 0', pose: runPose(0) },
  { label: '跑 ½π', pose: runPose(Math.PI / 2) },
  { label: '格挡', pose: POSES.guard },
  { label: '蓄力', pose: POSES.charge },
  { label: '闪步', pose: POSES.dashFwd },
])
rows.push([
  { label: '起跳', pose: POSES.jumpUp, air: true },
  { label: '下落', pose: POSES.fall, air: true },
  { label: '落地', pose: POSES.land },
  { label: '受击', pose: POSES.hurt },
  { label: '坠星·下冲', pose: PLUNGE_FALL, air: true },
  { label: '坠星·落地', pose: PLUNGE_LAND },
  { label: '照夜', pose: POSES.light },
  { label: '单膝', pose: POSES.kneel },
])

const MOVES_SHOWN: MoveId[] = [
  'n1',
  'n2',
  'n3',
  'n4',
  'charge',
  'launcher',
  'sweep',
  'dashSlash',
  'a1',
  'a2',
  'a3',
  'pierce',
  'wave',
  'rising',
  'quake',
  'counter',
]
for (let i = 0; i < MOVES_SHOWN.length; i += 2) {
  const row: Cell[] = []
  for (const id of MOVES_SHOWN.slice(i, i + 2)) {
    const m = MOVES[id]
    const s = m.startup
    const a = m.startup + m.active
    const frames = [
      Math.max(1, s - 1),
      a - 1,
      a + Math.round(m.recovery * 0.35),
      Math.round(totalFrames(m) * 0.9),
    ]
    const names = ['预备', '出招', '收势', '回站']
    frames.forEach((f, k) => {
      row.push({
        label: `${m.name} ${names[k]}`,
        pose: movePose(m, f, STANCE),
        air: m.air || id === 'rising',
      })
    })
  }
  rows.push(row)
}

const cellW = 150
const cellH = 150
const scale = 2.6
const cv = document.getElementById('lab') as HTMLCanvasElement
const dpr = window.devicePixelRatio || 1
cv.width = cellW * 8 * dpr
cv.height = cellH * rows.length * dpr
cv.style.width = `${cellW * 8}px`
cv.style.height = `${cellH * rows.length}px`
const ctx = cv.getContext('2d') as CanvasRenderingContext2D
rows.forEach((row, r) => {
  row.forEach((cell, c) => {
    const x0 = c * cellW
    const y0 = r * cellH
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const g = ctx.createLinearGradient(0, y0, 0, y0 + cellH)
    g.addColorStop(0, '#f4d3a0')
    g.addColorStop(1, '#e2825e')
    ctx.fillStyle = g
    ctx.fillRect(x0 + 1, y0 + 1, cellW - 2, cellH - 2)
    ctx.fillStyle = '#14100f'
    ctx.fillRect(x0 + 1, y0 + cellH - 22, cellW - 2, 21)
    ctx.fillStyle = '#e8e5dc'
    ctx.fillText(cell.label, x0 + 6, y0 + cellH - 8)
    ctx.setTransform(
      dpr * scale,
      0,
      0,
      dpr * scale,
      (x0 + cellW / 2) * dpr,
      (y0 + cellH - 22) * dpr,
    )
    drawHeroPose(ctx, cell.pose, 0, cell.air ? -8 : 0, 1, '#ffd2a0', cell.air)
  })
})
