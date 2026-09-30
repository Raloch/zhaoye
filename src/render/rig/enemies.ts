import { attackDef, ENEMY_DEFS, shieldUp } from '../../core/enemies'
import type { Enemy } from '../../core/state'
import { C } from '../theme'
import { type Bounds, Compositor } from './compose'
import { add, ease, ldir, lerp, P, type Pt, perp } from './math'
import {
  blob,
  capsule,
  circle,
  ellipse,
  glowDot,
  type Paint,
  type Palette,
  poly,
  strip,
} from './paint'
import {
  drawArm,
  drawLeg,
  drawTorso,
  flap,
  groundLift,
  HERO_LENS,
  HERO_THICK,
  lerpPose,
  type Pose,
  type Skeleton,
  scaleSpec,
  skeleton,
  thighDirs,
  torsoPoint,
} from './skeleton'

/**
 * 灰狼妖和狼卫的剪影，出自 concept/ 设定集，这里加上了动作：
 * 灰狼有步态、伏低、扑出、翻滚；狼卫的每一招都有预备和挥砍。
 */

const RIM = C.rim
const WOLF_COLORS: Palette = { near: C.ink, far: C.inkFar, eye: C.eye }
const GUARD_COLORS: Palette = {
  near: C.ink,
  far: C.inkFar,
  eye: C.eye,
  accent: '#7a3b2e',
  iron: '#4a505a',
}
const WHITE: Palette = {
  near: '#ffffff',
  far: '#e6e6e6',
  eye: '#ffffff',
  accent: '#ffffff',
  iron: '#ffffff',
}

// ───────────────────────── 灰狼 ─────────────────────────

type WolfShape = { dy: number; head: [number, number]; fl: Pt[]; hl: Pt[]; tail: [number, number] }

