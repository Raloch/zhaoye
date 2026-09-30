import { type Box, box } from './geom'

/**
 * 叶昭的全部招式。帧数与 docs/03-combat.md 的招式表一一对应。
 *
 * 约定：
 * - 帧号从 0 开始，0..startup-1 是起手，startup..startup+active-1 是判定，其后是收招。
 * - 判定框相对脚底中心、面朝右；y 为负表示在脚底之上。
 * - 判定框写在这里，不从动画推导：动画只是表现，逻辑不依赖骨骼姿势。
 */

export type MoveId =
  | 'n1'
  | 'n2'
  | 'n3'
  | 'n4'
  | 'charge'
  | 'launcher'
  | 'sweep'
  | 'dashSlash'
  | 'a1'
  | 'a2'
  | 'a3'
  | 'plunge'
  | 'pierce'
  | 'wave'
  | 'rising'
  | 'gale'
  | 'quake'
  | 'light'
  | 'counter'
  | 'super'

export type MoveTag = 'normal' | 'command' | 'special' | 'super' | 'counter' | 'utility'

/** 这一招命中（或被挡）后能取消成哪一类。 */
export type CancelTag = 'command' | 'special' | 'super' | 'jump' | 'dash'

export type HitProps = {
  /** 伤害倍率，乘攻击力。 */
  readonly dmg: number
  /** 地面硬直帧数。 */
  readonly stun: number
  /** 击退速度（px/f）。 */
  readonly kb: number
  /** 挑空：给敌人的向上初速。 */
  readonly launch?: number
  /** 击倒：落地后倒地。 */
  readonly down?: boolean
  /** 空中命中时把敌人往下砸。 */
  readonly slam?: boolean
  /** 空中追打时给敌人的上浮速度（默认 2.4）。 */
  readonly lift?: number
  readonly groundBounce?: boolean
  readonly wallBounce?: boolean
  /** 能打倒地的敌人。 */
  readonly otg?: boolean
  readonly guardBreak?: boolean
  /** 击退方向按「离攻击者中心的方向」算，而不是朝向（范围技用）。 */
  readonly radial?: boolean
  readonly poise: number
  readonly hitstop: number
  readonly shake?: number
  readonly heavy?: boolean
  readonly crit?: boolean
}

export type HitDef = {
  readonly from: number
  readonly to: number
  readonly box: Box
  readonly props: HitProps
  /** 同一个 group 对同一个敌人只命中一次；多段技每段一个 group。 */
  readonly group: number
  /** 打中画面内所有敌人（奥义），忽略 box。 */
  readonly screen?: boolean
}

export type MotionKey = {
  readonly from: number
  readonly to: number
  /** 每帧设定水平速度（按朝向）。 */
  readonly vx?: number
  /** 每帧设定竖直速度；impulse 为真时只在 from 这一帧设一次。 */
  readonly vy?: number
  readonly impulse?: boolean
}

export type ProjectileKind = 'wave' | 'quakeWave'

export type SpawnDef = {
  readonly frame: number
  readonly kind: ProjectileKind
  readonly dx: number
  readonly dy: number
  readonly vx: number
  /** 同时向前后各发一发。 */
  readonly both?: boolean
}

export type MoveDef = {
  readonly id: MoveId
  readonly name: string
  /** 连击评级按「种类」统计：青锋一至四算同一种。 */
  readonly family: string
  readonly tag: MoveTag
  /** 在空中使用。 */
  readonly air: boolean
  /** 地面空中都能用。 */
  readonly anywhere?: boolean
  readonly mp: number
  readonly startup: number
  readonly active: number
  readonly recovery: number
  readonly hits: readonly HitDef[]
  readonly motion?: readonly MotionKey[]
  readonly spawns?: readonly SpawnDef[]
  /** 无敌帧区间，闭区间。 */
  readonly invuln?: readonly [number, number]
  /** 可以穿过敌人。 */
  readonly passThrough?: boolean
  /** 按 J 接的下一段。 */
  readonly next?: MoveId
  readonly onHit?: readonly CancelTag[]
  /** 挥空也能取消成的类别。 */
  readonly always?: readonly CancelTag[]
  /** 空中普攻命中时让自己微微上浮。 */
  readonly hover?: boolean
  /** 招式期间的重力倍率。 */
  readonly gravity?: number
  /** 坠星：起手后一直下冲到落地，落地再判定。 */
  readonly untilLand?: {
    readonly fall: number
    readonly hits: readonly HitDef[]
    readonly active: number
    readonly recovery: number
  }
  /** 表现用：剑在判定期间从 swing[0] 扫到 swing[1]（肢体角度约定，0° 朝下、90° 朝前）。 */
  readonly swing: readonly [number, number]
  readonly heavy?: boolean
}

