import { BTN, frameFrom, type InputFrame } from '../core/input'

/**
 * 物理按键 → 每帧的 InputFrame。
 *
 * 逻辑 60Hz 采样一次。如果只看「采样那一刻按着没」，一次不到 16ms 的轻点会漏掉，
 * 所以 keydown 时额外记一笔 tapped，下次采样时一定算「按下」。
 */

const GAME_KEYS: Record<string, number> = {
  a: BTN.left,
  d: BTN.right,
  w: BTN.up,
  s: BTN.down,
  arrowleft: BTN.left,
  arrowright: BTN.right,
  arrowup: BTN.up,
  arrowdown: BTN.down,
  j: BTN.attack,
  k: BTN.jump,
  ' ': BTN.jump,
  l: BTN.guard,
  u: BTN.light,
  o: BTN.super,
}

export type Keyboard = {
  sample(): InputFrame
  /** 非游戏键（调试、训练场热键）的回调。返回 true 表示已处理。 */
  onCommand(handler: (key: string) => boolean): void
  dispose(): void
}

export function createKeyboard(target: Window = window): Keyboard {
  let held = 0
  let tapped = 0
  let prevHeld = 0
  let command: ((key: string) => boolean) | null = null

  function keyName(e: KeyboardEvent): string {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase()
  }

  function onDown(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const k = keyName(e)
    const bit = GAME_KEYS[k]
    if (bit !== undefined) {
      e.preventDefault()
      if (e.repeat) return
      held |= bit
      tapped |= bit
      return
    }
    if (e.repeat) return
    if (command?.(k)) e.preventDefault()
  }

  function onUp(e: KeyboardEvent): void {
    const bit = GAME_KEYS[keyName(e)]
    if (bit !== undefined) held &= ~bit
  }

  function onBlur(): void {
    held = 0
  }

  target.addEventListener('keydown', onDown)
  target.addEventListener('keyup', onUp)
  target.addEventListener('blur', onBlur)

  return {
    sample() {
      // 每次 keydown 都是一次真正的按下（repeat 已过滤），哪怕采样间隔里松开又按下
      const f = frameFrom(prevHeld, held, tapped)
      prevHeld = held
      tapped = 0
      return f
    },
    onCommand(handler) {
      command = handler
    },
    dispose() {
      target.removeEventListener('keydown', onDown)
      target.removeEventListener('keyup', onUp)
      target.removeEventListener('blur', onBlur)
    },
  }
}
