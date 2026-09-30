// 人形角色：NPC、人形杂兵、人形 Boss。全部复用 humanoid.js 的骨骼。

import {
  add,
  blob,
  capsule,
  chain,
  circle,
  curve,
  ellipse,
  glowDot,
  inHead,
  ldir,
  mid,
  P,
  perp,
  person,
  poly,
  robe,
  rock,
  sleeve,
  strip,
  sub,
  thighDirs,
  unit,
} from './cast.js'
import {
  drawArm,
  drawGuandao,
  drawJi,
  drawLeg,
  drawSaber,
  flap,
  groundLift,
  HERO_LENS,
  HERO_THICK,
  headPoint,
  scaleSpec,
  skeleton,
  torsoPoint,
} from './humanoid.js'

// ───────────────────────── 玄一真人 ─────────────────────────

export function xuanyi() {
  const pose = { t: 12, h: 6, thN: 5, shN: 0, thF: -5, shF: 0, uaN: 16, faN: 92, uaF: -12, faF: 36 }
  return person({
    k: 1,
    bulk: 0.95,
    lens: { headR: 3.5 },
    pose,
    hooks: {
      afterFar: (x) => sleeve(x, x.sk.armF, { drop: 7, role: 'far' }),
      body: (x) => {
        robe(x, { flare: 3.6, top: 2.5 })
        x.p.fill(x.c, 'accent')
        poly(x.c, [
          torsoPoint(x.sk, 4.4, -x.T.waist * 1.3),
          torsoPoint(x.sk, 5.6, -x.T.waist * 1.25),
          torsoPoint(x.sk, 5.6, x.T.waist * 1.2),
          torsoPoint(x.sk, 4.4, x.T.waist * 1.25),
        ])
      },
      headDeco: (x) => {
        const { c, p, r } = x
        inHead(x, () => {
          p.fill(c, 'near')
          ellipse(c, P(-r * 0.15, -r * 0.3), r * 0.98, r * 0.8)
          circle(c, P(-r * 0.15, -r * 1.12), r * 0.52)
          p.fill(c, 'accent')
          capsule(c, P(-r * 0.95, -r * 1.02), P(r * 0.7, -r * 1.3), 0.3, 0.3)
        })
        p.fill(c, 'pale')
        strip(c, chain(headPoint(x.sk, r * 0.62, r * 0.85), 9, 5, 2, -14, 4, 1), 1.35, 0.2)
        strip(c, chain(headPoint(x.sk, r * 0.95, r * 0.4), 3, 3, 40, -10, 0), 0.55, 0.15)
        inHead(x, () => {
          p.fill(c, 'pale')
          capsule(c, P(r * 0.3, -r * 0.42), P(r * 0.85, -r * 0.3), 0.35, 0.2)
        })
      },
      nearArm: (x) => {
        drawArm(x.c, x.p, x.sk.armN, x.T, 'near')
      },
      weaponN: (x) => {
        const { c, p, sk } = x
        const h = sk.armN.hand
        const top = add(h, ldir(160), 5.5)
        p.fill(c, 'accent')
        capsule(c, add(h, ldir(160), -1.2), top, 0.42, 0.42)
        p.fill(c, 'pale')
        strip(c, chain(top, 13, 8, -85, -8, 10, 1), 1.5, 0.3)
        sleeve(x, sk.armN, { drop: 6.5, w: 2.2 })
      },
    },
  })
}

// ───────────────────────── 魔君玄霜 ─────────────────────────

export function xuanshuang() {
  const pose = { t: -2, h: -6, thN: 5, shN: 0, thF: -5, shF: 0, uaN: 56, faN: 120, uaF: -12, faF: 14 }
  return person({
    k: 1.09,
    bulk: 0.9,
    lens: { headR: 3.4 },
    pose,
    hooks: {
      back: (x) => {
        const { c, p, sk, r } = x
        p.fill(c, 'hair')
        strip(c, chain(headPoint(sk, -r * 0.8, -r * 0.1), 27, 9, -12, 4, 5, 0.6), 3.3, 1.1)
        strip(c, chain(headPoint(sk, -r * 0.4, -r * 0.8), 23, 8, -34, -6, 7, 2), 2.3, 0.6)
      },
      afterFar: (x) => sleeve(x, x.sk.armF, { drop: 9, w: 2.4, role: 'far' }),
      body: (x) => {
        robe(x, { flare: 4.2, top: 2.5 })
        x.p.fill(x.c, 'accent')
        poly(x.c, [
          torsoPoint(x.sk, 4.6, -x.T.waist * 1.3),
          torsoPoint(x.sk, 5.8, -x.T.waist * 1.25),
          torsoPoint(x.sk, 5.8, x.T.waist * 1.2),
          torsoPoint(x.sk, 4.6, x.T.waist * 1.25),
        ])
        x.p.fill(x.c, 'accent')
        strip(x.c, chain(torsoPoint(x.sk, 4.8, x.T.waist * 1.2), 12, 5, 4, -8, 4), 0.6, 0.25)
      },
      headDeco: (x) => {
        const { c, p, r, sk } = x
        inHead(x, () => {
          p.fill(c, 'hair')
          ellipse(c, P(-r * 0.12, -r * 0.3), r * 1.02, r * 0.86)
          poly(c, [P(-r * 0.1, -r * 1.1), P(r * 0.95, -r * 0.55), P(r * 0.95, r * 0.2), P(r * 0.55, -r * 0.3)])
          p.fill(c, 'near')
          blob(c, [P(r * 0.15, -r * 0.95), P(r * 0.55, -r * 1.85), P(r * 0.95, -r * 2.05), P(r * 0.62, -r * 1.2)])
          blob(c, [P(-r * 0.45, -r * 0.95), P(-r * 0.4, -r * 1.9), P(-r * 0.05, -r * 2.0), P(0, -r * 1.1)])
        })
        if (!p.mask) {
          inHead(x, () => {
            c.save()
            p.glow(c, 'accent', 4)
            p.fill(c, 'accent')
            c.beginPath()
            c.arc(0, -r * 0.55, r * 1.25, Math.PI * 1.12, Math.PI * 1.88)
            c.arc(0, -r * 0.2, r * 1.2, Math.PI * 1.8, Math.PI * 1.2, true)
            c.closePath()
            c.fill()
            c.restore()
          })
        }
        p.fill(c, 'hair')
        strip(c, chain(headPoint(sk, r * 0.45, -r * 0.35), 9, 5, 8, -4, 3), 0.9, 0.3)
      },
      weaponN: (x) => sleeve(x, x.sk.armN, { drop: 8, w: 2.4 }),
      front: (x) => {
        const { c, p, sk } = x
        if (p.mask) return
        const h = sk.armN.hand
        const shards = [
          [6, -4, 1.6],
          [3, -9, 1.1],
          [9, 3, 1.0],
          [11, -8, 0.8],
        ]
        c.save()
        p.glow(c, 'accent', 5)
        p.fill(c, 'accent')
        for (const [dx, dy, s] of shards) {
          const q = P(h.x + dx, h.y + dy)
          poly(c, [P(q.x, q.y - s * 2), P(q.x + s, q.y), P(q.x, q.y + s * 2), P(q.x - s, q.y)])
        }
        c.restore()
      },
    },
  })
}

