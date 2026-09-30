import type { MoveDef, MoveId } from '../../core/moves'
import { type EaseName, ease } from './math'
import { lerpPose, type Pose } from './skeleton'

/**
 * 叶昭的姿势库与招式关键帧。
 *
 * 好看的动作靠三件事：
 *   1. 预备（anticipation）：出招前往反方向收一下——剑举到背后、身体后仰、重心下沉；
 *   2. 出招要快：起手到判定用 snap 缓动，几乎一帧到位，剑光才利落；
 *   3. 收势（follow-through）：打完别立刻回站姿，先停在最舒展的姿势上一会儿，再慢慢收回。
 * 另外：远侧手永远做点什么（剑指、平衡、托剑），腿永远是弓步或者错开，不要两腿并拢站直。
 */

const BASE: Pose = {
  t: 14,
  h: -10,
  thN: 38,
  shN: -10,
  ftN: 94,
  thF: -30,
  shF: -20,
  ftF: 72,
  uaN: 30,
  faN: 72,
  uaF: -112,
  faF: 158,
  sw: 66,
  rot: 0,
  sq: 1,
  glow: 0.45,
}

const mk = (p: Partial<Pose>, from: Pose = BASE): Pose => ({ ...from, ...p })

/** 站姿：持剑斜指前下方，远侧手捏剑指举在脑后。 */
export const STANCE = BASE

const LUNGE_LEGS = { thN: 62, shN: 2, ftN: 98, thF: -48, shF: -62, ftF: 18 }
const DEEP_LUNGE = { thN: 80, shN: 8, ftN: 102, thF: -64, shF: -80, ftF: 8 }
const WIDE_LEGS = { thN: 36, shN: -8, ftN: 94, thF: -32, shF: -18, ftF: 72 }
const CROUCH_LEGS = { thN: 84, shN: -34, ftN: 80, thF: -64, shF: -104, ftF: -4 }
const TUCK_LEGS = { thN: 82, shN: -26, ftN: 70, thF: 34, shF: -56, ftF: 30 }

export const POSES = {
  guard: mk({
    t: -4,
    h: -2,
    ...WIDE_LEGS,
    uaN: 52,
    faN: 158,
    sw: 176,
    uaF: 36,
    faF: 128,
    glow: 0.6,
  }),
  charge: mk({
    t: -14,
    h: -12,
    ...WIDE_LEGS,
    thN: 44,
    uaN: 172,
    faN: 198,
    sw: 216,
    uaF: 70,
    faF: 104,
  }),
  jumpUp: mk({
    t: 4,
    h: -10,
    thN: 74,
    shN: -22,
    ftN: 70,
    thF: -8,
    shF: -64,
    ftF: 20,
    uaN: 118,
    faN: 152,
    sw: 150,
    uaF: -70,
    faF: -30,
  }),
  fall: mk({
    t: 6,
    h: 4,
    thN: 36,
    shN: -6,
    ftN: 86,
    thF: -20,
    shF: -34,
    ftF: 50,
    uaN: 74,
    faN: 116,
    sw: 112,
    uaF: -96,
    faF: -150,
  }),
  land: mk({
    t: 24,
    h: -14,
    ...CROUCH_LEGS,
    uaN: 40,
    faN: 64,
    sw: 54,
    uaF: -80,
    faF: -40,
    sq: 0.94,
  }),
  dashFwd: mk({
    t: 44,
    h: -30,
    thN: 76,
    shN: 12,
    ftN: 102,
    thF: -72,
    shF: -98,
    ftF: -14,
    uaN: -72,
    faN: -92,
    sw: -126,
    uaF: 70,
    faF: 44,
  }),
  dashBack: mk({
    t: -22,
    h: 8,
    thN: 40,
    shN: 4,
    ftN: 94,
    thF: -12,
    shF: -44,
    ftF: 40,
    uaN: 60,
    faN: 112,
    sw: 122,
    uaF: -70,
    faF: -30,
  }),
  hurt: mk({
    t: -26,
    h: -22,
    thN: 22,
    shN: -10,
    thF: -26,
    shF: -8,
    uaN: -40,
    faN: -14,
    sw: 20,
    uaF: 40,
    faF: 24,
  }),
  launched: mk({
    t: -20,
    h: -20,
    thN: 52,
    shN: 10,
    thF: -40,
    shF: -24,
    uaN: -100,
    faN: -130,
    sw: -80,
    uaF: 140,
    faF: 160,
  }),
  down: mk({
    t: 0,
    h: -10,
    thN: 12,
    shN: 2,
    ftN: 88,
    thF: -6,
    shF: -4,
    ftF: 88,
    uaN: 40,
    faN: 22,
    sw: 72,
    uaF: -30,
    faF: -10,
  }),
  kneel: mk({
    t: 18,
    h: -8,
    thN: 92,
    shN: -2,
    ftN: 92,
    thF: -30,
    shF: -118,
    ftF: -30,
    uaN: 60,
    faN: 92,
    sw: 80,
    uaF: -60,
    faF: -20,
  }),
  light: mk({
    t: -6,
    h: -4,
    ...WIDE_LEGS,
    uaN: 124,
    faN: 176,
    sw: 180,
    uaF: 66,
    faF: 152,
    glow: 1,
  }),
}