const WOLF: Record<'stand' | 'stalk' | 'lunge', WolfShape> = {
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

function mixShape(a: WolfShape, b: WolfShape, k: number): WolfShape {
  const mp = (x: Pt[], y: Pt[]) =>
    x.map((p, i) => P(lerp(p.x, y[i]?.x ?? p.x, k), lerp(p.y, y[i]?.y ?? p.y, k)))
  return {
    dy: lerp(a.dy, b.dy, k),
    head: [lerp(a.head[0], b.head[0], k), lerp(a.head[1], b.head[1], k)],
    fl: mp(a.fl, b.fl),
    hl: mp(a.hl, b.hl),
    tail: [lerp(a.tail[0], b.tail[0], k), lerp(a.tail[1], b.tail[1], k)],
  }
}

function chainPts(
  start: Pt,
  length: number,
  segs: number,
  a0: number,
  a1: number,
  wave: number,
  phase: number,
): Pt[] {
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

function drawWolf(
  c: CanvasRenderingContext2D,
  p: Paint,
  w: WolfShape,
  gait: number,
  moving: boolean,
  jaw: number,
  t: number,
): void {
  const dy = w.dy
  const [hx, hy] = w.head
  const leg = (pts: Pt[], role: string, radii: number[], dx: number, ph: number) => {
    const q = pts.map((v, i) => {
      const swing = moving && i > 0 ? Math.sin(gait + ph) * (i === 3 ? 3.2 : 1.8) : 0
      const lift = moving && i === 3 ? Math.max(0, Math.cos(gait + ph)) * 1.6 : 0
      return P(v.x + dx + swing, v.y + (v.y < -8 ? dy * 0.4 : 0) - lift)
    })
    p.fill(c, role)
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i]
      const b = q[i + 1]
      if (a && b) capsule(c, a, b, radii[i] ?? 1, radii[i + 1] ?? 1)
    }
    const last = q[q.length - 1]
    if (last) ellipse(c, last, (radii[3] ?? 1) * 1.5, (radii[3] ?? 1) * 0.9)
  }
  const FR = [2.3, 1.6, 1.25, 1.15]
  const HR = [3.4, 2.0, 1.35, 1.15]
  leg(w.fl, 'far', FR, -2.4, Math.PI)
  leg(w.hl, 'far', HR, 2.6, 0)
  p.fill(c, 'near')
  strip(c, chainPts(P(-12.5, -15 + dy), 12, 6, w.tail[0], w.tail[1], 10, t * 0.15), 2.8, 0.7)
  blob(c, [
    P(-13.5, -14 + dy),
    P(-9.5, -18.5 + dy),
    P(-2, -17.4 + dy),
    P(5.5, -19.8 + dy),
    P(11, -18.4 + dy),
    P(12.4, -13 + dy),
    P(8.4, -9.2 + dy * 0.7),
    P(0, -10.6 + dy * 0.8),
    P(-8, -10 + dy * 0.8),
    P(-13.4, -11.2 + dy),
  ])
  for (let i = 0; i < 6; i++) {
    const bx = -6 + i * 3.1
    const by = -18 + dy - (i > 3 ? 0.9 : 0)
    poly(c, [P(bx - 1.4, by + 0.6), P(bx - 2.4, by - 2.2), P(bx + 1.2, by + 0.2)])
  }
  leg(w.fl, 'near', FR, 0, 0)
  leg(w.hl, 'near', HR, 0, Math.PI)
  const hd = P(15.5 + hx, -21.4 + dy + hy)
  capsule(c, P(8.5, -16.6 + dy), P(hd.x - 1.5, hd.y + 1), 4.3, 3.2)
  p.fill(c, 'far')
  poly(c, [P(hd.x - 3.2, hd.y - 1.6), P(hd.x - 3, hd.y - 5.8), P(hd.x - 1.1, hd.y - 2.1)])
  p.fill(c, 'near')
  ellipse(c, hd, 3.7, 3.2)
  poly(c, [
    P(hd.x + 1.4, hd.y - 1.6),
    P(hd.x + 8, hd.y + 0.5 - jaw * 0.6),
    P(hd.x + 7.8, hd.y + 2 - jaw * 0.4),
    P(hd.x + 3, hd.y + 3.2),
    P(hd.x + 1, hd.y + 2.6),
  ])
  if (jaw > 0)
    poly(c, [
      P(hd.x + 1.4, hd.y + 2.6),
      P(hd.x + 7, hd.y + 2.6 + jaw * 2.2),
      P(hd.x + 6, hd.y + 3.8 + jaw * 2.2),
      P(hd.x + 1.2, hd.y + 3.6),
    ])
  poly(c, [P(hd.x - 1.9, hd.y - 2.2), P(hd.x - 0.9, hd.y - 6.8), P(hd.x + 0.9, hd.y - 2.6)])
  glowDot(c, P(hd.x + 1.4, hd.y - 0.7), 0.72, 'eye', 2.5, p)
}

/** 灰狼这一帧的造型：伏低程度、是否扑出、张嘴、旋转。 */
function wolfLook(e: Enemy): { shape: WolfShape; rot: number; jaw: number } {
  const def = attackDef(e)
  const atk = e.attack
  let shape = WOLF.stand
  let rot = 0
  let jaw = 0
  if (e.state === 'windup' && def && atk) {
    const k = ease.out(Math.min(1, atk.frame / (def.windup * 0.7)))
    shape = mixShape(WOLF.stand, WOLF.stalk, def.id === 'pounce' ? k : k * 0.6)
    jaw = def.id === 'bite' ? k * 0.6 : 0
  } else if (e.state === 'attack' && def && atk) {
    if (def.id === 'pounce') {
      shape = e.onGround ? WOLF.stand : WOLF.lunge
      rot = Math.max(-20, Math.min(20, e.vy * 5))
      jaw = 1
    } else {
      jaw = (atk.frame - def.windup) % 8 < 4 ? 1 : 0.2
      shape = mixShape(WOLF.stand, WOLF.lunge, 0.25)
    }
  } else if (e.state === 'recover') {
    shape = mixShape(WOLF.stalk, WOLF.stand, Math.min(1, e.stateFrame / 20))
  } else if (e.state === 'hurt' || e.state === 'parried') {
    shape = mixShape(WOLF.stand, WOLF.stalk, 0.5)
    rot = -12
  } else if (e.state === 'air') {
    shape = WOLF.lunge
    rot = Math.max(-50, Math.min(70, e.vy * 9)) + (e.vy < 0 ? -20 : 20)
  } else if (e.state === 'down' || e.state === 'dead') {
    rot = 170
  } else if (e.state === 'getup') {
    rot = lerp(170, 0, ease.inOut(e.stateFrame / 16))
  }
  return { shape, rot, jaw }
}

