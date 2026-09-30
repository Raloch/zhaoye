/**
 * 每个逻辑帧的输入是两张位掩码：held（这一帧按着的）和 pressed（这一帧新按下的）。
 * 一局 = 种子 + InputFrame[]，回放就是把这串东西重新喂给 step。
 */

export const BTN = {
  left: 1 << 0,
  right: 1 << 1,
  up: 1 << 2,
  down: 1 << 3,
  attack: 1 << 4,
  jump: 1 << 5,
  guard: 1 << 6,
  light: 1 << 7,
  super: 1 << 8,
} as const

export type ButtonName = keyof typeof BTN

export type InputFrame = { readonly held: number; readonly pressed: number }

export const NO_INPUT: InputFrame = { held: 0, pressed: 0 }

/** 输入历史保留的帧数，够覆盖最长的指令窗口。 */
export const HISTORY_LENGTH = 32

export const isHeld = (f: InputFrame, b: number): boolean => (f.held & b) !== 0
export const isPressed = (f: InputFrame, b: number): boolean => (f.pressed & b) !== 0

export function pushHistory(history: InputFrame[], f: InputFrame): void {
  history.push(f)
  if (history.length > HISTORY_LENGTH) history.shift()
}

/** 由上一帧的 held 和这一帧的 held 推出 pressed。键盘层额外会补上一帧内按下又松开的键。 */
export function frameFrom(prevHeld: number, held: number, tapped = 0): InputFrame {
  return { held: held | tapped, pressed: (held & ~prevHeld) | tapped }
}

/** 水平方向：-1 左、0 无、1 右。同时按住左右算无。 */
export function axisX(f: InputFrame): -1 | 0 | 1 {
  const l = isHeld(f, BTN.left)
  const r = isHeld(f, BTN.right)
  if (l === r) return 0
  return r ? 1 : -1
}