// ───────────────────────── 移动循环 ─────────────────────────

export function walkPose(phase: number): Pose {
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  return mk({
    t: 9,
    h: -6,
    thN: 6 + 30 * s,
    shN: 6 + 30 * s - 10 - 34 * Math.max(0, c),
    ftN: 90 + 30 * s,
    thF: 6 - 30 * s,
    shF: 6 - 30 * s - 10 - 34 * Math.max(0, -c),
    ftF: 90 - 30 * s,
    uaN: 28 - 10 * s,
    faN: 70,
    sw: 62 - 6 * s,
    uaF: -20 + 26 * s,
    faF: 10 + 20 * s,
  })
}

export function runPose(phase: number): Pose {
  const s = Math.sin(phase)
  const c = Math.cos(phase)
  return mk({
    t: 26,
    h: -18,
    thN: 14 + 52 * s,
    shN: 14 + 52 * s - 16 - 70 * Math.max(0, c),
    ftN: 96 + 30 * s,
    thF: 14 - 52 * s,
    shF: 14 - 52 * s - 16 - 70 * Math.max(0, -c),
    ftF: 96 - 30 * s,
    uaN: -62 + 8 * s,
    faN: -84,
    sw: -112 + 6 * s,
    uaF: 40 + 40 * s,
    faF: 110 + 20 * s,
  })
}

export function breathe(p: Pose, t: number): Pose {
  const b = Math.sin(t * 0.055)
  return { ...p, t: p.t + b * 1.4, uaN: p.uaN + b * 2, sw: p.sw + b * 2.5, uaF: p.uaF + b * 3 }
}

// ───────────────────────── 招式关键帧 ─────────────────────────

type Key = { f: number; pose: Pose; ease: EaseName }

type Shape = { windup: Pose; strike: Pose; follow?: Pose; hold?: number }

const S = (p: Partial<Pose>): Pose => mk(p)

/**
 * 每招三个关键姿势：预备（起手最后一帧）、出招（判定最后一帧）、收势（收招前段）。
 * 之后缓慢回到站姿。
 */