// ───────────────────────── 蜃楼 ─────────────────────────

export function shenlou() {
  const pose = { air: 9, t: -3, h: -5, thN: 4, shN: 0, thF: -4, shF: 0, uaN: 42, faN: 112, uaF: -32, faF: 40 }
  return person({
    k: 1.18,
    bulk: 0.9,
    lens: { headR: 3.3 },
    pose,
    hooks: {
      noLegs: true,
      back: (x) => {
        const { c, p, sk, r } = x
        p.fill(c, 'near')
        strip(c, chain(headPoint(sk, -r * 0.7, -r * 0.2), 18, 7, -18, -2, 4), 2.2, 0.5)
        if (!p.mask) {
          const base = add(sk.hip, P(0, 1), 0)
          c.save()
          p.glow(c, 'mist', 6)
          c.globalAlpha = 0.55
          p.fill(c, 'mist')
          const tails = [
            [-2, 18, -70, -120, 9, 4.2],
            [1, 22, -60, -100, 7, 3.4],
            [3, 14, -40, -95, 11, 2.6],
          ]
          for (const [dx, l, a0, a1, w, wd] of tails) {
            strip(c, chain(P(base.x + dx, base.y + 14), l, 8, a0, a1, w, dx), wd, 0.2)
          }
          c.restore()
        }
      },
      afterFar: (x) => sleeve(x, x.sk.armF, { drop: 9, w: 2.5, role: 'far' }),
      body: (x) => {
        const { c, p, sk, T } = x
        const hem = sk.hip.y + 16
        p.fill(c, 'near')
        blob(c, [
          torsoPoint(sk, 3, -T.waist * 1.3),
          torsoPoint(sk, 3, T.waist * 1.3),
          P(sk.hip.x + 6, hem - 5),
          P(sk.hip.x + 3.5, hem),
          P(sk.hip.x - 1, hem + 2),
          P(sk.hip.x - 6.5, hem - 2),
          P(sk.hip.x - 6, hem - 8),
        ])
        p.fill(c, 'accent2')
        capsule(c, torsoPoint(sk, 5.2, -T.waist * 1.25), torsoPoint(sk, 5.2, T.waist * 1.2), 0.6, 0.6)
        strip(c, chain(torsoPoint(sk, 5.2, T.waist), 10, 5, 10, -5, 3), 0.55, 0.2)
        capsule(c, torsoPoint(sk, x.L.torso * 0.96, -T.neck * 1.3), torsoPoint(sk, x.L.torso * 0.62, T.chest * 0.9), 0.45, 0.45)
      },
      headDeco: (x) => {
        const { c, p, r } = x
        inHead(x, () => {
          p.fill(c, 'near')
          ellipse(c, P(-r * 0.12, -r * 0.3), r * 1.0, r * 0.84)
          poly(c, [P(-r * 0.75, -r * 0.7), P(-r * 1.2, -r * 3.2), P(r * 0.35, -r * 3.35), P(r * 0.75, -r * 0.82)])
          p.fill(c, 'accent2')
          poly(c, [P(-r * 0.8, -r * 0.8), P(r * 0.78, -r * 0.92), P(r * 0.72, -r * 1.25), P(-r * 0.86, -r * 1.12)])
          poly(c, [P(-r * 1.18, -r * 3.05), P(r * 0.36, -r * 3.2), P(r * 0.33, -r * 3.45), P(-r * 1.24, -r * 3.3)])
          capsule(c, P(-r * 1.6, -r * 2.0), P(r * 1.3, -r * 2.25), 0.28, 0.28)
        })
      },
      weaponN: (x) => {
        const { c, p, sk } = x
        const h = sk.armN.hand
        const R = 9.5
        const a0 = 95
        const a1 = 215
        const toCanvas = (a) => ((90 - a) * Math.PI) / 180
        p.fill(c, 'fanFace')
        c.beginPath()
        c.moveTo(h.x, h.y)
        c.arc(h.x, h.y, R, toCanvas(a0), toCanvas(a1), true)
        c.closePath()
        c.fill()
        if (!p.mask) {
          p.stroke(c, 'accent2', 0.35)
          for (let i = 0; i <= 8; i++) {
            const d = ldir(a0 + ((a1 - a0) * i) / 8)
            c.beginPath()
            c.moveTo(h.x + d.x * 1.5, h.y + d.y * 1.5)
            c.lineTo(h.x + d.x * R, h.y + d.y * R)
            c.stroke()
          }
          p.stroke(c, 'accent2', 0.6)
          c.beginPath()
          c.arc(h.x, h.y, R, toCanvas(a0), toCanvas(a1), true)
          c.stroke()
          c.save()
          p.glow(c, 'mist', 3)
          p.stroke(c, 'mist', 0.4)
          c.beginPath()
          c.arc(h.x, h.y, R * 0.66, toCanvas(a0 + 12), toCanvas(a1 - 12), true)
          c.stroke()
          c.restore()
        }
        sleeve(x, sk.armN, { drop: 8, w: 2.5 })
      },
    },
  })
}

