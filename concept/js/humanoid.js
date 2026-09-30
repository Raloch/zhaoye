// 人形骨骼：所有人形角色共用。
// 姿势 = 每根骨骼的绝对角度；角色差异 = 骨骼长度、粗细和挂在骨骼上的部件。

import { capsule, chain, circle, ellipse, poly, strip } from './figure.js'
import { add, ldir, mid, P, perp, rad, sub, udir, unit } from './util.js'

/** 叶昭的比例：身高 44。其他角色在此基础上缩放。 */
export const HERO_LENS = {
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

export const HERO_THICK = {
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

export function scaleSpec(lens, thick, k, bulk = 1) {
  const L = {}
  for (const [key, v] of Object.entries(lens)) L[key] = v * k
  const T = {}
  for (const [key, v] of Object.entries(thick)) {
    T[key] = Array.isArray(v) ? v.map((x) => x * k * bulk) : v * k * bulk
  }
  return { L, T }
}

/** 正向运动学：从髋部（原点）算出所有关节。 */
export function skeleton(L, pose) {
  const hip = P(0, 0)
  const t = pose.t ?? 0
  const td = udir(t)
  const fw = { x: Math.cos(rad(t)), y: Math.sin(rad(t)) }
  const neck = add(hip, td, L.torso)
  const sh = add(hip, td, L.torso - L.shDrop)
  const headAngle = t + (pose.h ?? 0)
  const head = add(neck, udir(headAngle), L.neck + L.headR)
  const arm = (ua, fa, shift = 0) => {
    const s = add(sh, fw, shift)
    const e = add(s, ldir(ua), L.uArm)
    const w = add(e, ldir(fa), L.fArm)
    const hand = add(w, ldir(fa), 0.9)
    return { s, e, w, hand, fa }
  }
  const leg = (th, sn, ft, shift = 0) => {
    const h = add(hip, fw, shift)
    const k = add(h, ldir(th), L.thigh)
    const a = add(k, ldir(sn), L.shin)
    const toe = add(a, ldir(ft ?? sn + 90), L.foot)
    return { h, k, a, toe }
  }
  return {
    hip,
    neck,
    sh,
    head,
    td,
    fw,
    headAngle,
    armN: arm(pose.uaN ?? 10, pose.faN ?? 20, 0.3),
    armF: arm(pose.uaF ?? -10, pose.faF ?? 0, -0.3),
    legN: leg(pose.thN ?? 8, pose.shN ?? 0, pose.ftN, 0.4),
    legF: leg(pose.thF ?? -8, pose.shF ?? 0, pose.ftF, -0.4),
  }
}

/** 让最低的脚落在 y=0 上：返回需要的髋部高度。 */
export function groundLift(sk, T) {
  const ys = [sk.legN.a.y, sk.legN.toe.y, sk.legF.a.y, sk.legF.toe.y]
  return Math.max(...ys) + T.foot[0]
}

/** 头部本地坐标 → 角色坐标。 */
export function headPoint(sk, lx, ly) {
  const a = rad(sk.headAngle)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return P(sk.head.x + lx * c - ly * s, sk.head.y + lx * s + ly * c)
}

/** 躯干上的点：d 沿脊柱，f 沿前后方向。 */
export function torsoPoint(sk, d, f) {
  return P(sk.hip.x + sk.td.x * d + sk.fw.x * f, sk.hip.y + sk.td.y * d + sk.fw.y * f)
}

// ───────────────────────── 身体部件 ─────────────────────────

export function drawLeg(c, p, leg, T, role) {
  p.fill(c, role)
  capsule(c, leg.h, leg.k, T.thigh[0], T.thigh[1])
  capsule(c, leg.k, leg.a, T.thigh[1] * 0.95, T.shin[1])
  capsule(c, leg.a, leg.toe, T.foot[0], T.foot[1])
}

export function drawArm(c, p, arm, T, role) {
  p.fill(c, role)
  capsule(c, arm.s, arm.e, T.uArm[0], T.uArm[1])
  capsule(c, arm.e, arm.w, T.fArm[0], T.fArm[1])
  circle(c, arm.hand, T.hand)
}

export function drawTorso(c, p, sk, L, T, role) {
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
  c.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
  }
  c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  c.closePath()
  c.fill()
  circle(c, sk.hip, T.hip)
  capsule(c, sk.neck, headPoint(sk, 0, L.headR * 0.6), T.neck, T.neck * 0.9)
}

/** 默认人头：椭圆颅骨 + 鼻梁下巴。 */
export function drawHead(c, p, sk, L, role, { jaw = 1 } = {}) {
  const r = L.headR
  p.fill(c, role)
  c.save()
  c.translate(sk.head.x, sk.head.y)
  c.rotate(rad(sk.headAngle))
  ellipse(c, P(0, 0), r * 0.94, r * 1.04)
  poly(c, [P(r * 0.35, -r * 0.2), P(r * 1.08, r * 0.22), P(r * 0.92, r * 0.55), P(r * 0.95, r * 0.7 * jaw), P(r * 0.55, r * 1.08 * jaw), P(0, r * 0.9)])
  c.restore()
}

/** 布片：沿方向 dir 从 top 垂下的梯形，用于衣摆、甲裙。 */
export function flap(c, top, dir, length, w0, w1, bend = 0) {
  const d = unit(dir)
  const n = perp(d)
  const bottom = add(top, d, length)
  const midp = add(add(top, d, length * 0.55), n, bend)
  const pts = [add(top, n, w0), add(midp, n, (w0 + w1) / 2), add(bottom, n, w1), add(bottom, d, 0.6), add(bottom, n, -w1), add(midp, n, -(w0 + w1) / 2), add(top, n, -w0)]
  poly(c, pts)
}

// ───────────────────────── 武器 ─────────────────────────

/** 直剑。glow=true 时为照夜剑。 */
export function drawJian(c, p, hand, angle, { length = 19, glow = false, tassel = 'accent' } = {}) {
  const d = ldir(angle)
  const n = perp(d)
  const A = (s, w = 0) => add(add(hand, d, s), n, w)
  p.fill(c, 'near')
  capsule(c, A(-3.2), A(1.1), 0.62, 0.62)
  circle(c, A(-3.7), 0.85)
  capsule(c, A(1.3, -1.9), A(1.3, 1.9), 0.55, 0.55)
  if (tassel && !p.mask) {
    const pts = chain(A(-3.9), 5.5, 4, angle + 180 + 20, 10, 8, angle / 30)
    p.fill(c, tassel)
    strip(c, pts, 0.55, 0.2)
  }
  c.save()
  if (glow) p.glow(c, 'bladeGlow', 5)
  p.fill(c, glow ? 'blade' : 'iron')
  poly(c, [A(1.7, -0.72), A(length - 2.4, -0.62), A(length, 0), A(length - 2.4, 0.62), A(1.7, 0.72)])
  c.restore()
}

/** 弯刀。 */
export function drawSaber(c, p, hand, angle, { length = 16, role = 'near', glowRole = null } = {}) {
  const d = ldir(angle)
  const n = perp(d)
  const A = (s, w = 0) => add(add(hand, d, s), n, w)
  p.fill(c, 'near')
  capsule(c, A(-2.8), A(0.9), 0.6, 0.6)
  capsule(c, A(1.1, -1.6), A(1.1, 1.6), 0.5, 0.5)
  c.save()
  if (glowRole) p.glow(c, glowRole, 4)
  p.fill(c, role)
  c.beginPath()
  const s = A(1.4, -0.6)
  c.moveTo(s.x, s.y)
  const c1 = A(length * 0.55, -1.4)
  const tip = A(length, 2.6)
  c.quadraticCurveTo(c1.x, c1.y, tip.x, tip.y)
  const c2 = A(length * 0.5, 1.9)
  const e = A(1.4, 1.0)
  c.quadraticCurveTo(c2.x, c2.y, e.x, e.y)
  c.closePath()
  c.fill()
  c.restore()
}

/** 长柄大刀（镇岳）。 */
export function drawGuandao(c, p, hand, angle, { pole = 42, back = 16, blade = 20, role = 'near' } = {}) {
  const d = ldir(angle)
  const n = perp(d)
  const A = (s, w = 0) => add(add(hand, d, s), n, w)
  p.fill(c, role)
  capsule(c, A(-back), A(pole), 1.1, 1.0)
  circle(c, A(-back - 1), 1.8)
  capsule(c, A(pole - 1, -2.8), A(pole - 1, 2.8), 0.9, 0.9)
  c.beginPath()
  const b0 = A(pole, -2.2)
  c.moveTo(b0.x, b0.y)
  const b1 = A(pole + blade * 0.55, -6.5)
  const tip = A(pole + blade, 1)
  c.quadraticCurveTo(b1.x, b1.y, tip.x, tip.y)
  const b2 = A(pole + blade * 0.5, 3.6)
  const b3 = A(pole, 2.4)
  c.quadraticCurveTo(b2.x, b2.y, b3.x, b3.y)
  c.closePath()
  c.fill()
  // 刀背的齿
  poly(c, [A(pole + blade * 0.3, -4.6), A(pole + blade * 0.36, -7.4), A(pole + blade * 0.44, -5.2)])
}

/** 戟（幻影魔兵）。 */
export function drawJi(c, p, hand, angle, { pole = 30, back = 10, role = 'near' } = {}) {
  const d = ldir(angle)
  const n = perp(d)
  const A = (s, w = 0) => add(add(hand, d, s), n, w)
  p.fill(c, role)
  capsule(c, A(-back), A(pole), 0.55, 0.5)
  poly(c, [A(pole, -0.9), A(pole + 7, 0), A(pole, 0.9)])
  c.beginPath()
  const m0 = A(pole - 3, 0.5)
  c.moveTo(m0.x, m0.y)
  const m1 = A(pole - 1, 5)
  const m2 = A(pole - 6, 4.2)
  c.quadraticCurveTo(m1.x, m1.y, m2.x, m2.y)
  const m3 = A(pole - 5.5, 0.5)
  c.lineTo(m3.x, m3.y)
  c.closePath()
  c.fill()
  // 戟缨
  if (!p.mask) {
    p.fill(c, 'accent')
    strip(c, chain(A(pole - 7.5), 5, 4, angle + 150, angle + 190, 6), 0.9, 0.3)
  }
}

export { mid, sub }
