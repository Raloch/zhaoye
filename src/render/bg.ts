import { VIEW_H, VIEW_W } from '../core/config'
import type { Level } from '../core/level'
import { mulberry32 } from '../core/rng'
import { C, rgba } from './theme'

/**
 * 背景：天空 + 三层视差（远山、中景屋檐、近景屋檐）。
 * 每层在尺寸变化时预渲染成离屏画布，运行时只做平移贴图。
 * M1 只要「能看清剪影、有纵深感」，完整的水墨场景在 M2 从 concept/ 移植。
 */

type Layer = { canvas: HTMLCanvasElement; factor: number; width: number }

export type Background = {
  resize(scale: number): void
  draw(ctx: CanvasRenderingContext2D, cameraX: number): void
}

function noise1D(seed: number): (x: number) => number {
  const r = mulberry32(seed)
  const v = Array.from({ length: 512 }, () => r())
  return (x) => {
    const i = Math.floor(x)
    const f = x - i
    const a = v[((i % 512) + 512) % 512] ?? 0
    const b = v[(((i + 1) % 512) + 512) % 512] ?? 0
    const u = f * f * (3 - 2 * f)
    return a + (b - a) * u
  }
}

function fbm(n: (x: number) => number, x: number): number {
  let s = 0
  let amp = 0.5
  let fr = 1
  let norm = 0
  for (let i = 0; i < 5; i++) {
    s += amp * n(x * fr + i * 17.3)
    norm += amp
    amp *= 0.5
    fr *= 2.03
  }
  return s / norm
}

function roof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const ov = w * 0.16
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
}

function makeLayer(
  level: Level,
  factor: number,
  scale: number,
  paint: (ctx: CanvasRenderingContext2D, w: number) => void,
): Layer {
  const width = Math.ceil(VIEW_W + (level.width - VIEW_W) * factor + 8)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(VIEW_H * scale)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    paint(ctx, width)
  }
  return { canvas, factor, width }
}

export function createBackground(level: Level): Background {
  let layers: Layer[] = []
  let sky: HTMLCanvasElement | null = null
  const gy = level.floorY

  function resize(scale: number): void {
    sky = document.createElement('canvas')
    sky.width = Math.ceil(VIEW_W * scale)
    sky.height = Math.ceil(VIEW_H * scale)
    const sctx = sky.getContext('2d')
    if (sctx) {
      sctx.setTransform(scale, 0, 0, scale, 0, 0)
      const g = sctx.createLinearGradient(0, 0, 0, gy)
      g.addColorStop(0, C.sky0)
      g.addColorStop(1, C.sky1)
      sctx.fillStyle = g
      sctx.fillRect(0, 0, VIEW_W, VIEW_H)
      const sun = sctx.createRadialGradient(
        VIEW_W * 0.66,
        gy * 0.58,
        0,
        VIEW_W * 0.66,
        gy * 0.58,
        44,
      )
      sun.addColorStop(0, rgba('#fff0cf', 0.95))
      sun.addColorStop(0.36, rgba('#fff0cf', 0.9))
      sun.addColorStop(0.42, rgba('#ff9a5a', 0.35))
      sun.addColorStop(1, rgba('#ff9a5a', 0))
      sctx.fillStyle = sun
      sctx.fillRect(0, 0, VIEW_W, VIEW_H)
    }

    const far = makeLayer(level, 0.1, scale, (ctx, w) => {
      const n = noise1D(11)
      const base = gy * 0.8
      const g = ctx.createLinearGradient(0, base - 40, 0, base + 30)
      g.addColorStop(0, C.far)
      g.addColorStop(1, C.fog)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, VIEW_H)
      for (let x = 0; x <= w; x += 2) ctx.lineTo(x, base - 38 * fbm(n, x * 0.012))
      ctx.lineTo(w, VIEW_H)
      ctx.fill()
    })

    const mid = makeLayer(level, 0.3, scale, (ctx, w) => {
      const n = noise1D(12)
      const base = gy * 0.9
      const g = ctx.createLinearGradient(0, base - 22, 0, base + 16)
      g.addColorStop(0, C.mid)
      g.addColorStop(1, rgba(C.fog, 0.6))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, VIEW_H)
      for (let x = 0; x <= w; x += 2) ctx.lineTo(x, base - 20 * fbm(n, x * 0.02))
      ctx.lineTo(w, VIEW_H)
      ctx.fill()
      const rng = mulberry32(5)
      ctx.fillStyle = rgba(C.near, 0.75)
      let x = -10
      while (x < w) {
        const hw = 18 + rng() * 22
        const hh = 8 + rng() * 10
        ctx.fillRect(x, gy - 6 - hh, hw, hh + 8)
        roof(ctx, x, gy - 6 - hh, hw, hh * 0.55)
        x += hw + 6 + rng() * 12
      }
      const glow = ctx.createLinearGradient(0, gy - 40, 0, gy)
      glow.addColorStop(0, rgba(C.fire, 0))
      glow.addColorStop(1, rgba(C.fire, 0.35))
      ctx.fillStyle = glow
      ctx.fillRect(0, gy - 40, w, 40)
    })

    const near = makeLayer(level, 0.6, scale, (ctx, w) => {
      const rng = mulberry32(8)
      ctx.fillStyle = C.near
      let x = -20
      while (x < w) {
        const hw = 28 + rng() * 18
        const hh = 14 + rng() * 10
        ctx.fillRect(x, gy - hh, hw, hh)
        roof(ctx, x, gy - hh, hw, hh * 0.55)
        if (rng() < 0.6) {
          ctx.fillStyle = rgba('#ffb060', 0.85)
          ctx.fillRect(x + hw * 0.25, gy - hh * 0.7, hw * 0.14, hh * 0.3)
          ctx.fillStyle = C.near
        }
        x += hw + 30 + rng() * 50
      }
    })
    layers = [far, mid, near]
  }

  function draw(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (sky) ctx.drawImage(sky, 0, 0, VIEW_W, VIEW_H)
    for (const l of layers) {
      ctx.drawImage(l.canvas, -cameraX * l.factor, 0, l.width, VIEW_H)
    }
  }

  return { resize, draw }
}