// ───────────────────────── 骷髅（骨刹、骷髅兵共用） ─────────────────────────

const BONE_THICK = {
  hip: 2.4,
  waist: 1.1,
  chest: 4.1,
  neck: 0.6,
  uArm: [1.15, 0.9],
  fArm: [0.95, 0.8],
  hand: 1.0,
  thigh: [1.45, 1.05],
  shin: [1.1, 0.85],
  foot: [1.1, 0.8],
}

function boneTorso(x) {
  const { c, p, sk, L, T } = x
  p.fill(c, 'near')
  blob(c, [
    torsoPoint(sk, 1.8, -T.hip * 1.2),
    torsoPoint(sk, 2.4, T.hip * 0.2),
    torsoPoint(sk, 1.2, T.hip * 1.3),
    torsoPoint(sk, -1.4, T.hip * 0.8),
    torsoPoint(sk, -1.8, -T.hip * 0.7),
  ])
  p.stroke(c, 'near', 1.0 * x.k)
  curve(c, [torsoPoint(sk, 1, -T.chest * 0.25), torsoPoint(sk, L.torso * 0.5, -T.chest * 0.5), torsoPoint(sk, L.torso, -T.neck)])
  for (let i = 0; i < 4; i++) {
    const d = L.torso * (0.5 + i * 0.12)
    p.stroke(c, 'near', 0.75 * x.k)
    curve(c, [torsoPoint(sk, d, -T.chest * 0.5), torsoPoint(sk, d + 0.8 * x.k, T.chest * 0.8), torsoPoint(sk, d - 1.8 * x.k, T.chest * 0.85)])
  }
  capsule(c, torsoPoint(sk, L.torso * 0.94, -T.chest * 0.6), torsoPoint(sk, L.torso * 0.94, T.chest * 0.55), 0.6 * x.k, 0.6 * x.k)
}

function skull(x, eyeRole = 'eye') {
  const { c, p, r } = x
  inHead(x, () => {
    p.fill(c, 'near')
    ellipse(c, P(-r * 0.05, -r * 0.12), r * 1.0, r * 0.95)
    poly(c, [P(r * 0.1, r * 0.1), P(r * 1.02, r * 0.18), P(r * 0.95, r * 0.8), P(r * 0.25, r * 0.95)])
    poly(c, [P(r * 0.15, r * 1.05), P(r * 0.95, r * 0.98), P(r * 0.82, r * 1.4), P(r * 0.2, r * 1.38)])
  })
  inHead(x, () => {
    if (!p.mask) {
      c.fillStyle = p.color('socket')
      ellipse(c, P(r * 0.52, -r * 0.08), r * 0.32, r * 0.3)
    }
    glowDot(c, P(r * 0.56, -r * 0.06), r * 0.16, eyeRole, 3, p)
  })
}

function boneLimbs(x) {
  const { c, p, sk, T } = x
  p.fill(c, 'near')
  circle(c, sk.legN.k, T.thigh[1] * 1.35)
  circle(c, sk.armN.e, T.uArm[1] * 1.35)
}