const P = {
  light: { stun: 18, kb: 1.6, poise: 10, hitstop: 3 },
  medium: { stun: 22, kb: 2.2, poise: 15, hitstop: 4 },
  heavy: { poise: 25, hitstop: 6, shake: 3, heavy: true },
} as const

const hit = (from: number, to: number, b: Box, props: HitProps, group = 0): HitDef => ({
  from,
  to,
  box: b,
  props,
  group,
})

const NORMAL_CANCELS: readonly CancelTag[] = ['command', 'special', 'super', 'dash']

const defs: MoveDef[] = [
  // ───────────── 地面普攻「青锋四式」 ─────────────
  {
    id: 'n1',
    name: '青锋·一',
    family: 'qingfeng',
    tag: 'normal',
    air: false,
    mp: 0,
    startup: 5,
    active: 3,
    recovery: 12,
    hits: [hit(5, 8, box(4, -36, 30, 26), { dmg: 1.0, ...P.light })],
    motion: [{ from: 0, to: 6, vx: 1.0 }],
    next: 'n2',
    onHit: NORMAL_CANCELS,
    always: ['dash'],
    swing: [150, 40],
  },
  {
    id: 'n2',
    name: '青锋·二',
    family: 'qingfeng',
    tag: 'normal',
    air: false,
    mp: 0,
    startup: 5,
    active: 3,
    recovery: 13,
    hits: [hit(5, 8, box(4, -38, 30, 28), { dmg: 1.0, ...P.light })],
    motion: [{ from: 0, to: 6, vx: 1.0 }],
    next: 'n3',
    onHit: NORMAL_CANCELS,
    always: ['dash'],
    swing: [30, 160],
  },
  {
    id: 'n3',
    name: '青锋·三',
    family: 'qingfeng',
    tag: 'normal',
    air: false,
    mp: 0,
    startup: 6,
    active: 4,
    recovery: 14,
    hits: [hit(6, 10, box(8, -31, 34, 14), { dmg: 1.2, ...P.medium })],
    motion: [{ from: 0, to: 10, vx: 1.2 }],
    next: 'n4',
    onHit: NORMAL_CANCELS,
    always: ['dash'],
    swing: [95, 88],
  },
  {
    id: 'n4',
    name: '青锋·四「断岳」',
    family: 'qingfeng',
    tag: 'normal',
    air: false,
    mp: 0,
    startup: 10,
    active: 4,
    recovery: 22,
    hits: [
      hit(10, 14, box(2, -50, 38, 50), {
        dmg: 2.0,
        stun: 30,
        kb: 3.4,
        launch: 3.0,
        down: true,
        guardBreak: true,
        wallBounce: true,
        ...P.heavy,
      }),
    ],
    motion: [{ from: 0, to: 12, vx: 0.8 }],
    onHit: NORMAL_CANCELS,
    always: ['dash'],
    swing: [195, 40],
    heavy: true,
  },
  {
    id: 'charge',
    name: '蓄力斩',
    family: 'charge',
    tag: 'normal',
    air: false,
    mp: 0,
    startup: 8,
    active: 5,
    recovery: 20,
    hits: [
      hit(8, 13, box(0, -54, 46, 54), {
        dmg: 3.0,
        stun: 34,
        kb: 4.2,
        launch: 3.4,
        down: true,
        guardBreak: true,
        wallBounce: true,
        poise: 50,
        hitstop: 8,
        shake: 4,
        heavy: true,
      }),
    ],
    motion: [{ from: 0, to: 10, vx: 1.6 }],
    onHit: NORMAL_CANCELS,
    swing: [205, 30],
    heavy: true,
  },

  // ───────────── 指令普攻 ─────────────
  {
    id: 'launcher',
    name: '上挑',
    family: 'launcher',
    tag: 'command',
    air: false,
    mp: 0,
    startup: 7,
    active: 4,
    recovery: 18,
    hits: [
      hit(7, 11, box(2, -62, 32, 60), {
        dmg: 1.2,
        stun: 40,
        kb: 0.6,
        launch: 5.8,
        poise: 10,
        hitstop: 4,
      }),
    ],
    onHit: ['special', 'super', 'jump'],
    always: ['dash'],
    swing: [20, 176],
  },
  {
    id: 'sweep',
    name: '扫堂',
    family: 'sweep',
    tag: 'command',
    air: false,
    mp: 0,
    startup: 6,
    active: 4,
    recovery: 16,
    hits: [
      hit(6, 10, box(2, -13, 38, 13), {
        dmg: 0.8,
        stun: 30,
        kb: 1.4,
        launch: 1.8,
        down: true,
        poise: 10,
        hitstop: 4,
      }),
    ],
    onHit: ['special', 'super'],
    always: ['dash'],
    swing: [40, 120],
  },
  {
    id: 'dashSlash',
    name: '冲刺斩',
    family: 'dashSlash',
    tag: 'command',
    air: false,
    mp: 0,
    startup: 4,
    active: 6,
    recovery: 16,
    hits: [
      hit(4, 10, box(0, -36, 36, 28), {
        dmg: 1.5,
        stun: 24,
        kb: 3.2,
        poise: 15,
        hitstop: 4,
        wallBounce: true,
      }),
    ],
    motion: [
      { from: 0, to: 10, vx: 4.0 },
      { from: 10, to: 14, vx: 1.5 },
    ],
    onHit: ['special', 'super', 'dash'],
    swing: [-60, 110],
  },

  // ───────────── 空中 ─────────────
  {
    id: 'a1',
    name: '空斩·一',
    family: 'air',
    tag: 'normal',
    air: true,
    mp: 0,
    startup: 4,
    active: 3,
    recovery: 10,
    hits: [
      hit(4, 7, box(2, -44, 32, 36), {
        dmg: 0.8,
        stun: 24,
        kb: 1.2,
        lift: 2.4,
        poise: 10,
        hitstop: 3,
      }),
    ],
    next: 'a2',
    hover: true,
    onHit: ['special', 'super', 'jump'],
    swing: [150, 50],
  },
  {
    id: 'a2',
    name: '空斩·二',
    family: 'air',
    tag: 'normal',
    air: true,
    mp: 0,
    startup: 4,
    active: 3,
    recovery: 10,
    hits: [
      hit(4, 7, box(2, -44, 32, 36), {
        dmg: 0.8,
        stun: 24,
        kb: 1.2,
        lift: 2.4,
        poise: 10,
        hitstop: 3,
      }),
    ],
    next: 'a3',
    hover: true,
    onHit: ['special', 'super', 'jump'],
    swing: [40, 150],
  },
  {
    id: 'a3',
    name: '空斩·三',
    family: 'air',
    tag: 'normal',
    air: true,
    mp: 0,
    startup: 4,
    active: 3,
    recovery: 12,
    hits: [
      hit(4, 7, box(0, -46, 36, 44), {
        dmg: 1.0,
        stun: 26,
        kb: 2.0,
        slam: true,
        down: true,
        poise: 15,
        hitstop: 5,
        shake: 2,
      }),
    ],
    hover: true,
    onHit: ['special', 'super'],
    swing: [175, 25],
  },
  {
    id: 'plunge',
    name: '坠星',
    family: 'plunge',
    tag: 'command',
    air: true,
    mp: 0,
    startup: 6,
    active: 0,
    recovery: 0,
    hits: [
      hit(6, 999, box(-8, -26, 30, 30), {
        dmg: 1.0,
        stun: 20,
        kb: 0.4,
        slam: true,
        down: true,
        poise: 10,
        hitstop: 3,
      }),
    ],
    motion: [{ from: 0, to: 6, vy: -0.8 }],
    untilLand: {
      fall: 8,
      active: 4,
      recovery: 14,
      hits: [
        hit(
          0,
          4,
          box(-34, -20, 68, 20),
          {
            dmg: 1.5,
            stun: 30,
            kb: 2.2,
            launch: 3.6,
            groundBounce: true,
            otg: true,
            radial: true,
            poise: 20,
            hitstop: 6,
            shake: 3,
            heavy: true,
          },
          1,
        ),
      ],
    },
    swing: [120, 2],
    heavy: true,
  },

  // ───────────── 特技 ─────────────
  {
    id: 'pierce',
    name: '穿云刺',
    family: 'pierce',
    tag: 'special',
    air: false,
    mp: 10,
    startup: 6,
    active: 8,
    recovery: 18,
    hits: [
      hit(6, 14, box(-6, -34, 30, 24), {
        dmg: 1.8,
        stun: 30,
        kb: 4.2,
        launch: 1.6,
        wallBounce: true,
        guardBreak: true,
        poise: 30,
        hitstop: 6,
        shake: 2,
        heavy: true,
      }),
    ],
    motion: [
      { from: 6, to: 14, vx: 10 },
      { from: 14, to: 18, vx: 2 },
    ],
    passThrough: true,
    onHit: ['special', 'super'],
    swing: [92, 88],
  },
  {
    id: 'wave',
    name: '剑气·破月',
    family: 'wave',
    tag: 'special',
    air: false,
    anywhere: true,
    mp: 15,
    startup: 10,
    active: 2,
    recovery: 16,
    hits: [],
    spawns: [{ frame: 10, kind: 'wave', dx: 18, dy: -26, vx: 6 }],
    gravity: 0.3,
    onHit: ['super'],
    swing: [170, 40],
  },
  {
    id: 'rising',
    name: '升龙斩',
    family: 'rising',
    tag: 'special',
    air: false,
    mp: 20,
    startup: 3,
    active: 12,
    recovery: 24,
    invuln: [0, 8],
    hits: [
      hit(
        3,
        7,
        box(0, -60, 30, 58),
        { dmg: 0.8, stun: 40, kb: 0.4, launch: 6.4, poise: 15, hitstop: 4 },
        0,
      ),
      hit(
        7,
        11,
        box(0, -60, 30, 58),
        { dmg: 0.8, stun: 40, kb: 0.4, launch: 6.4, poise: 15, hitstop: 4 },
        1,
      ),
      hit(
        11,
        15,
        box(0, -60, 30, 58),
        { dmg: 0.8, stun: 40, kb: 0.8, launch: 6.8, poise: 15, hitstop: 5, shake: 2 },
        2,
      ),
    ],
    motion: [
      { from: 3, to: 4, vy: -6.4, impulse: true },
      { from: 3, to: 15, vx: 1.0 },
    ],
    onHit: ['super', 'jump'],
    swing: [30, 182],
  },
  {
    id: 'gale',
    name: '疾风连斩',
    family: 'gale',
    tag: 'special',
    air: false,
    mp: 25,
    startup: 8,
    active: 36,
    recovery: 20,
    hits: [
      ...[0, 1, 2, 3, 4, 5].map((k) =>
        hit(
          8 + k * 6,
          11 + k * 6,
          box(-24, -40, 64, 36),
          { dmg: 0.6, stun: 30, kb: 0, lift: 1.2, poise: 10, hitstop: 2 },
          k,
        ),
      ),
      hit(
        42,
        44,
        box(-24, -44, 68, 42),
        { dmg: 1.5, stun: 34, kb: 3, launch: 5, poise: 25, hitstop: 7, shake: 3, heavy: true },
        6,
      ),
    ],
    motion: [
      { from: 8, to: 44, vx: 1.1 },
      { from: 44, to: 48, vx: 0.8 },
    ],
    passThrough: true,
    onHit: ['super'],
    swing: [-40, 140],
  },
  {
    id: 'quake',
    name: '镇地剑',
    family: 'quake',
    tag: 'special',
    air: false,
    mp: 30,
    startup: 14,
    active: 6,
    recovery: 26,
    hits: [
      hit(14, 20, box(-60, -22, 120, 22), {
        dmg: 3.0,
        stun: 34,
        kb: 2.4,
        launch: 5.2,
        otg: true,
        radial: true,
        poise: 40,
        hitstop: 8,
        shake: 5,
        heavy: true,
      }),
    ],
    spawns: [{ frame: 14, kind: 'quakeWave', dx: 40, dy: -10, vx: 4, both: true }],
    onHit: ['super'],
    swing: [178, 0],
    heavy: true,
  },

  // ───────────── 照夜、反击、奥义 ─────────────
  {
    id: 'light',
    name: '照夜',
    family: 'light',
    tag: 'utility',
    air: false,
    anywhere: true,
    mp: 15,
    startup: 6,
    active: 2,
    recovery: 10,
    hits: [
      hit(6, 8, box(-80, -64, 160, 70), {
        dmg: 0.5,
        stun: 20,
        kb: 4,
        radial: true,
        poise: 5,
        hitstop: 3,
      }),
    ],
    gravity: 0.2,
    swing: [180, 180],
  },
  {
    id: 'counter',
    name: '回风',
    family: 'counter',
    tag: 'counter',
    air: false,
    mp: 0,
    startup: 3,
    active: 4,
    recovery: 16,
    hits: [
      hit(3, 7, box(2, -46, 40, 42), {
        dmg: 2.5,
        crit: true,
        stun: 36,
        kb: 3.4,
        launch: 3.2,
        down: true,
        poise: 40,
        hitstop: 8,
        shake: 3,
        heavy: true,
      }),
    ],
    motion: [{ from: 0, to: 6, vx: 2.4 }],
    onHit: ['special', 'super'],
    swing: [-80, 120],
    heavy: true,
  },
  {
    id: 'super',
    name: '奥义·照夜破晓',
    family: 'super',
    tag: 'super',
    air: false,
    anywhere: true,
    mp: 0,
    startup: 20,
    active: 66,
    recovery: 24,
    invuln: [0, 110],
    hits: [
      ...Array.from({ length: 12 }, (_, k) => ({
        from: 20 + k * 5,
        to: 21 + k * 5,
        box: box(0, 0, 0, 0),
        props: { dmg: 0.5, stun: 60, kb: 0, lift: 0.6, poise: 10, hitstop: 1 },
        group: k,
        screen: true,
      })),
      {
        from: 84,
        to: 85,
        box: box(0, 0, 0, 0),
        props: {
          dmg: 6.0,
          stun: 40,
          kb: 3,
          launch: 5,
          down: true,
          radial: true,
          poise: 100,
          hitstop: 12,
          shake: 6,
          heavy: true,
        },
        group: 12,
        screen: true,
      },
    ],
    gravity: 0,
    swing: [180, 0],
    heavy: true,
  },
]

export const MOVES: Record<MoveId, MoveDef> = Object.fromEntries(
  defs.map((d) => [d.id, d]),
) as Record<MoveId, MoveDef>

export const MOVE_LIST: readonly MoveDef[] = defs

/** 招式总帧数（坠星的下冲阶段不计入，另算）。 */
export const totalFrames = (m: MoveDef): number => m.startup + m.active + m.recovery

/** 取消窗口：从判定第 1 帧到收招第 8 帧。 */
export const cancelWindow = (m: MoveDef): readonly [number, number] => [
  m.startup,
  m.startup + m.active + 8,
]