// ───────────────────────── 狼卫 ─────────────────────────

const G = scaleSpec({ ...HERO_LENS, headR: 3.5 }, HERO_THICK, 1.09, 1.12)

type GuardPose = Pose & { swF: number; shieldUp: number }

const GBASE: GuardPose = {
  t: 12,
  h: -8,
  thN: 30,
  shN: -8,
  ftN: 92,
  thF: -24,
  shF: -14,
  ftF: 76,
  uaN: 30,
  faN: 94,
  uaF: -140,
  faF: 166,
  sw: 0,
  swF: 118,
  rot: 0,
  sq: 1,
  glow: 0,
  shieldUp: 1,
}
const gp = (p: Partial<GuardPose>): GuardPose => ({ ...GBASE, ...p })
const G_LUNGE = { thN: 60, shN: 2, ftN: 98, thF: -48, shF: -60, ftF: 18 }

const GUARD_POSES = {
  stance: GBASE,
  slashW: gp({ t: -8, h: -4, uaF: -170, faF: 196, swF: 206, shieldUp: 0.6 }),
  slashX: gp({ t: 32, h: -24, ...G_LUNGE, uaF: 74, faF: 62, swF: 52, shieldUp: 0.4 }),
  bashW: gp({ t: -8, h: -2, uaN: 4, faN: 70, shieldUp: 1 }),
  bashX: gp({ t: 28, h: -20, ...G_LUNGE, uaN: 84, faN: 92, shieldUp: 1 }),
  cleaveW: gp({
    t: -18,
    h: -14,
    thN: 34,
    shN: -22,
    thF: -20,
    shF: -36,
    uaF: 178,
    faF: 204,
    swF: 212,
    uaN: -20,
    faN: 40,
    shieldUp: 0,
  }),
  cleaveX: gp({
    t: 46,
    h: -30,
    thN: 80,
    shN: 8,
    ftN: 102,
    thF: -64,
    shF: -80,
    ftF: 8,
    uaF: 62,
    faF: 30,
    swF: 18,
    uaN: -40,
    faN: -10,
    shieldUp: 0,
  }),
  hurt: gp({ t: -20, h: -18, uaF: -100, faF: -60, swF: -40, shieldUp: 0.5 }),
  broken: gp({ t: 34, h: 30, uaN: 10, faN: 20, uaF: -30, faF: -10, swF: -10, shieldUp: 0 }),
  air: gp({
    t: -20,
    h: -20,
    thN: 50,
    shN: 10,
    thF: -40,
    shF: -24,
    uaN: -100,
    faN: -130,
    uaF: 140,
    faF: 160,
    swF: 170,
    shieldUp: 0,
  }),
  down: gp({
    t: 0,
    h: -10,
    thN: 12,
    shN: 2,
    thF: -6,
    shF: -4,
    uaN: 40,
    faN: 22,
    uaF: -30,
    faF: -10,
    swF: -30,
    shieldUp: 0,
  }),
}

function lerpGuard(a: GuardPose, b: GuardPose, k: number): GuardPose {
  const base = lerpPose(a, b, k)
  return { ...base, swF: lerp(a.swF, b.swF, k), shieldUp: lerp(a.shieldUp, b.shieldUp, k) }
}