export function skeletonSoldier(kind = 'blade') {
  const pose =
    kind === 'bow'
      ? { t: 4, h: 0, thN: 22, shN: -2, thF: -18, shF: -6, uaN: 88, faN: 90, uaF: 76, faF: -62 }
      : { t: 10, h: 0, thN: 26, shN: -6, thF: -20, shF: -12, uaN: 62, faN: 150, uaF: -24, faF: 20, sw: 160 }
  return person({
    k: 1,
    thick: BONE_THICK,
    pose,
    hooks: {
      torso: boneTorso,
      body: boneLimbs,
      head: (x) => skull(x),
      headDeco: (x) => {
        const { c, p, r } = x
        inHead(x, () => {
          p.fill(c, 'far')
          poly(c, [P(-r * 1.05, -r * 0.2), P(-r * 0.7, -r * 1.2), P(r * 0.6, -r * 1.25), P(r * 1.15, -r * 0.35), P(r * 0.2, -r * 0.62)])
        })
      },
      weaponN: (x) => {
        const { c, p, sk } = x
        if (kind === 'bow') {
          const h = sk.armN.hand
          p.stroke(c, 'near', 0.85)
          curve(c, [P(h.x - 2.4, h.y - 10), P(h.x + 2.2, h.y - 3), P(h.x + 1.2, h.y), P(h.x + 2.2, h.y + 3), P(h.x - 2.4, h.y + 10)])
          if (!p.mask) {
            const f = sk.armF.hand
            p.stroke(c, 'string', 0.22)
            c.beginPath()
            c.moveTo(h.x - 2.4, h.y - 10)
            c.lineTo(f.x, f.y)
            c.lineTo(h.x - 2.4, h.y + 10)
            c.stroke()
            p.stroke(c, 'string', 0.35)
            c.beginPath()
            c.moveTo(f.x, f.y)
            c.lineTo(h.x + 5, h.y)
            c.stroke()
            p.fill(c, 'string')
            poly(c, [P(h.x + 6.4, h.y), P(h.x + 4.6, h.y - 0.9), P(h.x + 4.6, h.y + 0.9)])
          }
        } else {
          drawSaber(c, p, sk.armN.hand, pose.sw, { length: 14, role: 'iron' })
        }
      },
    },
  })
}

// ───────────────────────── 骨刹 ─────────────────────────

export function gusha() {
  const pose = { t: 14, h: 2, thN: 38, shN: -6, thF: -30, shF: -24, uaN: 46, faN: 86, uaF: -150, faF: 172, swN: 98, swF: 128 }
  return person({
    k: 1.36,
    thick: BONE_THICK,
    pose,
    hooks: {
      back: (x) => {
        const { c, p, sk, L, T, k } = x
        const s1 = torsoPoint(sk, L.torso * 0.95, -T.chest * 0.8)
        const s2 = torsoPoint(sk, L.torso * 0.95, T.chest * 0.1)
        const e1 = chain(s1, 30 * k * 0.7, 6, -62, -30, 5, 0)
        const e2 = chain(s2, 25 * k * 0.7, 6, -30, -10, 4, 1)
        const a = e1[e1.length - 1]
        const b = e2[e2.length - 1]
        const hem = []
        const n = 7
        for (let i = 0; i <= n; i++) {
          const q = mid(a, b, i / n)
          hem.push(P(q.x, q.y + (i % 2 ? -3.2 * k : 0.8 * k)))
        }
        p.fill(c, 'far')
        poly(c, [...e1, ...hem.slice(1, -1), ...e2.reverse()])
      },
      weaponF: (x) => drawSaber(x.c, x.p, x.sk.armF.hand, x.pose.swF, { length: 20, role: 'far', glowRole: null }),
      torso: (x) => {
        boneTorso(x)
        const { c, p, sk, L, T } = x
        p.fill(c, 'near')
        blob(c, [
          torsoPoint(sk, L.torso * 0.58, -T.chest * 0.75),
          torsoPoint(sk, L.torso * 0.98, -T.chest * 0.85),
          torsoPoint(sk, L.torso * 0.98, T.chest * 0.8),
          torsoPoint(sk, L.torso * 0.62, T.chest * 1.05),
        ])
        p.fill(c, 'accent')
        capsule(c, torsoPoint(sk, 2.4 * x.k, -T.hip * 1.3), torsoPoint(sk, 2.4 * x.k, T.hip * 1.35), 0.55 * x.k, 0.55 * x.k)
      },
      body: (x) => {
        boneLimbs(x)
        const { c, p, sk, T, k } = x
        const { front, back } = thighDirs(sk)
        p.fill(c, 'far')
        flap(c, torsoPoint(sk, 1.6 * k, -T.hip * 0.5), back, 7 * k, 1.8 * k, 2.6 * k, -0.6)
        p.fill(c, 'near')
        flap(c, torsoPoint(sk, 1.6 * k, T.hip * 0.5), front, 7 * k, 1.8 * k, 2.6 * k, 0.6)
        const sh = sk.legN
        const sd = unit(sub(sh.a, sh.k))
        capsule(c, add(sh.k, sd, 1.2 * k), add(sh.a, sd, -1.4 * k), 1.5 * k, 1.25 * k)
      },
      head: (x) => skull(x),
      headDeco: (x) => {
        const { c, p, r, sk } = x
        p.fill(c, 'far')
        strip(c, chain(headPoint(sk, -r * 0.2, -r * 0.85), r * 2.7, 6, -128, 158, 0), 0.95 * x.k, 0.15)
        inHead(x, () => {
          p.fill(c, 'near')
          blob(c, [P(-r * 1.2, r * 0.1), P(-r * 1.1, -r * 0.95), P(-r * 0.2, -r * 1.35), P(r * 0.9, -r * 0.95), P(r * 1.2, -r * 0.35), P(r * 0.3, -r * 0.38)])
          poly(c, [P(r * 0.95, -r * 0.4), P(r * 1.25, r * 0.55), P(r * 0.85, r * 0.4)])
        })
        p.fill(c, 'near')
        strip(c, chain(headPoint(sk, r * 0.25, -r * 0.95), r * 3.1, 6, -135, 150, 0), 1.1 * x.k, 0.15)
      },
      weaponN: (x) => drawSaber(x.c, x.p, x.sk.armN.hand, x.pose.swN, { length: 21 }),
      front: (x) => {
        const { c, p, sk, T, k } = x
        const s = sk.armN.s
        const d = unit(sub(sk.armN.e, s))
        const n = perp(d)
        p.fill(c, 'near')
        blob(c, [add(s, n, 3.2 * k), add(add(s, d, 3.6 * k), n, 2.6 * k), add(add(s, d, 4.2 * k), n, -1.4 * k), add(s, n, -2.4 * k), add(s, d, -1.6 * k)])
        p.fill(c, 'far')
        capsule(c, add(add(s, d, 2.2 * k), n, 2.6 * k), add(add(s, d, 3.4 * k), n, -1.5 * k), 0.35 * k, 0.35 * k)
        const w = sk.armN
        const wd = unit(sub(w.w, w.e))
        p.fill(c, 'near')
        capsule(c, add(w.w, wd, -3 * k), add(w.w, wd, -0.4 * k), T.fArm[1] * 1.9, T.fArm[1] * 1.7)
      },
    },
  })
}

