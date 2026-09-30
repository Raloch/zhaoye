import { analyzeSfx, createSfx } from './audio/sfx'
import { VIEW_H, VIEW_W } from './core/config'
import { createTraining, type GameState, spawn, step } from './core/game'
import { BTN, type ButtonName, frameFrom } from './core/input'
import type { EnemyKind } from './core/state'
import { createKeyboard } from './input/keyboard'
import { createTicker } from './loop/ticker'
import { InputLog } from './render/debug'
import { createFx } from './render/fx'
import { createRenderer } from './render/renderer'
import { renderMoveList } from './ui/movelist'

/**
 * 装配层：键盘 → core.step → 特效 / 音效 / 渲染。
 * 训练场的调试开关（F1～F10）和刷怪热键也在这里，它们不属于游戏逻辑。
 */

function requireEl<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`missing ${selector}`)
  return el
}

const canvas = requireEl<HTMLCanvasElement>('#game')
const help = requireEl<HTMLElement>('#help')
const toolbar = requireEl<HTMLElement>('#toolbar')
const status = requireEl<HTMLElement>('#status')

const SNAP_KEY = 'zhaoye.m1.snapshot'
const SPEEDS = [1, 0.5, 0.25] as const
const ZOOM = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('zoom') ?? 1) : 1

let state: GameState = createTraining()
let snapshot: GameState | null = loadSnapshot()
const renderer = createRenderer(canvas, state.level)
const fx = createFx()
const sfx = createSfx()
const keyboard = createKeyboard()
const log = new InputLog()

const flags = {
  hitboxes: false,
  frameData: false,
  inputs: false,
  paused: false,
  cheat: false,
  speed: 0,
  muted: false,
}
let stepOnce = false

renderMoveList(help)

function loadSnapshot(): GameState | null {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch {
    return null
  }
}

function tick(input = keyboard.sample()): void {
  log.push(input)
  renderer.capture(state)
  step(state, input)
  renderer.afterStep(state)
  fx.consume(state.events)
  sfx.consume(state.events)
  fx.update(state)
}

function flagText(): string {
  const parts: string[] = []
  if (flags.paused) parts.push('暂停（] 逐帧）')
  const sp = SPEEDS[flags.speed] ?? 1
  if (sp !== 1) parts.push(`慢放 ${sp}×`)
  if (flags.cheat) parts.push('无敌 · 灵力无限')
  if (flags.muted) parts.push('静音')
  return parts.join('  ·  ')
}

const ticker = createTicker({
  tickMs: () => 1000 / 60 / (SPEEDS[flags.speed] ?? 1),
  onTick() {
    if (flags.paused) {
      if (stepOnce) {
        stepOnce = false
        tick()
      }
      return
    }
    tick()
  },
  onRender(alpha) {
    renderer.draw(
      state,
      flags.paused ? 1 : alpha,
      fx,
      {
        hitboxes: flags.hitboxes,
        frameData: flags.frameData,
        inputs: flags.inputs,
        flags: flagText(),
        zoom: ZOOM,
      },
      log,
    )
  },
})

function spawnNear(kind: EnemyKind): void {
  const p = state.player
  spawn(state, kind, p.x + p.facing * 130)
}

function syncToolbar(): void {
  for (const b of toolbar.querySelectorAll<HTMLButtonElement>('button[data-toggle]')) {
    const k = b.dataset.toggle
    const on =
      k === 'hitboxes'
        ? flags.hitboxes
        : k === 'frameData'
          ? flags.frameData
          : k === 'inputs'
            ? flags.inputs
            : k === 'paused'
              ? flags.paused
              : k === 'cheat'
                ? flags.cheat
                : k === 'speed'
                  ? flags.speed !== 0
                  : k === 'help'
                    ? !help.hidden
                    : k === 'muted'
                      ? flags.muted
                      : false
    b.setAttribute('aria-pressed', String(on))
    if (k === 'speed') b.querySelector('span')?.replaceChildren(`慢放 ${SPEEDS[flags.speed] ?? 1}×`)
  }
}

function say(text: string): void {
  status.textContent = text
}

/** 训练场热键。返回 true 表示已处理。 */
function command(key: string): boolean {
  switch (key) {
    case 'f1':
      flags.hitboxes = !flags.hitboxes
      break
    case 'f2':
      flags.frameData = !flags.frameData
      break
    case 'f3':
      flags.speed = (flags.speed + 1) % SPEEDS.length
      break
    case 'f4':
      flags.paused = !flags.paused
      break
    case ']':
      if (!flags.paused) flags.paused = true
      stepOnce = true
      break
    case 'f5':
      flags.inputs = !flags.inputs
      break
    case 'f6':
      flags.cheat = !flags.cheat
      state.cheats.invincible = flags.cheat
      state.cheats.infiniteMp = flags.cheat
      break
    case 'f9':
      snapshot = structuredClone(state)
      try {
        localStorage.setItem(SNAP_KEY, JSON.stringify(snapshot))
      } catch {
        // 存不进本地也没关系，内存里还有一份
      }
      say(`已存快照（第 ${state.frame} 帧）`)
      break
    case 'f10':
      if (snapshot) {
        state = structuredClone(snapshot)
        renderer.capture(state)
        renderer.reset()
        say(`已读快照（第 ${state.frame} 帧）`)
      } else say('还没有快照，先按 F9')
      break
    case '1':
      spawnNear('wolf')
      break
    case '2':
      spawnNear('guard')
      break
    case '3':
      spawnNear('dummy')
      break
    case '0':
      state.enemies = []
      break
    case 'r':
      state = createTraining(state.frame + 7)
      state.cheats.invincible = flags.cheat
      state.cheats.infiniteMp = flags.cheat
      renderer.capture(state)
      renderer.reset()
      break
    case 'm':
      flags.muted = sfx.toggleMute()
      break
    case 'h':
    case 'escape':
      help.hidden = !help.hidden
      flags.paused = !help.hidden
      break
    default:
      return false
  }
  syncToolbar()
  return true
}

keyboard.onCommand(command)

toolbar.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-key]')
  if (!btn) return
  sfx.unlock()
  command(btn.dataset.key ?? '')
  btn.blur()
})
window.addEventListener('keydown', () => sfx.unlock(), { once: true })
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true })

function fitCanvas(): void {
  const maxW = Math.min(
    window.innerWidth - 32,
    ((window.innerHeight - 170) * VIEW_W) / VIEW_H,
    1600,
  )
  canvas.style.width = `${Math.max(320, Math.floor(maxW))}px`
  renderer.resize()
}
window.addEventListener('resize', fitCanvas)
fitCanvas()
syncToolbar()
renderer.capture(state)
ticker.start()

/**
 * 仅开发环境：给自动化测试用的脚本输入。先暂停，再按「按住哪些键、几帧」喂输入。
 * 例：__zhaoye.feed([[['attack'], 1], [[], 6]])
 */
if (import.meta.env.DEV) {
  let prevHeld = 0
  Object.assign(window, {
    __zhaoye: {
      get state() {
        return state
      },
      command,
      analyzeSfx,
      feed(steps: [ButtonName[], number][]) {
        flags.paused = true
        syncToolbar()
        for (const [buttons, n] of steps) {
          const held = buttons.reduce((acc, b) => acc | BTN[b], 0)
          for (let i = 0; i < n; i++) {
            const f = frameFrom(prevHeld, held)
            prevHeld = held
            tick(f)
          }
        }
        return {
          frame: state.frame,
          player: state.player.state,
          move: state.player.move?.id ?? null,
        }
      },
    },
  })
}
