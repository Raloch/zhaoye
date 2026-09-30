import type { Enemy, GameState } from '../core/state'
import { capsule, circle, ellipse, glow, lerp, poly, withAlpha } from './draw'
import { C } from './theme'

/**
 * 木桩和飞行道具。叶昭、灰狼、狼卫的剪影在 rig/ 里（骨骼 + 关键帧动画）。
 */

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  x: number,
  y: number,
  t: number,
  flash: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  if (e.state === 'spawn') ctx.globalAlpha = Math.min(1, e.stateFrame / 24)
  ctx.scale(e.facing, 1)
  drawDummy(ctx, e, t, flash)
  ctx.restore()
}

function drawDummy(ctx: CanvasRenderingContext2D, e: Enemy, t: number, flash: number): void {
  const wob = e.sinceHit < 40 ? Math.sin(e.sinceHit * 0.7) * (1 - e.sinceHit / 40) * 14 : 0
  let rot = wob
  if (e.state === 'air') rot = e.vy * 8
  if (e.state === 'down') rot = -80
  if (e.state === 'getup') rot = lerp(-80, 0, e.stateFrame / 16)
  ctx.save()
  ctx.rotate((rot * Math.PI) / 180)
  const wood = flash > 0 ? '#ffffff' : C.wood
  ctx.fillStyle = wood
  capsule(ctx, { x: 0, y: 0 }, { x: 0, y: -36 }, 2.4, 2.2)
  capsule(ctx, { x: -11, y: -30 }, { x: 11, y: -30 }, 1.6, 1.6)
  ctx.fillStyle = flash > 0 ? '#ffffff' : C.straw
  ellipse(ctx, { x: 0, y: -41 }, 5.4, 6)
  ellipse(ctx, { x: 0, y: -22 }, 5, 8)
  ctx.fillStyle = flash > 0 ? '#ffffff' : C.seal
  circle(ctx, { x: 0, y: -22 }, 2.2)
  ctx.restore()
  void t
}

// ───────────────────────── 飞行道具 ─────────────────────────

export function drawProjectiles(ctx: CanvasRenderingContext2D, s: GameState, t: number): void {
  for (const pr of s.projectiles) {
    const dir = Math.sign(pr.vx) || 1
    ctx.save()
    ctx.translate(pr.x, pr.y)
    ctx.scale(dir, 1)
    if (pr.kind === 'wave') {
      glow(ctx, C.bladeGlow, 10)
      ctx.fillStyle = withAlpha('#e8fdff', 0.95)
      ctx.beginPath()
      ctx.arc(-6, 0, 16, -Math.PI / 2.3, Math.PI / 2.3)
      ctx.arc(-11, 0, 13, Math.PI / 2.6, -Math.PI / 2.6, true)
      ctx.closePath()
      ctx.fill()
    } else {
      glow(ctx, C.bladeGlow, 8)
      ctx.fillStyle = withAlpha('#c9fbff', 0.8)
      const h = 10 + Math.sin(t * 0.9) * 2
      poly(ctx, [
        { x: -8, y: 10 },
        { x: -2, y: 10 - h },
        { x: 4, y: 10 - h * 0.7 },
        { x: 9, y: 10 },
      ])
    }
    ctx.restore()
  }
}