// ───────────────────────── 狼头（狼卫、黑鬃共用） ─────────────────────────

function wolfHead(x, { open = 0.1, eye = 'eye' } = {}) {
  const { c, p, r } = x
  inHead(x, () => {
    p.fill(c, 'far')
    poly(c, [P(-r * 0.95, -r * 0.3), P(-r * 1.15, -r * 1.9), P(-r * 0.2, -r * 0.75)])
    p.fill(c, 'near')
    ellipse(c, P(0, 0), r * 1.05, r * 0.95)
    poly(c, [P(r * 0.3, -r * 0.65), P(r * 1.2, -r * 0.5), P(r * 2.2, -r * 0.1), P(r * 2.15, r * 0.32), P(r * 0.9, r * 0.5), P(r * 0.3, r * 0.7)])
    poly(c, [P(r * 0.4, r * 0.4), P(r * 1.85, r * (0.45 + open)), P(r * 1.65, r * (0.75 + open)), P(r * 0.3, r * 0.98)])
    poly(c, [P(-r * 0.45, -r * 0.6), P(-r * 0.25, -r * 2.05), P(r * 0.45, -r * 0.7)])
    poly(c, [P(-r * 0.9, r * 0.1), P(-r * 1.7, r * 0.95), P(-r * 0.7, r * 0.75), P(-r * 1.0, r * 1.45), P(0, r * 0.95)])
    if (!p.mask && open > 0.15) {
      p.fill(c, 'fang')
      poly(c, [P(r * 1.5, r * 0.43), P(r * 1.6, r * 0.72), P(r * 1.7, r * 0.43)])
      poly(c, [P(r * 1.05, r * 0.45), P(r * 1.12, r * 0.7), P(r * 1.22, r * 0.45)])
    }
  })
  inHead(x, () => glowDot(c, P(r * 0.62, -r * 0.3), r * 0.19, eye, 3, p))
}

function tail(x, { len = 12, a0 = -70, a1 = -25, w = 2.6 } = {}) {
  const { c, p, sk, T } = x
  p.fill(c, 'near')
  strip(c, chain(torsoPoint(sk, 1, -T.hip * 1.1), len * x.k, 7, a0, a1, 10, 0.5), w * x.k, 0.5)
}

// ───────────────────────── 狼卫 ─────────────────────────

export function wolfGuard() {
  const pose = { t: 12, h: -8, thN: 30, shN: -8, thF: -24, shF: -14, uaN: 30, faN: 94, uaF: -140, faF: 166, swF: 118 }
  return person({
    k: 1.09,
    bulk: 1.12,
    lens: { headR: 3.5 },
    pose,
    hooks: {
      back: (x) => tail(x, { len: 11, a0: -80, a1: -20 }),
      weaponF: (x) => drawSaber(x.c, x.p, x.sk.armF.hand, x.pose.swF, { length: 15, role: 'iron' }),
      body: (x) => {
        const { c, p, sk, T, k } = x
        const { front, back } = thighDirs(sk)
        p.fill(c, 'far')
        flap(c, torsoPoint(sk, 1.6, -T.hip * 0.4), back, 6.5 * k, 2 * k, 2.4 * k, -0.4)
        p.fill(c, 'accent')
        flap(c, torsoPoint(sk, 1.6, T.hip * 0.4), front, 6 * k, 1.8 * k, 2.1 * k, 0.4)
        capsule(c, torsoPoint(sk, 3.4 * k, -T.hip * 1.1), torsoPoint(sk, 3.4 * k, T.hip * 1.1), 0.55 * k, 0.55 * k)
      },
      head: (x) => wolfHead(x, { open: 0.05 }),
      front: (x) => {
        const { c, p, sk } = x
        const h = add(sk.armN.hand, sk.fw, 1.2)
        p.fill(c, 'near')
        ellipse(c, h, 3.6, 8.2, 8)
        if (!p.mask) {
          p.stroke(c, 'far', 0.55)
          c.beginPath()
          c.ellipse(h.x, h.y, 2.9, 7.4, (8 * Math.PI) / 180, 0, Math.PI * 2)
          c.stroke()
          p.fill(c, 'far')
          circle(c, add(h, sk.fw, 0.8), 1.3)
        }
      },
    },
  })
}

// ───────────────────────── 黑鬃 ─────────────────────────

