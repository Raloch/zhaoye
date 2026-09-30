import { add, ldir, lerp, lerpAngle, P, type Pt, perp, rad, sub, udir, unit } from './math'
import { capsule, circle, ellipse, type Paint, poly } from './paint'

/**
 * 人形骨骼（与 concept/js/humanoid.js 同一套）。姿势 = 每根骨骼的绝对角度。
 * 所有人形角色共用骨骼，只改长度、粗细和部件。
 */

export type Pose = {
  /** 躯干倾角 */
  t: number
  /** 头相对躯干的偏转 */
  h: number
  /** 近侧大腿、小腿、脚 */
  thN: number
  shN: number
  ftN: number
  /** 远侧大腿、小腿、脚 */
  thF: number
  shF: number
  ftF: number
  /** 近侧上臂、前臂（持剑手） */
  uaN: number
  faN: number
  /** 远侧上臂、前臂 */
  uaF: number
  faF: number
  /** 剑的角度 */
  sw: number
  /** 整体绕髋旋转（被击飞、倒地） */
  rot: number
  /** 竖直缩放：落地压扁、起跳拉长 */
  sq: number
  /** 剑光强度 0～1 */
  glow: number
}

const ANGLES: readonly (keyof Pose)[] = [
  't',
  'h',
  'thN',
  'shN',
  'ftN',
  'thF',
  'shF',
  'ftF',
  'uaN',
  'faN',
  'uaF',
  'faF',
  'sw',
  'rot',
]

export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const out = { ...b }
  for (const key of ANGLES) out[key] = lerpAngle(a[key], b[key], k)
  out.sq = lerp(a.sq, b.sq, k)
  out.glow = lerp(a.glow, b.glow, k)
  return out
}

export type Lens = {
  torso: number
  shDrop: number
  neck: number
  headR: number
  uArm: number
  fArm: number
  thigh: number
  shin: number
  foot: number
}

export type Thick = {
  hip: number
  waist: number
  chest: number
  neck: number
  uArm: readonly [number, number]
  fArm: readonly [number, number]
  hand: number
  thigh: readonly [number, number]
  shin: readonly [number, number]
  foot: readonly [number, number]
}

export const HERO_LENS: Lens = {
  torso: 13,
  shDrop: 1.6,
  neck: 1.6,
  headR: 3.6,
  uArm: 8,
  fArm: 7.4,
  thigh: 10.5,
  shin: 10.2,
  foot: 4,
}

export const HERO_THICK: Thick = {
  hip: 3.9,
  waist: 3.2,
  chest: 4.9,
  neck: 1.4,
  uArm: [2.1, 1.6],
  fArm: [1.6, 1.2],
  hand: 1.35,
  thigh: [3.1, 2.2],
  shin: [2.1, 1.35],
  foot: [1.45, 0.95],
}

export function scaleSpec(lens: Lens, thick: Thick, k: number, bulk = 1): { L: Lens; T: Thick } {
  const L = Object.fromEntries(Object.entries(lens).map(([key, v]) => [key, v * k])) as Lens
  const s = k * bulk
  const T: Thick = {
    hip: thick.hip * s,
    waist: thick.waist * s,
    chest: thick.chest * s,
    neck: thick.neck * s,
    uArm: [thick.uArm[0] * s, thick.uArm[1] * s],
    fArm: [thick.fArm[0] * s, thick.fArm[1] * s],
    hand: thick.hand * s,
    thigh: [thick.thigh[0] * s, thick.thigh[1] * s],
    shin: [thick.shin[0] * s, thick.shin[1] * s],
    foot: [thick.foot[0] * s, thick.foot[1] * s],
  }
  return { L, T }
}

export type Arm = { s: Pt; e: Pt; w: Pt; hand: Pt; fa: number }
export type Leg = { h: Pt; k: Pt; a: Pt; toe: Pt }

export type Skeleton = {
  hip: Pt
  neck: Pt
  sh: Pt
  head: Pt
  td: Pt
  fw: Pt
  headAngle: number
  armN: Arm
  armF: Arm
  legN: Leg
  legF: Leg
}

/** 正向运动学：髋部在原点。 */
export function skeleton(L: Lens, p: Pose): Skeleton {
  const hip = P(0, 0)
  const td = udir(p.t)
  const fw = { x: Math.cos(rad(p.t)), y: Math.sin(rad(p.t)) }
  const neck = add(hip, td, L.torso)
  const sh = add(hip, td, L.torso - L.shDrop)
  const headAngle = p.t + p.h
  const head = add(neck, udir(headAngle), L.neck + L.headR)
  const arm = (ua: number, fa: number, shift: number): Arm => {
    const s = add(sh, fw, shift)
    const e = add(s, ldir(ua), L.uArm)
    const w = add(e, ldir(fa), L.fArm)
    return { s, e, w, hand: add(w, ldir(fa), 0.9), fa }
  }
  const leg = (th: number, sn: number, ft: number, shift: number): Leg => {
    const h = add(hip, fw, shift)
    const k = add(h, ldir(th), L.thigh)
    const a = add(k, ldir(sn), L.shin)
    return { h, k, a, toe: add(a, ldir(ft), L.foot) }
  }
  return {
    hip,
    neck,
    sh,
    head,
    td,
    fw,
    headAngle,
    armN: arm(p.uaN, p.faN, 0.3),
    armF: arm(p.uaF, p.faF, -0.3),
    legN: leg(p.thN, p.shN, p.ftN, 0.4),
    legF: leg(p.thF, p.shF, p.ftF, -0.4),
  }
}

/** 让最低的脚落在 y=0：返回髋部应在的高度。 */
export function groundLift(sk: Skeleton, T: Thick): number {
  return Math.max(sk.legN.a.y, sk.legN.toe.y, sk.legF.a.y, sk.legF.toe.y) + T.foot[0]
}