const SHAPES: Partial<Record<MoveId, Shape>> = {
  n1: {
    windup: S({ t: -4, h: -8, ...WIDE_LEGS, uaN: 152, faN: 178, sw: 170, uaF: 44, faF: 96 }),
    strike: S({
      t: 22,
      h: -14,
      ...LUNGE_LEGS,
      uaN: 86,
      faN: 72,
      sw: 32,
      uaF: -84,
      faF: -50,
      glow: 1,
    }),
    follow: S({ t: 20, h: -12, ...LUNGE_LEGS, uaN: 72, faN: 52, sw: 16, uaF: -90, faF: -60 }),
  },
  n2: {
    windup: S({ t: 18, h: -12, ...LUNGE_LEGS, uaN: 34, faN: 14, sw: -12, uaF: 40, faF: 70 }),
    strike: S({
      t: -2,
      h: -14,
      ...WIDE_LEGS,
      uaN: 152,
      faN: 172,
      sw: 170,
      uaF: -70,
      faF: -30,
      glow: 1,
    }),
    follow: S({ t: -4, h: -12, ...WIDE_LEGS, uaN: 162, faN: 182, sw: 188, uaF: -76, faF: -36 }),
  },
  n3: {
    windup: S({
      t: -2,
      h: -4,
      thN: 18,
      shN: -8,
      thF: -22,
      shF: -12,
      uaN: -34,
      faN: 82,
      sw: 90,
      uaF: 56,
      faF: 112,
    }),
    strike: S({
      t: 36,
      h: -30,
      ...DEEP_LUNGE,
      uaN: 90,
      faN: 90,
      sw: 90,
      uaF: -98,
      faF: -100,
      glow: 1,
    }),
    hold: 0.5,
  },
  n4: {
    windup: S({
      t: -18,
      h: -10,
      thN: 30,
      shN: -24,
      ftN: 70,
      thF: -16,
      shF: -36,
      ftF: 40,
      uaN: 180,
      faN: 198,
      sw: 208,
      uaF: -150,
      faF: -172,
      sq: 1.04,
    }),
    strike: S({
      t: 44,
      h: -28,
      ...DEEP_LUNGE,
      uaN: 70,
      faN: 58,
      sw: 34,
      uaF: -112,
      faF: -84,
      sq: 0.96,
      glow: 1,
    }),
    hold: 0.55,
  },
  charge: {
    windup: POSES.charge,
    strike: S({
      t: 48,
      h: -30,
      ...DEEP_LUNGE,
      thN: 86,
      uaN: 66,
      faN: 50,
      sw: 24,
      uaF: -118,
      faF: -90,
      sq: 0.95,
      glow: 1,
    }),
    hold: 0.6,
  },
  launcher: {
    windup: S({
      t: 30,
      h: -24,
      ...CROUCH_LEGS,
      uaN: 36,
      faN: 18,
      sw: 14,
      uaF: -76,
      faF: -44,
      sq: 0.97,
    }),
    strike: S({
      t: -14,
      h: -28,
      thN: 26,
      shN: -6,
      ftN: 60,
      thF: -30,
      shF: -46,
      ftF: 30,
      uaN: 172,
      faN: 178,
      sw: 178,
      uaF: -44,
      faF: -22,
      sq: 1.04,
      glow: 1,
    }),
    follow: S({
      t: -16,
      h: -28,
      thN: 24,
      shN: -6,
      ftN: 60,
      thF: -30,
      shF: -46,
      ftF: 30,
      uaN: 180,
      faN: 186,
      sw: 190,
      uaF: -40,
      faF: -20,
    }),
  },
  sweep: {
    windup: S({
      t: 34,
      h: -30,
      ...CROUCH_LEGS,
      uaN: 14,
      faN: 34,
      sw: 44,
      uaF: -40,
      faF: 10,
      sq: 0.94,
    }),
    strike: S({
      t: 42,
      h: -34,
      ...CROUCH_LEGS,
      thN: 88,
      uaN: 92,
      faN: 98,
      sw: 98,
      uaF: -104,
      faF: -84,
      sq: 0.92,
      glow: 1,
    }),
    hold: 0.4,
  },
  dashSlash: {
    windup: S({ t: 30, h: -24, ...LUNGE_LEGS, uaN: -76, faN: -94, sw: -124, uaF: 70, faF: 60 }),
    strike: S({
      t: 34,
      h: -26,
      ...DEEP_LUNGE,
      uaN: 100,
      faN: 108,
      sw: 116,
      uaF: -96,
      faF: -80,
      glow: 1,
    }),
    follow: S({ t: 30, h: -22, ...DEEP_LUNGE, uaN: 112, faN: 132, sw: 142, uaF: -96, faF: -80 }),
  },
  a1: {
    windup: S({ t: 0, h: -8, ...TUCK_LEGS, uaN: 150, faN: 172, sw: 164, uaF: 50, faF: 100 }),
    strike: S({
      t: 22,
      h: -18,
      thN: 54,
      shN: -8,
      ftN: 90,
      thF: -18,
      shF: -44,
      ftF: 40,
      uaN: 90,
      faN: 70,
      sw: 42,
      uaF: -90,
      faF: -60,
      glow: 1,
    }),
  },
  a2: {
    windup: S({
      t: 18,
      h: -14,
      thN: 54,
      shN: -8,
      ftN: 90,
      thF: -18,
      shF: -44,
      ftF: 40,
      uaN: 30,
      faN: 18,
      sw: 18,
      uaF: 50,
      faF: 90,
    }),
    strike: S({
      t: -6,
      h: -14,
      ...TUCK_LEGS,
      uaN: 160,
      faN: 176,
      sw: 170,
      uaF: -80,
      faF: -40,
      glow: 1,
    }),
  },
  a3: {
    windup: S({ t: -18, h: -10, ...TUCK_LEGS, uaN: 182, faN: 202, sw: 206, uaF: -150, faF: -170 }),
    strike: S({
      t: 36,
      h: -24,
      thN: 24,
      shN: 2,
      ftN: 88,
      thF: -30,
      shF: -22,
      ftF: 60,
      uaN: 62,
      faN: 30,
      sw: 16,
      uaF: -110,
      faF: -80,
      glow: 1,
    }),
    hold: 0.5,
  },
  pierce: {
    windup: S({
      t: -8,
      h: -2,
      thN: 20,
      shN: -12,
      thF: -26,
      shF: -14,
      uaN: -44,
      faN: 62,
      sw: 92,
      uaF: 76,
      faF: 124,
    }),
    strike: S({
      t: 60,
      h: -48,
      thN: 86,
      shN: 14,
      ftN: 104,
      thF: -86,
      shF: -90,
      ftF: -44,
      uaN: 92,
      faN: 92,
      sw: 92,
      uaF: -96,
      faF: -98,
      glow: 1,
    }),
    hold: 0.55,
  },
  wave: {
    windup: S({
      t: -12,
      h: -6,
      ...WIDE_LEGS,
      uaN: 178,
      faN: 198,
      sw: 202,
      uaF: 60,
      faF: 120,
      glow: 1,
    }),
    strike: S({
      t: 28,
      h: -20,
      ...LUNGE_LEGS,
      uaN: 72,
      faN: 40,
      sw: 36,
      uaF: -100,
      faF: -70,
      glow: 1,
    }),
    hold: 0.4,
  },
  rising: {
    windup: S({
      t: 30,
      h: -24,
      ...CROUCH_LEGS,
      uaN: 30,
      faN: 12,
      sw: 20,
      uaF: -70,
      faF: -40,
      sq: 0.95,
    }),
    strike: S({
      t: -8,
      h: -26,
      thN: 106,
      shN: 8,
      ftN: 100,
      thF: -6,
      shF: -8,
      ftF: 60,
      uaN: 176,
      faN: 182,
      sw: 181,
      uaF: -64,
      faF: -44,
      sq: 1.05,
      glow: 1,
    }),
    hold: 0.3,
  },
  quake: {
    windup: S({
      t: -12,
      h: -18,
      thN: 40,
      shN: -30,
      ftN: 70,
      thF: -20,
      shF: -44,
      ftF: 40,
      uaN: 180,
      faN: 200,
      sw: 196,
      uaF: 172,
      faF: 192,
      sq: 1.05,
    }),
    strike: S({
      t: 46,
      h: -16,
      ...CROUCH_LEGS,
      thN: 94,
      uaN: 40,
      faN: 10,
      sw: 0,
      uaF: 34,
      faF: 8,
      sq: 0.93,
      glow: 1,
    }),
    hold: 0.6,
  },
  light: { windup: POSES.light, strike: mk({ glow: 1 }, POSES.light), hold: 0.5 },
  counter: {
    windup: POSES.guard,
    strike: S({
      t: 34,
      h: -26,
      ...DEEP_LUNGE,
      uaN: 104,
      faN: 114,
      sw: 124,
      uaF: -98,
      faF: -80,
      glow: 1,
    }),
    follow: S({ t: 30, h: -22, ...DEEP_LUNGE, uaN: 130, faN: 150, sw: 160, uaF: -98, faF: -80 }),
  },
}