export function heizong() {
  const pose = {
    t: 44,
    h: -34,
    thN: 50,
    shN: -34,
    ftN: 72,
    thF: -8,
    shF: -52,
    ftF: 58,
    uaN: 74,
    faN: 100,
    uaF: -76,
    faF: -28,
  }
  return person({
    k: 1.64,
    bulk: 1.3,
    lens: { headR: 3.4, uArm: 9.6, fArm: 9.2, thigh: 9.4, shin: 8.6, foot: 5.6, torso: 13.6 },
    pose,
    hooks: {
      back: (x) => tail(x, { len: 13, a0: -95, a1: -40, w: 2.8 }),
      weaponF: (x) => claws(x, x.sk.armF, 'far'),
      body: (x) => {
        const { c, p, sk, L, T, k, r } = x
        const { front, back } = thighDirs(sk)
        p.fill(c, 'far')
        flap(c, torsoPoint(sk, 1.2, -T.hip * 0.5), back, 7 * k, 2.4 * k, 3 * k, -0.8)
        p.fill(c, 'near')
        flap(c, torsoPoint(sk, 1.2, T.hip * 0.5), front, 6.5 * k, 2.4 * k, 3.1 * k, 0.8)
        const center = torsoPoint(sk, L.torso * 0.86, -T.chest * 0.25)
        for (let i = 0; i < 11; i++) {
          const a = 168 + i * 11
          const d = ldir(a)
          const n = perp(d)
          const base = add(center, d, r * 1.05)
          const tip = add(center, d, r * (2.2 + (i % 3) * 0.35))
          poly(c, [add(base, n, r * 0.34), tip, add(base, n, -r * 0.34)])
        }
      },
      head: (x) => wolfHead(x, { open: 0.25 }),
      front: (x) => claws(x, x.sk.armN, 'near'),
    },
  })
}

function claws(x, arm, role) {
  const { c, p, r } = x
  p.fill(c, role)
  for (let i = -1; i <= 1; i++) {
    strip(c, chain(arm.hand, r * 1.45, 4, arm.fa + i * 16, arm.fa + i * 16 + 38, 0), 0.5 * x.k, 0.08)
  }
}

// ───────────────────────── 幻影魔兵 ─────────────────────────

export function phantom() {
  const pose = { t: 10, h: -2, thN: 28, shN: -6, thF: -22, shF: -10, uaN: 48, faN: 82, uaF: 30, faF: 74, sw: 84 }
  return person({
    k: 1.09,
    bulk: 1.05,
    pose,
    hooks: {
      body: (x) => {
        const { c, p, sk, T, k } = x
        const { front, back } = thighDirs(sk)
        p.fill(c, 'far')
        flap(c, torsoPoint(sk, 2, -T.hip * 0.4), back, 8 * k, 2.4 * k, 3 * k, -0.5)
        p.fill(c, 'near')
        flap(c, torsoPoint(sk, 2, T.hip * 0.4), front, 7.6 * k, 2.4 * k, 3 * k, 0.5)
      },
      headDeco: (x) => {
        const { c, p, r, sk } = x
        inHead(x, () => {
          p.fill(c, 'near')
          blob(c, [P(-r * 1.1, r * 0.4), P(-r * 1.05, -r * 0.9), P(0, -r * 1.3), P(r * 1.0, -r * 0.8), P(r * 1.15, -r * 0.1), P(r * 0.5, r * 0.25)])
          poly(c, [P(r * 1.0, -r * 0.2), P(r * 1.2, r * 0.9), P(r * 0.7, r * 0.7)])
        })
        p.fill(c, 'accent')
        strip(c, chain(headPoint(sk, -r * 0.2, -r * 1.25), 11, 6, -160, -80, 8, 1), 1.3, 0.3)
        inHead(x, () => glowDot(c, P(r * 0.6, -r * 0.15), r * 0.18, 'eye', 3, p))
      },
      weaponN: (x) => drawJi(x.c, x.p, x.sk.armN.hand, x.pose.sw, { pole: 28, back: 11 }),
      front: (x) => {
        const { c, p, sk, k } = x
        const s = sk.armN.s
        const d = unit(sub(sk.armN.e, s))
        const n = perp(d)
        p.fill(c, 'near')
        blob(c, [add(s, n, 2.6 * k), add(add(s, d, 3.2 * k), n, 2.3 * k), add(add(s, d, 3.8 * k), n, -1.2 * k), add(s, n, -2 * k), add(s, d, -1.4 * k)])
      },
    },
  })
}

// ───────────────────────── 镜魅 ─────────────────────────

