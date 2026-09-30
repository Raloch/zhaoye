import { MOVES } from '../../core/moves'
import { currentMove, isInvulnerable } from '../../core/player'
import type { GameEvent, GameState } from '../../core/state'
import { C } from '../theme'
import { type Bounds, Compositor } from './compose'
import {
  breathe,
  landPose,
  movePose,
  PLUNGE_FALL,
  POSES,
  runPose,
  STANCE,
  walkPose,
} from './heroPoses'
import { lerp, P, type Pt, sub, unit } from './math'
import { capsule, circle, ellipse, flatPaint, type Paint, poly, strip } from './paint'
import {
  drawArm,
  drawHead,
  drawJian,
  drawLeg,
  drawTorso,
  flap,
  groundLift,
  HERO_LENS,
  HERO_THICK,
  headPoint,
  lerpPose,
  type Pose,
  type Skeleton,
  scaleSpec,
  skeleton,
  thighDirs,
  torsoPoint,
} from './skeleton'
import { SoftChain } from './softchain'

const { L, T } = scaleSpec(HERO_LENS, HERO_THICK, 1)
const COLORS = {
  near: C.ink,
  far: C.inkFar,
  accent: C.teal,
  blade: C.blade,
  bladeGlow: C.bladeGlow,
}
const AIR_LIFT = 22
const GHOST = { near: C.teal }

function worldMatrix(x: number, y: number, facing: number, pose: Pose, lift: number): DOMMatrix {
  return new DOMMatrix()
    .translate(x, y)
    .scale(facing, 1)
    .scale(1, pose.sq)
    .translate(0, -lift)
    .rotate(pose.rot)
}

function apply(m: DOMMatrix, p: Pt): Pt {
  const q = m.transformPoint(new DOMPoint(p.x, p.y))
  return P(q.x, q.y)
}

/** 身体（不含软链），在骨骼坐标系里画。返回剑根、剑尖（骨骼坐标）。 */
function drawBody(
  c: CanvasRenderingContext2D,
  p: Paint,
  sk: Skeleton,
  pose: Pose,
): { base: Pt; tip: Pt } {
  const r = L.headR
  drawArm(c, p, sk.armF, T, 'far')
  drawLeg(c, p, sk.legF, T, 'far')
  const { front, back } = thighDirs(sk)
  p.fill(c, 'far')
  flap(c, torsoPoint(sk, 2.4, -T.hip * 0.4), back, 9, 2.6, 3.4, -1.2)
  drawTorso(c, p, sk, L, T, 'near')
  drawLeg(c, p, sk.legN, T, 'near')
  p.fill(c, 'near')
  flap(c, torsoPoint(sk, 2.4, T.hip * 0.35), front, 8.5, 2.6, 3.3, 1)
  p.fill(c, 'accent')
  poly(c, [
    torsoPoint(sk, 3.3, -T.hip * 1.02),
    torsoPoint(sk, 4.6, -T.waist * 1.1),
    torsoPoint(sk, 4.6, T.waist * 1.08),
    torsoPoint(sk, 3.3, T.hip * 1.02),
  ])
  drawHead(c, p, sk, L, 'near')
  p.fill(c, 'near')
  c.save()
  c.translate(sk.head.x, sk.head.y)
  c.rotate((sk.headAngle * Math.PI) / 180)
  ellipse(c, P(-r * 0.16, -r * 0.24), r * 1.0, r * 0.86)
  poly(c, [
    P(-r * 0.2, -r * 1.06),
    P(r * 0.92, -r * 0.62),
    P(r * 1.04, -r * 0.08),
    P(r * 0.64, -r * 0.4),
    P(r * 0.52, r * 0.02),
    P(r * 0.12, -r * 0.5),
  ])
  circle(c, P(-r * 0.52, -r * 0.86), r * 0.36)
  p.fill(c, 'accent')
  poly(c, [
    P(r * 0.88, -r * 0.5),
    P(r * 0.95, -r * 0.22),
    P(-r * 0.95, -r * 0.2),
    P(-r * 0.9, -r * 0.52),
  ])
  c.restore()
  drawArm(c, p, sk.armN, T, 'near')
  const blade = drawJian(c, p, sk.armN.hand, pose.sw, pose.glow)
  const wr = sk.armN
  const wd = unit(sub(wr.w, wr.e))
  p.fill(c, 'near')
  capsule(
    c,
    P(wr.w.x - wd.x * 2.2, wr.w.y - wd.y * 2.2),
    P(wr.w.x - wd.x * 0.2, wr.w.y - wd.y * 0.2),
    T.fArm[1] * 1.15,
  )
  return blade
}

type Sample = { pose: Pose; lift: number }
type Ghost = { x: number; y: number; facing: number; pose: Pose; lift: number; life: number }