function guardAttackPose(e: Enemy): GuardPose | null {
  const def = attackDef(e)
  const atk = e.attack
  if (!def || !atk) return null
  const f = atk.frame
  const w = def.windup
  const a = w + def.active
  const W =
    def.id === 'bash'
      ? GUARD_POSES.bashW
      : def.id === 'cleave'
        ? GUARD_POSES.cleaveW
        : GUARD_POSES.slashW
  const X =
    def.id === 'bash'
      ? GUARD_POSES.bashX
      : def.id === 'cleave'
        ? GUARD_POSES.cleaveX
        : GUARD_POSES.slashX
  if (f < w) return lerpGuard(GBASE, W, ease.out(Math.min(1, f / (w * 0.75))))
  if (f < a)
    return lerpGuard(W, X, ease.snap(Math.min(1, (f - w + 1) / Math.max(1, def.active - 1))))
  const k = (f - a) / def.recovery
  return k < 0.45 ? X : lerpGuard(X, GBASE, ease.inOut((k - 0.45) / 0.55))
}

function guardTarget(e: Enemy): GuardPose {
  switch (e.state) {
    case 'windup':
    case 'attack':
    case 'recover':
      return guardAttackPose(e) ?? GBASE
    case 'hurt':
    case 'parried':
      return GUARD_POSES.hurt
    case 'broken':
      return GUARD_POSES.broken
    case 'air':
      return { ...GUARD_POSES.air, rot: -40 - Math.min(40, e.stateFrame * 3) }
    case 'down':
    case 'dead':
      return { ...GUARD_POSES.down, rot: -90 }
    case 'getup':
      return lerpGuard({ ...GUARD_POSES.down, rot: -90 }, GBASE, ease.inOut(e.stateFrame / 16))
    default: {
      if (Math.abs(e.vx) > 0.2) {
        const s = Math.sin(e.x * 0.25)
        return gp({
          thN: 20 + 18 * s,
          shN: 8 + 18 * s - 20,
          thF: -10 - 18 * s,
          shF: -10 - 18 * s - 12,
        })
      }
      return { ...GBASE, shieldUp: shieldUp(e) ? 1 : 0.5 }
    }
  }
}

function wolfHead(c: CanvasRenderingContext2D, p: Paint, sk: Skeleton, r: number): void {
  c.save()
  c.translate(sk.head.x, sk.head.y)
  c.rotate((sk.headAngle * Math.PI) / 180)
  p.fill(c, 'far')
  poly(c, [P(-r * 0.95, -r * 0.3), P(-r * 1.15, -r * 1.9), P(-r * 0.2, -r * 0.75)])
  p.fill(c, 'near')
  ellipse(c, P(0, 0), r * 1.05, r * 0.95)
  poly(c, [
    P(r * 0.3, -r * 0.65),
    P(r * 1.2, -r * 0.5),
    P(r * 2.2, -r * 0.1),
    P(r * 2.15, r * 0.32),
    P(r * 0.9, r * 0.5),
    P(r * 0.3, r * 0.7),
  ])
  poly(c, [P(r * 0.4, r * 0.4), P(r * 1.85, r * 0.5), P(r * 1.65, r * 0.8), P(r * 0.3, r * 0.98)])
  poly(c, [P(-r * 0.45, -r * 0.6), P(-r * 0.25, -r * 2.05), P(r * 0.45, -r * 0.7)])
  poly(c, [
    P(-r * 0.9, r * 0.1),
    P(-r * 1.7, r * 0.95),
    P(-r * 0.7, r * 0.75),
    P(-r * 1.0, r * 1.45),
    P(0, r * 0.95),
  ])
  glowDot(c, P(r * 0.62, -r * 0.3), r * 0.19, 'eye', 3, p)
  c.restore()
}