export function mirrorSpirit() {
  const pose = { t: 6, h: 4, thN: 22, shN: -4, thF: -18, shF: -10, uaN: 72, faN: 124, uaF: -42, faF: -12 }
  const { L, T } = scaleSpec(HERO_LENS, HERO_THICK, 1.09, 1)
  return (c, p) => {
    const sk = skeleton(L, pose)
    c.translate(0, -groundLift(sk, T))
    const edge = (pts) => {
      if (p.mask) return
      p.stroke(c, 'edge', 0.3)
      c.beginPath()
      c.moveTo(pts[0].x, pts[0].y)
      for (const q of pts.slice(1)) c.lineTo(q.x, q.y)
      c.closePath()
      c.stroke()
    }
    const shard = (a, b, w, r1, r2) => {
      const d = unit(sub(b, a))
      const n = perp(d)
      const m = mid(a, b, 0.42)
      const A = add(a, d, -0.9)
      const B = add(b, d, 0.9)
      const S1 = add(m, n, w)
      const S2 = add(m, n, -w * 0.9)
      p.fill(c, r1)
      poly(c, [A, S1, B])
      edge([A, S1, B])
      p.fill(c, r2)
      poly(c, [A, B, S2])
      edge([A, B, S2])
    }
    const limb = (s, e, w, r1, r2) => shard(s, e, w, r1, r2)
    limb(sk.armF.s, sk.armF.e, 2.1, 'shardMid', 'shardDark')
    limb(sk.armF.e, sk.armF.hand, 1.7, 'shardMid', 'shardDark')
    limb(sk.legF.h, sk.legF.k, 2.8, 'shardMid', 'shardDark')
    limb(sk.legF.k, sk.legF.toe, 2.2, 'shardMid', 'shardDark')
    const chestF = torsoPoint(sk, L.torso * 0.75, T.chest * 1.1)
    const chestB = torsoPoint(sk, L.torso * 0.8, -T.chest)
    const hipF = torsoPoint(sk, 0, T.hip)
    const hipB = torsoPoint(sk, 0, -T.hip)
    p.fill(c, 'shardLight')
    poly(c, [hipB, chestB, sk.neck, chestF])
    edge([hipB, chestB, sk.neck, chestF])
    p.fill(c, 'shardMid')
    poly(c, [hipB, chestF, hipF])
    edge([hipB, chestF, hipF])
    limb(sk.legN.h, sk.legN.k, 3, 'shardLight', 'shardMid')
    limb(sk.legN.k, sk.legN.toe, 2.4, 'shardLight', 'shardMid')
    const hc = sk.head
    p.fill(c, 'edge')
    ellipse(c, hc, 3.9, 4.4, sk.headAngle)
    if (p.mask) {
      ellipse(c, hc, 3.6, 4.1, sk.headAngle)
    } else {
      const g = c.createLinearGradient(hc.x - 3, hc.y - 4, hc.x + 3, hc.y + 4)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.45, p.color('shardLight'))
      g.addColorStop(1, p.color('shardDark'))
      c.fillStyle = g
      ellipse(c, hc, 3.3, 3.8, sk.headAngle)
      c.strokeStyle = 'rgba(255,255,255,0.9)'
      c.lineWidth = 0.35
      c.beginPath()
      c.moveTo(hc.x - 1.6, hc.y - 2.2)
      c.lineTo(hc.x + 0.4, hc.y - 3.1)
      c.stroke()
    }
    limb(sk.armN.s, sk.armN.e, 2.2, 'shardLight', 'shardMid')
    limb(sk.armN.e, add(sk.armN.hand, ldir(pose.faN), 3), 2.6, 'shardLight', 'shardMid')
    if (!p.mask) {
      const bits = [
        [9, -34, 1.4],
        [-8, -30, 1.1],
        [12, -22, 0.9],
        [-10, -16, 1.2],
      ]
      for (const [bx, by, s] of bits) {
        p.fill(c, 'shardLight')
        const pts = [P(bx, by - s * 2), P(bx + s, by + s), P(bx - s * 0.8, by + s * 0.6)]
        poly(c, pts)
        edge(pts)
      }
    }
  }
}

// ───────────────────────── 镇岳 ─────────────────────────

