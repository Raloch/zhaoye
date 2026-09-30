/**
 * 所有手感参数集中在这里。单位：逻辑像素、帧（60 帧/秒）。
 * 数值出处见 docs/03-combat.md，调手感只改这个文件和 moves.ts。
 */

export const FPS = 60
export const VIEW_W = 480
export const VIEW_H = 270

export const PHYS = {
  walk: 2.0,
  run: 3.4,
  airControl: 0.9,
  groundAccel: 0.55,
  groundDecel: 0.7,
  airAccel: 0.3,
  jump: 5.4,
  doubleJump: 4.6,
  /** 上挑命中后跳跃取消：比普通跳高一点，正好追上被挑起 60px 的敌人。 */
  jumpCancel: 5.9,
  gravity: 0.28,
  maxFall: 6.5,
  /** 上升途中松开跳跃键，上升速度乘以这个系数。 */
  jumpCut: 0.5,
  coyote: 6,
  jumpBuffer: 6,
  dropThrough: 12,
  friction: 0.82,
} as const

export const INPUT_WINDOW = {
  /** 指令中相邻两个方向按下的最大间隔。 */
  between: 12,
  /** 最后一个方向到攻击键的最大间隔。 */
  toAttack: 10,
  /** 双击方向进入疾跑。 */
  doubleTap: 12,
  /** 取消窗口打开前多少帧内的按键会被缓冲。 */
  buffer: 8,
  /** 疾跑多少帧后按 J 才算冲刺斩（更早按是 →→J 疾风连斩）。 */
  runSlash: 12,
  /** 按住 J 多少帧进入蓄力姿态、多少帧后松开放蓄力斩。 */
  chargeStart: 14,
  chargeRelease: 30,
} as const

export const DEFENSE = {
  parry: 6,
  counterWindow: 20,
  blockstun: 10,
  blockPush: 2.2,
  guardRelease: 6,
  dashFrames: 22,
  dashMoveFrames: 14,
  dashInvuln: [2, 11] as const,
  dashSpeed: 4.0,
  dashCancelMp: 10,
  techInvuln: 20,
  getupFrames: 20,
  getupInvuln: 60,
  downFrames: 30,
  hurtStun: 20,
} as const

export const RES = {
  hp: 100,
  mp: 100,
  atk: 10,
  mpRegen: 2 / FPS,
  mpOnHit: 1.5,
  mpOnParry: 8,
  swordMax: 100,
  swordOnParry: 10,
  swordOnHurt: 0.3,
  critRate: 0.05,
  critMul: 1.5,
  lightCooldown: 240,
  respawn: 120,
} as const

export const COMBO = {
  scaleAt20: 0.8,
  scaleAt40: 0.6,
  juggleGravity: 0.06,
  juggleMax: 15,
  endDelay: 30,
  ratingMul: [1, 1.2, 1.5, 2, 3] as const,
  ratingNames: ['初', '巧', '妙', '绝', '神'] as const,
  brokenBonus: 1.3,
} as const

export const ENEMY = {
  maxTokens: 2,
  downFrames: 40,
  getupFrames: 16,
  groundBounce: 4.6,
  wallBounceMin: 1.5,
  techInvuln: 24,
  poiseRegenDelay: 120,
  deadFrames: 50,
} as const