function saber(
  c: CanvasRenderingContext2D,
  p: Paint,
  hand: Pt,
  angle: number,
  length: number,
): void {
  const d = ldir(angle)
  const n = perp(d)
  const A = (s: number, w = 0): Pt => add(add(hand, d, s), n, w)
  p.fill(c, 'near')
  capsule(c, A(-2.8), A(0.9), 0.6)
  capsule(c, A(1.1, -1.6), A(1.1, 1.6), 0.5)
  p.fill(c, 'iron')
  c.beginPath()
  const s0 = A(1.4, -0.6)
  c.moveTo(s0.x, s0.y)
  const c1 = A(length * 0.55, -1.4)
  const tip = A(length, 2.6)
  c.quadraticCurveTo(c1.x, c1.y, tip.x, tip.y)
  const c2 = A(length * 0.5, 1.9)
  const e = A(1.4, 1.0)
  c.quadraticCurveTo(c2.x, c2.y, e.x, e.y)
  c.closePath()
  c.fill()
}

function drawGuard(c: CanvasRenderingContext2D, p: Paint, pose: GuardPose): void {
  const { L, T } = G
  const k = 1.09
  const sk = skeleton(L, pose)
  const r = L.headR
  p.fill(c, 'near')
  strip(c, chainPts(torsoPoint(sk, 1, -T.hip * 1.1), 11 * k, 7, -80, -20, 10, 0.5), 2.6 * k, 0.5)
  drawArm(c, p, sk.armF, T, 'far')
  saber(c, p, sk.armF.hand, pose.swF, 15)
  drawLeg(c, p, sk.legF, T, 'far')
  drawTorso(c, p, sk, L, T, 'near')
  drawLeg(c, p, sk.legN, T, 'near')
  const { front, back } = thighDirs(sk)
  p.fill(c, 'far')
  flap(c, torsoPoint(sk, 1.6, -T.hip * 0.4), back, 6.5 * k, 2 * k, 2.4 * k, -0.4)
  p.fill(c, 'accent')
  flap(c, torsoPoint(sk, 1.6, T.hip * 0.4), front, 6 * k, 1.8 * k, 2.1 * k, 0.4)
  capsule(c, torsoPoint(sk, 3.4 * k, -T.hip * 1.1), torsoPoint(sk, 3.4 * k, T.hip * 1.1), 0.55 * k)
  wolfHead(c, p, sk, r)
  drawArm(c, p, sk.armN, T, 'near')
  // 盾：举起时挡在身前，放下时垂在身侧
  const hand = add(sk.armN.hand, sk.fw, 1.2)
  const center = P(lerp(hand.x - 2, hand.x, pose.shieldUp), lerp(hand.y + 4, hand.y, pose.shieldUp))
  p.fill(c, 'near')
  ellipse(c, center, 3.6, 8.2, lerp(40, 8, pose.shieldUp))
  if (!p.mask) {
    p.stroke(c, 'far', 0.55)
    c.beginPath()
    c.ellipse(
      center.x,
      center.y,
      2.9,
      7.4,
      (lerp(40, 8, pose.shieldUp) * Math.PI) / 180,
      0,
      Math.PI * 2,
    )
    c.stroke()
    p.fill(c, 'far')
    circle(c, add(center, sk.fw, 0.8), 1.3)
  }
}

// ───────────────────────── 动画器 ─────────────────────────

type GuardAnim = { cur: GuardPose; prev: GuardPose; key: string; from: GuardPose; i: number }

export class EnemyArt {
  private readonly comp = new Compositor()
  private readonly guards = new Map<number, GuardAnim>()
  private t = 0