export function zhenyue() {
  const pose = { t: 6, h: 4, thN: 20, shN: -4, thF: -20, shF: 2, uaN: 60, faN: 140, uaF: -10, faF: 24, sw: 152 }
  return person({
    k: 2.9,
    bulk: 1.32,
    lens: { headR: 3.1 },
    pose,
    hooks: {
      body: (x) => {
        const { c, p, sk, L, T, k } = x
        const { front, back } = thighDirs(sk)
        p.fill(c, 'far')
        flap(c, torsoPoint(sk, 2 * k, -T.hip * 0.5), back, 8.5 * k, 2.4 * k, 3.2 * k, -0.5)
        p.fill(c, 'near')
        flap(c, torsoPoint(sk, 2 * k, T.hip * 0.5), front, 8.5 * k, 2.4 * k, 3.2 * k, 0.5)
        p.fill(c, 'far')
        flap(c, torsoPoint(sk, 2 * k, T.hip * 0.6), front, 6.2 * k, 2.2 * k, 2.8 * k, 0.5)
        p.fill(c, 'near')
        blob(c, [
          torsoPoint(sk, L.torso * 0.45, -T.chest * 0.95),
          torsoPoint(sk, L.torso * 0.95, -T.chest * 0.9),
          torsoPoint(sk, L.torso * 0.95, T.chest * 1.05),
          torsoPoint(sk, L.torso * 0.5, T.chest * 1.15),
        ])
        p.fill(c, 'far')
        circle(c, torsoPoint(sk, L.torso * 0.7, T.chest * 0.55), 3.1 * k * 0.9)
        p.fill(c, 'near')
        circle(c, torsoPoint(sk, L.torso * 0.7, T.chest * 0.55), 2.2 * k * 0.9)
        p.fill(c, 'far')
        capsule(c, torsoPoint(sk, 3.2 * k, -T.hip * 1.2), torsoPoint(sk, 3.2 * k, T.hip * 1.2), 0.8 * k, 0.8 * k)
        cracks(x, [
          [torsoPoint(sk, L.torso * 0.85, -T.chest * 0.3), torsoPoint(sk, L.torso * 0.6, T.chest * 0.1), torsoPoint(sk, L.torso * 0.4, -T.chest * 0.2)],
          [add(sk.legN.h, thighDirs(sk).front, 3 * k), add(sk.legN.k, P(1, 0), -1 * k), add(sk.legN.k, P(0, 1), 2 * k)],
        ])
      },
      headDeco: (x) => {
        const { c, p, r, sk, k } = x
        p.fill(c, 'near')
        strip(c, chain(headPoint(sk, -r * 0.2, -r * 1.1), r * 3.6, 7, 172, -130, 0), 1.3 * k, 0.3)
        inHead(x, () => {
          p.fill(c, 'near')
          blob(c, [P(-r * 1.15, r * 0.9), P(-r * 1.2, -r * 0.9), P(0, -r * 1.35), P(r * 1.05, -r * 0.8), P(r * 1.2, r * 0.05), P(r * 0.95, r * 1.0)])
          p.fill(c, 'far')
          capsule(c, P(-r * 1.1, -r * 0.55), P(r * 1.1, -r * 0.55), r * 0.14, r * 0.14)
        })
        inHead(x, () => {
          if (p.mask) return
          c.save()
          p.glow(c, 'eye', 5)
          p.stroke(c, 'eye', r * 0.18)
          c.beginPath()
          c.moveTo(r * 0.25, -r * 0.1)
          c.lineTo(r * 1.05, -r * 0.14)
          c.stroke()
          c.restore()
        })
      },
      weaponN: (x) => drawGuandao(x.c, x.p, x.sk.armN.hand, x.pose.sw, { pole: 70, back: 30, blade: 36 }),
      front: (x) => {
        const { c, p, sk, k } = x
        const s = sk.armN.s
        const d = unit(sub(sk.armN.e, s))
        const n = perp(d)
        for (let i = 0; i < 3; i++) {
          p.fill(c, i % 2 ? 'far' : 'near')
          const o = add(s, d, i * 1.5 * k)
          blob(c, [add(o, n, 3.4 * k), add(add(o, d, 3 * k), n, 2.9 * k), add(add(o, d, 3.4 * k), n, -1.5 * k), add(o, n, -2.4 * k), add(o, d, -1.2 * k)])
        }
        const w = sk.armN
        const wd = unit(sub(w.w, w.e))
        p.fill(c, 'near')
        capsule(c, add(w.w, wd, -4 * k), add(w.w, wd, -0.5 * k), 2.2 * k, 2 * k)
        cracks(x, [[add(s, n, 2 * k), add(add(s, d, 2.5 * k), n, 0.5 * k), add(add(s, d, 3.6 * k), n, 1.4 * k)]])
      },
    },
  })
}

function cracks(x, lines) {
  const { c, p, k } = x
  if (p.mask) return
  c.save()
  p.glow(c, 'accent', 4)
  p.stroke(c, 'accent', 0.32 * k)
  for (const pts of lines) {
    c.beginPath()
    c.moveTo(pts[0].x, pts[0].y)
    for (const q of pts.slice(1)) c.lineTo(q.x, q.y)
    c.stroke()
  }
  c.restore()
}

// ───────────────────────── 石傀儡 ─────────────────────────

export function golem() {
  return (c, p) => {
    p.fill(c, 'far')
    rock(c, P(-2, -42), P(-4, -28), 5.5, 5, 3)
    rock(c, P(-4, -28), P(0, -15), 5, 6, 4)
    rock(c, P(-1, -15), P(0, -9), 6.5, 6.5, 5)
    rock(c, P(-8, -20), P(-11, -9), 6, 5, 6)
    rock(c, P(-11, -9), P(-9, -1), 5, 4.5, 7)
    p.fill(c, 'near')
    rock(c, P(-6, -20), P(1, -40), 12, 14, 1)
    rock(c, P(-1, -20), P(3, -10), 6.5, 5.5, 8)
    rock(c, P(3, -10), P(4, -1), 5.5, 5, 9)
    rock(c, P(9, -48), P(13, -49), 5, 5.4, 10)
    rock(c, P(5, -44), P(8, -47), 4.2, 4.2, 14)
    rock(c, P(6, -42), P(15, -29), 6.2, 5.6, 11)
    rock(c, P(15, -29), P(19, -16), 5.6, 6, 12)
    rock(c, P(19, -15), P(21, -10), 7.4, 8, 13)
    if (!p.mask) {
      p.fill(c, 'far')
      poly(c, [P(-6, -53), P(-1, -56), P(4, -54), P(1, -51.5)])
      poly(c, [P(9, -54.5), P(12.5, -56.5), P(15, -53.5)])
      p.stroke(c, 'far', 0.45)
      c.beginPath()
      c.moveTo(-8, -46)
      c.lineTo(-4, -38)
      c.lineTo(-7, -30)
      c.moveTo(3, -36)
      c.lineTo(6, -28)
      c.stroke()
      c.save()
      p.glow(c, 'accent', 6)
      p.stroke(c, 'accent', 0.7)
      c.beginPath()
      c.arc(-10, -33, 4, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.moveTo(-10, -37)
      c.lineTo(-10, -29)
      c.moveTo(-13, -33)
      c.lineTo(-7, -33)
      c.moveTo(-12.5, -35.5)
      c.lineTo(-7.5, -30.5)
      c.stroke()
      p.stroke(c, 'eye', 0.9)
      c.beginPath()
      c.moveTo(12.4, -49.4)
      c.lineTo(17.2, -50)
      c.stroke()
      c.restore()
    }
  }
}

export { drawLeg }
