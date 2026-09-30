// 角色与怪物的绘制。每个函数返回 fn(c, paint)，交给 drawFigure 合成。
// 本地坐标：原点在脚下地面，朝右，y 向下，单位是逻辑像素。

import { blob, capsule, chain, circle, curve, ellipse, glowDot, poly, strip } from './figure.js'
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
  scaleSpec,
  skeleton,
  torsoPoint,
} from './humanoid.js'
import { add, dot, len, lerp, ldir, mid, mulberry32, P, perp, rad, sub, unit } from './util.js'

// ───────────────────────── 叶昭 ─────────────────────────

export const HERO_POSES = {
  idle: {
    t: 8, h: -4,
    thN: 26, shN: -4, thF: -18, shF: -12,
    uaN: 30, faN: 74, uaF: -30, faF: 150, sw: 70,
    hair: { tail: [-118, -40], rib: [-112, -68], wave: 14 },
  },
  run: {
    t: 26, h: -12,
    thN: 62, shN: 8, thF: -42, shF: -105, ftF: -30,
    uaN: -55, faN: -72, uaF: 60, faF: 105, sw: -100,
    hair: { tail: [-100, -92], rib: [-96, -88], wave: 8 },
  },
  slam: {
    t: 38, h: 8,
    thN: 76, shN: 4, thF: -58, shF: -74, ftF: 10,
    uaN: 72, faN: 70, uaF: -95, faF: -70, sw: 48,
    hair: { tail: [-120, -95], rib: [-128, -105], wave: 16 },
    trail: { a0: 185, a1: 50, r0: 6, r1: 30 },
  },
  rise: {
    t: -10, h: -14,
    thN: 32, shN: -8, thF: -22, shF: -30,
    uaN: 150, faN: 166, uaF: -48, faF: -22, sw: 172,
    hair: { tail: [-40, -10], rib: [-60, -20], wave: 12 },
    trail: { a0: 40, a1: 175, r0: 6, r1: 28 },
  },
  plunge: {
    air: 30, t: 18, h: 20,
    thN: 88, shN: -22, thF: 34, shF: -62,
    uaN: 38, faN: 8, uaF: 30, faF: 14, sw: 2,
    hair: { tail: [175, 165], rib: [170, 150], wave: 10 },
  },
  rising: {
    air: 22, t: -6, h: -24,
    thN: 104, shN: 8, thF: -6, shF: -8,
    uaN: 176, faN: 182, uaF: -64, faF: -44, sw: 181,
    hair: { tail: [8, 20], rib: [12, 30], wave: 18 },
  },
  guard: {
    t: 4, h: -2,
    thN: 20, shN: -6, thF: -22, shF: -8,
    uaN: 40, faN: 150, uaF: 30, faF: 120, sw: 168,
    hair: { tail: [-118, -45], rib: [-115, -75], wave: 10 },
  },
}