/** 疾风连斩：判定期间在两个斩击姿势之间来回切，配合残影。 */
const GALE_A = S({
  t: 34,
  h: -26,
  ...DEEP_LUNGE,
  uaN: 150,
  faN: 168,
  sw: 166,
  uaF: -90,
  faF: -70,
  glow: 1,
})
const GALE_B = S({
  t: 42,
  h: -30,
  ...DEEP_LUNGE,
  uaN: 84,
  faN: 60,
  sw: 26,
  uaF: -100,
  faF: -80,
  glow: 1,
})

export const PLUNGE_FALL = S({
  t: 12,
  h: 18,
  ...TUCK_LEGS,
  thN: 92,
  uaN: 22,
  faN: 4,
  uaF: 18,
  faF: 8,
  sw: 0,
  glow: 1,
})
export const PLUNGE_LAND = S({
  t: 44,
  h: 10,
  ...CROUCH_LEGS,
  thN: 92,
  uaN: 30,
  faN: 6,
  uaF: 24,
  faF: 4,
  sw: 2,
  sq: 0.93,
  glow: 1,
})

function timeline(m: MoveDef, entry: Pose): Key[] {
  const shape = SHAPES[m.id]
  const s = m.startup
  const a = m.startup + m.active
  const total = a + m.recovery
  if (!shape) return [{ f: 0, pose: entry, ease: 'linear' }]
  const follow = shape.follow ?? shape.strike
  const holdUntil = a + Math.round(m.recovery * (shape.hold ?? 0.35))
  return [
    { f: 0, pose: entry, ease: 'linear' },
    { f: Math.max(1, s - 1), pose: shape.windup, ease: 'out' },
    { f: Math.max(s, a - 1), pose: shape.strike, ease: 'snap' },
    { f: holdUntil, pose: follow, ease: 'out' },
    { f: total, pose: STANCE, ease: 'inOut' },
  ]
}

