import { INPUT_WINDOW } from './config'
import type { Facing } from './geom'
import { BTN, type InputFrame, isHeld, isPressed } from './input'

/**
 * 攻击键按下那一帧识别出的指令。只描述「玩家按了什么」，
 * 不管灵力够不够、当前能不能出招——那是 player.ts 的事。
 */
export type Command =
  | 'quake' // ↓↓J 镇地剑
  | 'rising' // ↓↑J 升龙斩
  | 'wave' // ↓→J 剑气·破月
  | 'pierce' // ←→J 穿云刺
  | 'gale' // →→J 疾风连斩
  | 'up' // ↑+J
  | 'down' // ↓+J
  | 'attack' // J

type RelDir = 'fwd' | 'back' | 'up' | 'down'
type DirPress = { dir: RelDir; age: number }

/** 从新到旧列出历史里的方向「按下」事件。左右按当前朝向换算成前后。 */
function dirPresses(history: readonly InputFrame[], facing: Facing): DirPress[] {
  const out: DirPress[] = []
  const last = history.length - 1
  for (let i = last; i >= 0; i--) {
    const f = history[i]
    if (f === undefined) continue
    const age = last - i
    if (isPressed(f, BTN.up)) out.push({ dir: 'up', age })
    if (isPressed(f, BTN.down)) out.push({ dir: 'down', age })
    if (isPressed(f, BTN.right)) out.push({ dir: facing === 1 ? 'fwd' : 'back', age })
    if (isPressed(f, BTN.left)) out.push({ dir: facing === 1 ? 'back' : 'fwd', age })
  }
  return out
}

/**
 * 按顺序匹配方向序列：最后一个方向离攻击键 ≤ toAttack 帧，相邻方向间隔 ≤ between 帧，
 * 而且必须是不同的两次按下（↓↓ 需要按两次）。小范围回溯，事件数很少，代价可以忽略。
 */
function matches(presses: readonly DirPress[], seq: readonly RelDir[]): boolean {
  const search = (k: number, newerAge: number, from: number): boolean => {
    if (k < 0) return true
    const limit = k === seq.length - 1 ? INPUT_WINDOW.toAttack : INPUT_WINDOW.between
    for (let i = from; i < presses.length; i++) {
      const p = presses[i]
      if (p === undefined) continue
      if (p.age - newerAge > limit) break
      if (p.dir === seq[k] && (k === seq.length - 1 || p.age > newerAge)) {
        if (search(k - 1, p.age, i + 1)) return true
      }
    }
    return false
  }
  return search(seq.length - 1, 0, 0)
}

const MOTIONS: readonly [Command, readonly RelDir[]][] = [
  ['quake', ['down', 'down']],
  ['rising', ['down', 'up']],
  ['wave', ['down', 'fwd']],
  ['pierce', ['back', 'fwd']],
  ['gale', ['fwd', 'fwd']],
]

/**
 * 纯函数：给定输入历史（最后一项是当前帧）和当前朝向，返回本帧的攻击指令。
 * 当前帧没按 J 就返回 null。匹配顺序从长到短、从特殊到一般。
 */
export function recognize(history: readonly InputFrame[], facing: Facing): Command | null {
  const now = history[history.length - 1]
  if (now === undefined || !isPressed(now, BTN.attack)) return null
  const presses = dirPresses(history, facing)
  for (const [cmd, seq] of MOTIONS) {
    if (matches(presses, seq)) return cmd
  }
  if (isHeld(now, BTN.up)) return 'up'
  if (isHeld(now, BTN.down)) return 'down'
  return 'attack'
}

/** 同一个原始方向键在 window 帧内被按下两次（不含当前帧之外的更早记录）。用于疾跑判定。 */
export function doubleTapped(
  history: readonly InputFrame[],
  button: number,
  window = INPUT_WINDOW.doubleTap,
): boolean {
  const last = history.length - 1
  const now = history[last]
  if (now === undefined || !isPressed(now, button)) return false
  for (let i = last - 1; i >= 0 && last - i <= window; i--) {
    const f = history[i]
    if (f !== undefined && isPressed(f, button)) return true
  }
  return false
}

/** 距离上一次按下某键过去了多少帧；历史里没有就返回 Infinity。 */
export function framesSincePress(history: readonly InputFrame[], button: number): number {
  const last = history.length - 1
  for (let i = last; i >= 0; i--) {
    const f = history[i]
    if (f !== undefined && isPressed(f, button)) return last - i
  }
  return Number.POSITIVE_INFINITY
}
