import { spawnEnemy } from '../src/core/enemies'
import { createGame, type GameOptions, type GameState, step } from '../src/core/game'
import { BTN, type ButtonName, frameFrom, type InputFrame } from '../src/core/input'
import type { Enemy, EnemyKind } from '../src/core/state'

/** 把「按住哪些键、持续几帧」的脚本展开成逐帧输入。 */
export function script(steps: readonly (readonly [readonly ButtonName[], number])[]): InputFrame[] {
  const out: InputFrame[] = []
  let prev = 0
  for (const [buttons, n] of steps) {
    const held = buttons.reduce((m, b) => m | BTN[b], 0)
    for (let i = 0; i < n; i++) {
      out.push(frameFrom(prev, held))
      prev = held
    }
  }
  return out
}

export function run(
  s: GameState,
  inputs: readonly InputFrame[],
  each?: (s: GameState) => void,
): void {
  for (const f of inputs) {
    step(s, f)
    each?.(s)
  }
}

export function idle(s: GameState, n: number): void {
  run(s, script([[[], n]]))
}

/** 直接放一个已经站好的敌人（跳过 24 帧出场无敌）。 */
export function place(s: GameState, kind: EnemyKind, x: number): Enemy {
  const e = spawnEnemy(s, kind, x)
  e.state = 'idle'
  e.stateFrame = 0
  e.cooldown = 9999
  return e
}

export function game(o: GameOptions = {}): GameState {
  return createGame({ seed: 3, playerX: 160, ...o })
}

/** 跑完脚本，记录每帧玩家正在出的招。 */
export function moveTrace(s: GameState, inputs: readonly InputFrame[]): (string | null)[] {
  const trace: (string | null)[] = []
  run(s, inputs, (st) =>
    trace.push(st.player.state === 'move' ? (st.player.move?.id ?? null) : null),
  )
  return trace
}

export function distinct<T>(xs: readonly T[]): T[] {
  const out: T[] = []
  for (const x of xs) if (x !== out[out.length - 1]) out.push(x)
  return out
}