function sample(keys: readonly Key[], f: number): Pose {
  let prev = keys[0]
  if (!prev) return STANCE
  for (const k of keys.slice(1)) {
    if (f <= k.f) {
      const span = Math.max(1, k.f - prev.f)
      const t = Math.min(1, Math.max(0, (f - prev.f) / span))
      return lerpPose(prev.pose, k.pose, ease[k.ease](t))
    }
    prev = k
  }
  return prev.pose
}

/** 招式进行到第 f 帧时的姿势。entry 是出招那一刻的姿势，保证衔接不跳。 */
export function movePose(m: MoveDef, f: number, entry: Pose): Pose {
  if (m.id === 'gale') {
    const a0 = m.startup
    const a1 = m.startup + m.active
    if (f < a0) return sample(timeline({ ...m, id: 'dashSlash' }, entry), f)
    if (f < a1) {
      const k = (f - a0) % 6
      const from = Math.floor((f - a0) / 6) % 2 === 0 ? GALE_B : GALE_A
      const to = from === GALE_A ? GALE_B : GALE_A
      return lerpPose(from, to, ease.snap(Math.min(1, k / 2)))
    }
    return lerpPose(GALE_B, STANCE, ease.inOut((f - a1) / m.recovery))
  }
  if (m.id === 'super') {
    if (f < m.startup) return lerpPose(entry, POSES.light, ease.out(f / m.startup))
    if (f < 84)
      return (Math.floor(f / 5) % 2 === 0 ? SHAPES.n1?.strike : SHAPES.n2?.strike) ?? STANCE
    const n4 = SHAPES.n4
    if (!n4) return STANCE
    if (f < 96) return n4.strike
    return lerpPose(n4.strike, STANCE, ease.inOut((f - 96) / 14))
  }
  return sample(timeline(m, entry), f)
}

/** 坠星落地阶段。 */
export function landPose(f: number, active: number, recovery: number): Pose {
  if (f < active + recovery * 0.5) return PLUNGE_LAND
  return lerpPose(PLUNGE_LAND, STANCE, ease.inOut((f - active - recovery * 0.5) / (recovery * 0.5)))
}