/**
 * 叶昭的动画器：每个逻辑帧 update 一次（算目标姿势、模拟软链、记录剑光），
 * 每个显示帧 draw 一次（在两帧之间插值）。
 */
export class HeroAnimator {
  private cur: Sample = { pose: STANCE, lift: 20 }
  private prev: Sample = { pose: STANCE, lift: 20 }
  private key = ''
  private entry: Pose = STANCE
  private blendFrom: Pose = STANCE
  private blendI = 0
  private blendN = 0
  private phase = 0
  private t = 0
  private landT = 0
  private flipT = 0
  private readonly tail = new SoftChain(6, 1.9, 0.14, 0.86)
  private readonly rib1 = new SoftChain(8, 2.6, 0.035, 0.9)
  private readonly rib2 = new SoftChain(7, 2.4, 0.04, 0.9)
  private readonly sash = new SoftChain(4, 1.8, 0.12, 0.86)
  private tickAnchor: Pt = P(0, 0)
  private trail: { base: Pt; tip: Pt }[] = []
  private ghosts: Ghost[] = []
  private readonly comp = new Compositor()

  onEvents(events: readonly GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'jump' && e.double) this.flipT = 18
      if (e.type === 'land') this.landT = 7
    }
  }

  reset(): void {
    for (const ch of [this.tail, this.rib1, this.rib2, this.sash]) ch.reset()
    this.trail = []
    this.ghosts = []
  }

  private target(s: GameState): { pose: Pose; mode: string } {
    const p = s.player
    const m = currentMove(p)
    const mv = p.move
    switch (p.state) {
      case 'free': {
        if (!p.onGround) {
          const k = Math.max(0, Math.min(1, (p.vy + 2.5) / 5))
          const pose = lerpPose(POSES.jumpUp, POSES.fall, k)
          if (this.flipT > 0) {
            const f = 1 - this.flipT / 18
            return { pose: { ...lerpPose(pose, POSES.jumpUp, 0.6), rot: -360 * f }, mode: 'flip' }
          }
          return { pose, mode: 'air' }
        }
        let pose: Pose
        let mode: string
        if (Math.abs(p.vx) > 0.25) {
          const run = p.runDir !== 0
          this.phase += Math.abs(p.vx) * (run ? 0.19 : 0.2)
          pose = run ? runPose(this.phase) : walkPose(this.phase)
          mode = run ? 'run' : 'walk'
        } else {
          pose = breathe(STANCE, this.t)
          mode = 'idle'
        }
        if (this.landT > 0) pose = lerpPose(POSES.land, pose, 1 - this.landT / 7)
        return { pose, mode }
      }
      case 'move': {
        if (!m || !mv) return { pose: STANCE, mode: 'idle' }
        if (mv.phase === 'fall') return { pose: PLUNGE_FALL, mode: 'fall' }
        if (mv.phase === 'land' && m.untilLand)
          return {
            pose: landPose(mv.frame, m.untilLand.active, m.untilLand.recovery),
            mode: 'land',
          }
        return { pose: movePose(m, mv.frame, this.entry), mode: `move:${m.id}` }
      }
      case 'charge': {
        const ready = p.stateFrame + 14 >= 30
        const pose = { ...POSES.charge, glow: Math.min(1, p.stateFrame / 16) }
        if (ready) pose.sw += Math.sin(this.t * 1.7) * 1.5
        return { pose, mode: 'charge' }
      }
      case 'guard':
        return { pose: POSES.guard, mode: 'guard' }
      case 'blockstun':
        return {
          pose: { ...POSES.guard, t: POSES.guard.t - 10, h: POSES.guard.h + 6 },
          mode: 'guard',
        }
      case 'dash':
        return { pose: p.dashDir === p.facing ? POSES.dashFwd : POSES.dashBack, mode: 'dash' }
      case 'hurt':
        return { pose: POSES.hurt, mode: 'hurt' }
      case 'launched':
        return {
          pose: { ...POSES.launched, rot: -30 - Math.min(70, p.stateFrame * 5) },
          mode: 'launched',
        }
      case 'down':
      case 'dead':
        return { pose: { ...POSES.down, rot: -90 }, mode: 'down' }
      case 'getup': {
        const k = p.stateFrame / 20
        const pose =
          k < 0.5
            ? lerpPose({ ...POSES.down, rot: -90 }, POSES.kneel, k * 2)
            : lerpPose(POSES.kneel, STANCE, (k - 0.5) * 2)
        return { pose, mode: 'getup' }
      }
    }
  }

  private liftFor(s: GameState, pose: Pose): number {
    const p = s.player
    if (p.state === 'down' || p.state === 'dead') return 4.5
    if (p.state === 'getup' && p.stateFrame < 10) return lerp(4.5, 14, p.stateFrame / 10)
    if (!p.onGround || p.state === 'launched') return AIR_LIFT
    return groundLift(skeleton(L, { ...pose, rot: 0 }), T)
  }

  update(s: GameState): void {
    this.t++
    if (this.landT > 0) this.landT--
    if (this.flipT > 0) this.flipT--
    const p = s.player
    const { pose: target, mode } = this.target(s)
    const key = `${p.state}:${mode}:${p.move?.id ?? ''}`
    if (key !== this.key) {
      const isMove = p.state === 'move'
      const sameMoveChain = isMove && this.key.startsWith('move:move:') && mode.startsWith('move:')
      this.entry = this.cur.pose
      this.blendFrom = this.cur.pose
      this.blendI = 0
      this.blendN = isMove ? 0 : mode === 'walk' || mode === 'run' || mode === 'idle' ? 5 : 3
      if (sameMoveChain) this.blendN = 0
      this.key = key
    }
    let pose = p.state === 'move' ? this.target(s).pose : target
    if (this.blendI < this.blendN) {
      this.blendI++
      pose = lerpPose(this.blendFrom, pose, this.blendI / this.blendN)
    }
    this.prev = this.cur
    this.cur = { pose, lift: this.liftFor(s, pose) }

    // 软链：根部挂在头和腰上，世界坐标里模拟
    const M = worldMatrix(p.x, p.y, p.facing, pose, this.cur.lift)
    const sk = skeleton(L, pose)
    const r = L.headR
    const f = p.facing
    const wind = P(
      -f * 0.02 + 0.014 * Math.sin(this.t * 0.11),
      -0.01 + 0.01 * Math.sin(this.t * 0.07),
    )
    const tie = apply(M, headPoint(sk, -r * 0.62, -r * 0.9))
    const band = apply(M, headPoint(sk, -r * 0.92, -r * 0.35))
    this.tickAnchor = band
    this.tail.step(tie, P(-f * 0.55, 0.83), wind)
    this.rib1.step(band, P(-f * 0.94, 0.34), P(wind.x * 2.2, wind.y - 0.004))
    this.rib2.step(band, P(-f * 0.9, 0.44), P(wind.x * 1.8, wind.y))
    this.sash.step(apply(M, torsoPoint(sk, 3.8, -T.hip * 0.9)), P(-f * 0.35, 0.94), wind)

    // 剑光：判定期间记录剑根、剑尖的世界坐标
    const m = currentMove(p)
    const mv = p.move
    const slashing =
      !!m &&
      !!mv &&
      (mv.phase === 'fall' ||
        (mv.phase === 'main' &&
          mv.frame >= m.startup - 1 &&
          mv.frame <= m.startup + m.active + 1 &&
          m.id !== 'wave'))
    if (slashing) {
      const n = unit(P(Math.sin((pose.sw * Math.PI) / 180), Math.cos((pose.sw * Math.PI) / 180)))
      const hand = sk.armN.hand
      this.trail.push({
        base: apply(M, P(hand.x + n.x * 6, hand.y + n.y * 6)),
        tip: apply(M, P(hand.x + n.x * 20.5, hand.y + n.y * 20.5)),
      })
      if (this.trail.length > 7) this.trail.shift()
    } else if (this.trail.length > 0) {
      this.trail.shift()
    }

    // 残影：闪步、穿云刺、疾风连斩
    for (const g of this.ghosts) g.life--
    this.ghosts = this.ghosts.filter((g) => g.life > 0)
    const ghostly =
      p.state === 'dash' ||
      m?.id === 'pierce' ||
      m?.id === 'gale' ||
      (m?.id === 'super' && mv && mv.frame >= m.startup)
    if (ghostly && this.t % 2 === 0)
      this.ghosts.push({ x: p.x, y: p.y, facing: p.facing, pose, lift: this.cur.lift, life: 9 })
  }

  draw(
    ctx: CanvasRenderingContext2D,
    s: GameState,
    x: number,
    y: number,
    alpha: number,
    rim: string,
  ): void {
    const p = s.player
    const pose = lerpPose(this.prev.pose, this.cur.pose, alpha)
    const lift = lerp(this.prev.lift, this.cur.lift, alpha)
    let dx = 0
    if (p.state === 'hurt' || p.state === 'blockstun') dx = Math.sin(this.t * 2.3) * 0.9
    const M = worldMatrix(x + dx, y, p.facing, pose, lift)

    // 残影先整体合成成一块剪影，再统一半透明，避免部件重叠处深浅不一
    for (const g of this.ghosts) {
      const GM = worldMatrix(g.x, g.y, g.facing, g.pose, g.lift)
      const gbox: Bounds = { x: g.x - 75, y: g.y - 110, w: 150, h: 138 }
      this.comp.draw(ctx, gbox, { colors: GHOST, rim: null, alpha: (g.life / 9) * 0.38 }, (c) => {
        c.save()
        c.transform(GM.a, GM.b, GM.c, GM.d, GM.e, GM.f)
        drawBody(c, flatPaint(C.teal), skeleton(L, g.pose), g.pose)
        c.restore()
      })
    }

    let a = 1
    if (isInvulnerable(s) && p.state !== 'move' && p.state !== 'down' && p.state !== 'dead')
      a = this.t % 6 < 3 ? 0.45 : 0.9
    const mv = p.move
    if (mv?.id === 'super' && mv.frame >= MOVES.super.startup && mv.frame < 84)
      a = 0.25 + 0.2 * Math.sin(this.t)

    // 软链整体平移到插值后的根部位置，避免高刷新率下和身体脱节
    const sk = skeleton(L, pose)
    const band = apply(M, headPoint(sk, -L.headR * 0.92, -L.headR * 0.35))
    const off = P(band.x - this.tickAnchor.x, band.y - this.tickAnchor.y)
    const shift = (pts: Pt[]) => pts.map((q) => P(q.x + off.x, q.y + off.y))

    const box: Bounds = { x: x - 75, y: y - 110, w: 150, h: 138 }
    this.comp.draw(ctx, box, { colors: COLORS, rim, alpha: a }, (c, paint) => {
      paint.fill(c, 'near')
      strip(c, shift(this.tail.points()), 1.9, 0.4)
      paint.fill(c, 'accent')
      strip(c, shift(this.rib1.points()), 0.8, 0.28)
      strip(c, shift(this.rib2.points()), 0.72, 0.26)
      strip(c, shift(this.sash.points()), 0.8, 0.3)
      c.save()
      c.transform(M.a, M.b, M.c, M.d, M.e, M.f)
      drawBody(c, paint, sk, pose)
      c.restore()
    })
    this.drawTrail(ctx)
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    const n = this.trail.length
    if (n < 2) return
    ctx.save()
    ctx.shadowColor = C.bladeGlow
    const m = ctx.getTransform()
    ctx.shadowBlur = 6 * Math.hypot(m.a, m.b)
    for (let i = 1; i < n; i++) {
      const a = this.trail[i - 1]
      const b = this.trail[i]
      if (!a || !b) continue
      const alpha = (i / n) * 0.75
      ctx.fillStyle = `rgba(214,251,255,${alpha})`
      ctx.beginPath()
      ctx.moveTo(a.base.x, a.base.y)
      ctx.lineTo(a.tip.x, a.tip.y)
      ctx.lineTo(b.tip.x, b.tip.y)
      ctx.lineTo(b.base.x, b.base.y)
      ctx.closePath()
      ctx.fill()
    }
    const last = this.trail[n - 1]
    if (last) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(this.trail[0]?.tip.x ?? last.tip.x, this.trail[0]?.tip.y ?? last.tip.y)
      for (const q of this.trail.slice(1)) ctx.lineTo(q.tip.x, q.tip.y)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/**
 * 开发用：不带动画状态，直接把一个姿势画在 (x, y)。姿势实验室（lab.html）用它排版对比。
 */
export function drawHeroPose(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  x: number,
  y: number,
  facing: 1 | -1,
  rim: string,
  airborne = false,
): void {
  const comp = new Compositor()
  const sk = skeleton(L, pose)
  const lift =
    Math.abs(pose.rot) > 45
      ? 4.5
      : airborne
        ? AIR_LIFT
        : groundLift(skeleton(L, { ...pose, rot: 0 }), T)
  const M = worldMatrix(x, y, facing, pose, lift)
  const r = L.headR
  const band = apply(M, headPoint(sk, -r * 0.92, -r * 0.35))
  const tie = apply(M, headPoint(sk, -r * 0.62, -r * 0.9))
  const line = (from: Pt, dx: number, dy: number, n: number, seg: number): Pt[] =>
    Array.from({ length: n + 1 }, (_, i) =>
      P(from.x + dx * seg * i + Math.sin(i * 0.9) * 0.6 * i * 0.3, from.y + dy * seg * i),
    )
  comp.draw(ctx, { x: x - 75, y: y - 110, w: 150, h: 138 }, { colors: COLORS, rim }, (c, paint) => {
    paint.fill(c, 'near')
    strip(c, line(tie, -facing * 0.55, 0.83, 6, 1.9), 1.9, 0.4)
    paint.fill(c, 'accent')
    strip(c, line(band, -facing * 0.85, 0.52, 7, 2.3), 0.75, 0.3)
    strip(c, line(band, -facing * 0.8, 0.62, 6, 2.1), 0.7, 0.28)
    c.save()
    c.transform(M.a, M.b, M.c, M.d, M.e, M.f)
    drawBody(c, paint, sk, pose)
    c.restore()
  })
}