  /** 每个逻辑帧一次：狼卫做姿势过渡。 */
  update(enemies: readonly Enemy[]): void {
    this.t++
    const alive = new Set<number>()
    for (const e of enemies) {
      alive.add(e.id)
      if (e.kind !== 'guard') continue
      const target = guardTarget(e)
      const a = this.guards.get(e.id) ?? { cur: target, prev: target, key: '', from: target, i: 99 }
      const key = `${e.state}:${e.attack?.id ?? ''}`
      if (key !== a.key) {
        a.key = key
        a.from = a.cur
        a.i = e.state === 'windup' || e.state === 'attack' || e.state === 'recover' ? 99 : 0
      }
      a.prev = a.cur
      a.i++
      a.cur = a.i < 4 ? lerpGuard(a.from, target, a.i / 4) : target
      this.guards.set(e.id, a)
    }
    for (const id of this.guards.keys()) if (!alive.has(id)) this.guards.delete(id)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    e: Enemy,
    x: number,
    y: number,
    alpha: number,
    flash: number,
  ): void {
    const def = attackDef(e)
    const warn =
      e.state === 'windup' && def ? (def.telegraph === 'red' ? C.warnRed : C.warnWhite) : null
    const pulse = 0.65 + 0.35 * Math.sin(this.t * 0.8)
    let a = 1
    if (e.state === 'spawn') a = Math.min(1, e.stateFrame / 24)
    if (e.state === 'dead') a = Math.max(0, 1 - e.stateFrame / 50)
    const shake =
      e.state === 'hurt' || e.state === 'parried' || e.state === 'broken'
        ? Math.sin(this.t * 2.1) * 0.8
        : 0
    const colors = flash > 0 ? WHITE : e.kind === 'wolf' ? WOLF_COLORS : GUARD_COLORS
    const halo = warn
      ? {
          color: warn === C.warnRed ? `rgba(255,59,48,${pulse})` : `rgba(255,255,255,${pulse})`,
          blur: warn === C.warnRed ? 10 : 7,
        }
      : null
    const box: Bounds = { x: x - 60, y: y - 80, w: 120, h: 100 }
    if (e.kind === 'wolf') {
      const look = wolfLook(e)
      const moving = e.state === 'idle' && Math.abs(e.vx) > 0.3
      const gait = e.x * 0.32
      this.comp.draw(ctx, box, { colors, rim: RIM, alpha: a, halo }, (c, p) => {
        c.save()
        c.translate(x + shake, y)
        c.scale(e.facing, 1)
        const cy = -13 + look.shape.dy
        if (look.rot) {
          c.translate(0, cy)
          c.rotate((look.rot * Math.PI) / 180)
          c.translate(0, -cy)
        }
        drawWolf(c, p, look.shape, gait, moving, look.jaw, this.t)
        c.restore()
      })
    } else if (e.kind === 'guard') {
      const anim = this.guards.get(e.id)
      const pose = anim ? lerpGuard(anim.prev, anim.cur, alpha) : guardTarget(e)
      const { L, T } = G
      const lying = Math.abs(pose.rot) > 45
      const lift = lying
        ? 5
        : e.state === 'air'
          ? 24
          : groundLift(skeleton(L, { ...pose, rot: 0 }), T)
      this.comp.draw(ctx, box, { colors, rim: RIM, alpha: a, halo }, (c, p) => {
        c.save()
        c.translate(x + shake, y)
        c.scale(e.facing, 1)
        c.translate(0, -lift)
        c.rotate((pose.rot * Math.PI) / 180)
        drawGuard(c, p, pose)
        c.restore()
      })
      if (e.state === 'broken') {
        ctx.fillStyle = C.gold
        for (let i = 0; i < 3; i++) {
          const ang = this.t * 0.2 + (i * Math.PI * 2) / 3
          circle(ctx, P(x + Math.cos(ang) * 7, y - 52 + Math.sin(ang) * 2), 1)
        }
      }
    }
    if (warn === C.warnRed) {
      ctx.save()
      ctx.font = '700 11px "Ma Shan Zheng", "STKaiti", serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = C.warnRed
      ctx.shadowColor = C.warnRed
      ctx.shadowBlur = 6 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
      ctx.fillText('危', x, y - ENEMY_DEFS[e.kind].height - 10)
      ctx.restore()
    }
  }
}