export function headPoint(sk: Skeleton, lx: number, ly: number): Pt {
  const a = rad(sk.headAngle)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return P(sk.head.x + lx * c - ly * s, sk.head.y + lx * s + ly * c)
}

export function torsoPoint(sk: Skeleton, d: number, f: number): Pt {
  return P(sk.hip.x + sk.td.x * d + sk.fw.x * f, sk.hip.y + sk.td.y * d + sk.fw.y * f)
}

export function drawLeg(
  c: CanvasRenderingContext2D,
  p: Paint,
  leg: Leg,
  T: Thick,
  role: string,
): void {
  p.fill(c, role)
  capsule(c, leg.h, leg.k, T.thigh[0], T.thigh[1])
  capsule(c, leg.k, leg.a, T.thigh[1] * 0.95, T.shin[1])
  capsule(c, leg.a, leg.toe, T.foot[0], T.foot[1])
}

export function drawArm(
  c: CanvasRenderingContext2D,
  p: Paint,
  arm: Arm,
  T: Thick,
  role: string,
): void {
  p.fill(c, role)
  capsule(c, arm.s, arm.e, T.uArm[0], T.uArm[1])
  capsule(c, arm.e, arm.w, T.fArm[0], T.fArm[1])
  circle(c, arm.hand, T.hand)
}

export function drawTorso(
  c: CanvasRenderingContext2D,
  p: Paint,
  sk: Skeleton,
  L: Lens,
  T: Thick,
  role: string,
): void {
  const pts = [
    torsoPoint(sk, -0.6, -T.hip * 0.95),
    torsoPoint(sk, L.torso * 0.42, -T.waist * 0.95),
    torsoPoint(sk, L.torso * 0.8, -T.chest * 0.82),
    torsoPoint(sk, L.torso * 1.0, -T.neck * 1.1),
    torsoPoint(sk, L.torso * 1.0, T.neck * 1.1),
    torsoPoint(sk, L.torso * 0.72, T.chest),
    torsoPoint(sk, L.torso * 0.4, T.waist),
    torsoPoint(sk, -0.6, T.hip),
  ]
  p.fill(c, role)
  c.beginPath()
  const first = pts[0] ?? sk.hip
  c.moveTo(first.x, first.y)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] ?? first
    const b = pts[i] ?? first
    c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
  }
  const last = pts[pts.length - 1] ?? first
  c.lineTo(last.x, last.y)
  c.closePath()
  c.fill()
  circle(c, sk.hip, T.hip)
  capsule(c, sk.neck, headPoint(sk, 0, L.headR * 0.6), T.neck, T.neck * 0.9)
}

export function drawHead(
  c: CanvasRenderingContext2D,
  p: Paint,
  sk: Skeleton,
  L: Lens,
  role: string,
): void {
  const r = L.headR
  p.fill(c, role)
  c.save()
  c.translate(sk.head.x, sk.head.y)
  c.rotate(rad(sk.headAngle))
  ellipse(c, P(0, 0), r * 0.94, r * 1.04)
  poly(c, [
    P(r * 0.35, -r * 0.2),
    P(r * 1.08, r * 0.22),
    P(r * 0.92, r * 0.55),
    P(r * 0.95, r * 0.7),
    P(r * 0.55, r * 1.08),
    P(0, r * 0.9),
  ])
  c.restore()
}

/** 布片：沿方向 dir 从 top 垂下的梯形（衣摆、甲裙）。 */
export function flap(
  c: CanvasRenderingContext2D,
  top: Pt,
  dir: Pt,
  length: number,
  w0: number,
  w1: number,
  bend = 0,
): void {
  const d = unit(dir)
  const n = perp(d)
  const bottom = add(top, d, length)
  const midp = add(add(top, d, length * 0.55), n, bend)
  poly(c, [
    add(top, n, w0),
    add(midp, n, (w0 + w1) / 2),
    add(bottom, n, w1),
    add(bottom, d, 0.6),
    add(bottom, n, -w1),
    add(midp, n, -(w0 + w1) / 2),
    add(top, n, -w0),
  ])
}

/** 前后两条大腿里哪条更靠前。 */
export function thighDirs(sk: Skeleton): { front: Pt; back: Pt } {
  const dN = unit(sub(sk.legN.k, sk.hip))
  const dF = unit(sub(sk.legF.k, sk.hip))
  const nFront = dN.x * sk.fw.x + dN.y * sk.fw.y >= dF.x * sk.fw.x + dF.y * sk.fw.y
  return nFront ? { front: dN, back: dF } : { front: dF, back: dN }
}

/** 直剑。返回剑尖和剑根，供剑光拖尾使用。 */
export function drawJian(
  c: CanvasRenderingContext2D,
  p: Paint,
  hand: Pt,
  angle: number,
  glow: number,
  length = 19,
): { base: Pt; tip: Pt } {
  const d = ldir(angle)
  const n = perp(d)
  const A = (s: number, w = 0): Pt => add(add(hand, d, s), n, w)
  p.fill(c, 'near')
  capsule(c, A(-3.2), A(1.1), 0.62, 0.62)
  circle(c, A(-3.7), 0.85)
  capsule(c, A(1.3, -1.9), A(1.3, 1.9), 0.55, 0.55)
  c.save()
  p.glow(c, 'bladeGlow', 3 + glow * 6)
  p.fill(c, 'blade')
  poly(c, [
    A(1.7, -0.72),
    A(length - 2.4, -0.62),
    A(length, 0),
    A(length - 2.4, 0.62),
    A(1.7, 0.72),
  ])
  c.restore()
  return { base: A(4), tip: A(length) }
}