export function hero(pose, { glow = true, bladeLength = 19 } = {}) {
  const { L, T } = scaleSpec(HERO_LENS, HERO_THICK, 1)
  return (c, p) => {
    const sk = skeleton(L, pose)
    const lift = groundLift(sk, T) + (pose.air ?? 0)
    c.translate(0, -lift)
    const r = L.headR
    const hair = pose.hair

    // 1. 身后：马尾、发带、腰带尾
    const tie = headPoint(sk, -r * 0.62, -r * 0.9)
    p.fill(c, 'near')
    strip(c, chain(tie, pose.air != null ? 9 : 11, 7, hair.tail[0], hair.tail[1], hair.wave * 0.6, 1), 1.9, 0.4)
    const band = headPoint(sk, -r * 0.92, -r * 0.35)
    p.fill(c, 'accent')
    strip(c, chain(band, 16, 8, hair.rib[0], hair.rib[1], hair.wave, 0), 0.75, 0.35)
    strip(c, chain(band, 12.5, 7, hair.rib[0] + 14, hair.rib[1] + 10, hair.wave * 0.8, 2), 0.7, 0.3)
    const sash = torsoPoint(sk, 3.8, -T.hip * 0.9)
    strip(c, chain(sash, 7, 4, hair.rib[0] + 60, hair.rib[1] + 50, hair.wave * 0.5, 3), 0.8, 0.3)

    // 2. 远侧肢体
    drawArm(c, p, sk.armF, T, 'far')
    drawLeg(c, p, sk.legF, T, 'far')

    // 3. 衣摆（后片）
    const dN = unit(sub(sk.legN.k, sk.hip))
    const dF = unit(sub(sk.legF.k, sk.hip))
    const frontIsN = dot(dN, sk.fw) >= dot(dF, sk.fw)
    const front = frontIsN ? dN : dF
    const back = frontIsN ? dF : dN
    p.fill(c, 'far')
    flap(c, torsoPoint(sk, 2.4, -T.hip * 0.4), back, 9, 2.6, 3.4, -1.2)

    // 4. 躯干、近侧腿、前片、腰带
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

    // 5. 头与发型
    drawHead(c, p, sk, L, 'near')
    p.fill(c, 'near')
    c.save()
    c.translate(sk.head.x, sk.head.y)
    c.rotate((sk.headAngle * Math.PI) / 180)
    ellipse(c, P(-r * 0.16, -r * 0.24), r * 1.0, r * 0.86)
    poly(c, [P(-r * 0.2, -r * 1.06), P(r * 0.92, -r * 0.62), P(r * 1.04, -r * 0.08), P(r * 0.64, -r * 0.4), P(r * 0.52, r * 0.02), P(r * 0.12, -r * 0.5)])
    circle(c, P(-r * 0.52, -r * 0.86), r * 0.36)
    p.fill(c, 'accent')
    poly(c, [P(r * 0.88, -r * 0.5), P(r * 0.95, -r * 0.22), P(-r * 0.95, -r * 0.2), P(-r * 0.9, -r * 0.52)])
    c.restore()

    // 6. 近侧手臂与剑
    drawArm(c, p, sk.armN, T, 'near')
    drawJian(c, p, sk.armN.hand, pose.sw, { glow, length: bladeLength })
    // 护腕
    const wr = sk.armN
    const wd = unit(sub(wr.w, wr.e))
    p.fill(c, 'near')
    capsule(c, add(wr.w, wd, -2.2), add(wr.w, wd, -0.2), T.fArm[1] * 1.15, T.fArm[1] * 1.15)
  }
}

/** 剑光拖尾在角色坐标系中的圆心（近侧肩膀）与参数。 */
export function heroTrail(pose) {
  const { L, T } = scaleSpec(HERO_LENS, HERO_THICK, 1)
  const sk = skeleton(L, pose)
  const lift = groundLift(sk, T) + (pose.air ?? 0)
  return { center: P(sk.armN.s.x, sk.armN.s.y - lift), ...pose.trail }
}


// ───────────────────────── 通用人形（其他角色共用） ─────────────────────────

/**
 * 按固定图层顺序画一个人形，差异通过 hooks 注入：
 * back → 远侧手臂 → weaponF → 远侧腿 → afterFar → 躯干 → 近侧腿 → body → 头 → headDeco → 近侧手臂 → weaponN → front
 */
export function person({ k = 1, bulk = 1, lens = {}, thick = {}, pose, hooks = {} }) {
  const { L, T } = scaleSpec({ ...HERO_LENS, ...lens }, { ...HERO_THICK, ...thick }, k, bulk)
  return (c, p) => {
    const sk = skeleton(L, pose)
    const lift = groundLift(sk, T) + (pose.air ?? 0)
    c.translate(0, -lift)
    const x = { c, p, sk, L, T, pose, k, r: L.headR }
    if (hooks.back) hooks.back(x)
    if (!hooks.noFarArm) drawArm(c, p, sk.armF, T, 'far')
    if (hooks.weaponF) hooks.weaponF(x)
    if (!hooks.noLegs) drawLeg(c, p, sk.legF, T, 'far')
    if (hooks.afterFar) hooks.afterFar(x)
    if (hooks.torso) hooks.torso(x)
    else drawTorso(c, p, sk, L, T, 'near')
    if (!hooks.noLegs) drawLeg(c, p, sk.legN, T, 'near')
    if (hooks.body) hooks.body(x)
    if (hooks.head) hooks.head(x)
    else drawHead(c, p, sk, L, 'near')
    if (hooks.headDeco) hooks.headDeco(x)
    if (hooks.nearArm) hooks.nearArm(x)
    else drawArm(c, p, sk.armN, T, 'near')
    if (hooks.weaponN) hooks.weaponN(x)
    if (hooks.front) hooks.front(x)
  }
}

/** 在头部本地坐标系里绘制：(0,0) 是头心，x 朝前。 */
export function inHead(x, f) {
  const { c, sk } = x
  c.save()
  c.translate(sk.head.x, sk.head.y)
  c.rotate(rad(sk.headAngle))
  f(c)
  c.restore()
}

