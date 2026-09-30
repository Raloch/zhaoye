import { VIEW_H, VIEW_W } from '../core/config'
import { ENEMY_DEFS } from '../core/enemies'
import type { Level } from '../core/level'
import type { GameState } from '../core/state'
import { drawEnemy, drawProjectiles } from './actors'
import { type Background, createBackground } from './bg'
import { drawFrameMeter, drawHitboxes, drawTrainingInfo, type InputLog } from './debug'
import { lerp } from './draw'
import type { Fx } from './fx'
import { drawHud } from './hud'
import { EnemyArt } from './rig/enemies'
import { HeroAnimator } from './rig/hero'
import { C } from './theme'

export type DrawOptions = {
  hitboxes: boolean
  frameData: boolean
  inputs: boolean
  flags: string
  /** 开发用：以主角为中心放大镜头（?zoom=3）。 */
  zoom?: number
}

export type Renderer = {
  resize(): void
  /** 在每次 step 之前调用，记下位置，渲染时在两帧之间插值。 */
  capture(s: GameState): void
  /** 每个逻辑帧 step 之后调用：推进动画、软链、剑光。 */
  afterStep(s: GameState): void
  /** 瞬移（重置、读快照）后调用，别让发带拉成一条线。 */
  reset(): void
  draw(s: GameState, alpha: number, fx: Fx, o: DrawOptions, log: InputLog): void
}

type Pos = { x: number; y: number }

export function createRenderer(canvas: HTMLCanvasElement, level: Level): Renderer {
  const ctxOrNull = canvas.getContext('2d')
  if (!ctxOrNull) throw new Error('canvas 2d context unavailable')
  const ctx = ctxOrNull
  const bg: Background = createBackground(level)
  let prevPlayer: Pos = { x: 0, y: 0 }
  let prevCam = 0
  const prevEnemies = new Map<number, Pos>()
  let lagHp = 1
  let t = 0
  const hero = new HeroAnimator()
  const enemyArt = new EnemyArt()

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(((w * VIEW_H) / VIEW_W) * dpr)
    bg.resize(canvas.width / VIEW_W)
  }

  function capture(s: GameState): void {
    prevPlayer = { x: s.player.x, y: s.player.y }
    prevCam = s.camera.x
    prevEnemies.clear()
    for (const e of s.enemies) prevEnemies.set(e.id, { x: e.x, y: e.y })
  }

  function drawLevel(): void {
    const gy = level.floorY
    ctx.fillStyle = C.ground
    ctx.fillRect(-20, gy, level.width + 40, VIEW_H - gy + 10)
    ctx.fillStyle = C.ground
    for (let x = 0; x < level.width; x += 5) {
      const h = 1 + ((x * 7919) % 13) / 4
      ctx.beginPath()
      ctx.moveTo(x - 0.8, gy + 0.5)
      ctx.lineTo(x + ((x * 31) % 5) / 3 - 0.8, gy - h)
      ctx.lineTo(x + 0.8, gy + 0.5)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,210,160,0.12)'
    ctx.fillRect(0, gy, level.width, 1)
    for (const p of level.platforms) {
      ctx.fillStyle = C.ink
      ctx.fillRect(p.x0 + 6, p.y, 3, gy - p.y)
      ctx.fillRect(p.x1 - 9, p.y, 3, gy - p.y)
      ctx.fillStyle = '#2b1f18'
      ctx.fillRect(p.x0 - 2, p.y, p.x1 - p.x0 + 4, 5)
      ctx.fillStyle = 'rgba(255,210,160,0.25)'
      ctx.fillRect(p.x0 - 2, p.y, p.x1 - p.x0 + 4, 0.8)
    }
    ctx.fillStyle = C.ink
    ctx.fillRect(-12, 0, 12, VIEW_H)
    ctx.fillRect(level.width, 0, 12, VIEW_H)
  }

  function enemyBars(s: GameState, fx: Fx, pos: Map<number, Pos>): void {
    for (const e of s.enemies) {
      if (e.state === 'dead') continue
      const age = fx.recentHit(e.id)
      if (age > 150 && e.hp >= e.maxHp) continue
      const p = pos.get(e.id) ?? e
      const h = ENEMY_DEFS[e.kind].height
      const w = 24
      const x = p.x - w / 2
      const y = p.y - h - 7
      ctx.fillStyle = 'rgba(16,18,23,0.7)'
      ctx.fillRect(x - 0.5, y - 0.5, w + 1, 3)
      ctx.fillStyle = '#d9483b'
      ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 2)
      if (e.maxPoise > 0) {
        ctx.fillStyle = C.gold
        ctx.fillRect(x, y + 2.6, w * (e.poise / e.maxPoise), 1)
      }
    }
  }

  function draw(s: GameState, alpha: number, fx: Fx, o: DrawOptions, log: InputLog): void {
    t++
    const k = canvas.width / VIEW_W
    ctx.setTransform(k, 0, 0, k, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const shake = fx.shake()
    const cam = lerp(prevCam, s.camera.x, alpha)
    bg.draw(ctx, cam)

    ctx.save()
    const px = lerp(prevPlayer.x, s.player.x, alpha)
    const py = lerp(prevPlayer.y, s.player.y, alpha)
    if (o.zoom && o.zoom > 1) {
      ctx.translate(VIEW_W / 2, VIEW_H * 0.72)
      ctx.scale(o.zoom, o.zoom)
      ctx.translate(-px - 20, -s.level.floorY + 8)
    } else ctx.translate(-cam + shake.x, shake.y)
    drawLevel()
    drawProjectiles(ctx, s, t)
    const pos = new Map<number, Pos>()
    const order = [...s.enemies].sort(
      (a, b) =>
        Number(b.state === 'down' || b.state === 'dead') -
        Number(a.state === 'down' || a.state === 'dead'),
    )
    for (const e of order) {
      const pv = prevEnemies.get(e.id)
      const x = pv ? lerp(pv.x, e.x, alpha) : e.x
      const y = pv ? lerp(pv.y, e.y, alpha) : e.y
      pos.set(e.id, { x, y })
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(x, level.floorY + 0.5, e.halfW * 0.9, 1.8, 0, 0, Math.PI * 2)
      ctx.fill()
      if (e.kind === 'dummy') drawEnemy(ctx, e, x, y, t, fx.flashOf(e.id))
      else enemyArt.draw(ctx, e, x, y, alpha, fx.flashOf(e.id))
    }
    enemyBars(s, fx, pos)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(px, level.floorY + 0.5, 9, 2, 0, 0, Math.PI * 2)
    ctx.fill()
    hero.draw(ctx, s, px, py, alpha, C.rim)
    fx.drawWorld(ctx)
    if (o.hitboxes) drawHitboxes(ctx, s)
    ctx.restore()

    fx.drawScreen(ctx, VIEW_W, VIEW_H)
    const v = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.45,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_W * 0.62,
    )
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.28)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)

    const hpRatio = s.player.hp / s.player.maxHp
    lagHp = lagHp > hpRatio ? Math.max(hpRatio, lagHp - 0.006) : hpRatio
    drawHud(ctx, s, fx, lagHp)
    if (o.frameData) drawFrameMeter(ctx, s)
    if (o.inputs) log.draw(ctx)
    drawTrainingInfo(ctx, s, o.flags)
  }

  function afterStep(s: GameState): void {
    hero.onEvents(s.events)
    hero.update(s)
    enemyArt.update(s.enemies)
  }

  return { resize, capture, draw, afterStep, reset: () => hero.reset() }
}