export function thighDirs(sk) {
  const dN = unit(sub(sk.legN.k, sk.hip))
  const dF = unit(sub(sk.legF.k, sk.hip))
  return dot(dN, sk.fw) >= dot(dF, sk.fw) ? { front: dN, back: dF } : { front: dF, back: dN }
}

/** 长袍：从腰到脚踝，下摆外扩。 */
export function robe(x, { top = 3, flare = 3, role = 'near', hemLift = 0.4, sway = 0 } = {}) {
  const { c, p, sk, T } = x
  const aN = sk.legN.a
  const aF = sk.legF.a
  const fa = aN.x >= aF.x ? aN : aF
  const ba = aN.x >= aF.x ? aF : aN
  const wF = torsoPoint(sk, top, T.waist * 1.25)
  const wB = torsoPoint(sk, top, -T.waist * 1.3)
  const hemF = P(fa.x + flare + T.foot[0], fa.y - hemLift)
  const hemB = P(ba.x - flare - T.foot[0] + sway, ba.y - hemLift)
  const kneeF = P((wF.x + hemF.x) / 2 + flare * 0.25, (wF.y + hemF.y) / 2)
  const kneeB = P((wB.x + hemB.x) / 2 - flare * 0.25 + sway * 0.5, (wB.y + hemB.y) / 2)
  p.fill(c, role)
  c.beginPath()
  c.moveTo(wB.x, wB.y)
  c.lineTo(wF.x, wF.y)
  c.quadraticCurveTo(kneeF.x, kneeF.y, hemF.x, hemF.y)
  const n = 6
  for (let i = 1; i <= n; i++) {
    const t = i / n
    c.lineTo(lerp(hemF.x, hemB.x, t), lerp(hemF.y, hemB.y, t) + (i % 2 ? 0.6 * x.k : -0.1))
  }
  c.quadraticCurveTo(kneeB.x, kneeB.y, wB.x, wB.y)
  c.closePath()
  c.fill()
}

/** 广袖：挂在肘到腕之间，向下垂。 */
export function sleeve(x, arm, { drop = 7, w = 2.2, role = 'near', sway = 0 } = {}) {
  const { c, p } = x
  const d = unit(sub(arm.w, arm.e))
  const n0 = perp(d)
  const up = n0.y < 0 ? n0 : P(-n0.x, -n0.y)
  const e1 = add(arm.e, up, w * 0.6)
  const w1 = add(arm.w, up, w * 0.8)
  const w2 = P(arm.w.x + d.x * 1.5 + sway, arm.w.y + drop)
  const m2 = P((arm.e.x + arm.w.x) / 2 + sway * 0.5, (arm.e.y + arm.w.y) / 2 + drop * 0.85)
  const e2 = add(arm.e, up, -w * 0.9)
  p.fill(c, role)
  c.beginPath()
  c.moveTo(e1.x, e1.y)
  c.lineTo(w1.x, w1.y)
  c.quadraticCurveTo(arm.w.x + d.x * 2.4, arm.w.y + drop * 0.4, w2.x, w2.y)
  c.quadraticCurveTo((w2.x + m2.x) / 2, w2.y + 0.8, m2.x, m2.y)
  c.quadraticCurveTo(e2.x, e2.y + drop * 0.3, e2.x, e2.y)
  c.closePath()
  c.fill()
}

/** 棱角分明的石块：包住线段 a→b。 */
export function rock(c, a, b, r1, r2, seed = 1) {
  const rng = mulberry32(seed)
  const d = unit(sub(b, a))
  const n = perp(d)
  const L = len(sub(b, a))
  const j = () => 0.82 + rng() * 0.32
  const side = (s) => [0, 0.34, 0.68, 1].map((t) => add(add(a, d, L * t), n, s * lerp(r1, r2, t) * j()))
  const cap = (q, r, sgn) => [0.6, 0, -0.6].map((u) => add(add(q, d, sgn * r * Math.cos(u) * j()), n, sgn * r * Math.sin(u) * 0.95))
  const pts = [...side(1), ...cap(b, r2, 1), ...side(-1).reverse(), ...cap(a, r1, -1)]
  poly(c, pts)
}

export { add, blob, capsule, chain, circle, curve, dot, ellipse, glowDot, len, lerp, ldir, mid, P, perp, poly, rad, strip, sub, unit }
