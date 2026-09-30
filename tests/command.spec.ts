import { describe, expect, it } from 'vitest'
import { doubleTapped, recognize } from '../src/core/command'
import { BTN, type InputFrame } from '../src/core/input'
import { script } from './helpers'

const last = (frames: InputFrame[]) => recognize(frames, 1)

describe('指令识别', () => {
  it('单按 J 是普攻', () => {
    expect(
      last(
        script([
          [[], 3],
          [['attack'], 1],
        ]),
      ),
    ).toBe('attack')
  })

  it('没按 J 不出任何指令', () => {
    expect(
      last(
        script([
          [['down'], 3],
          [['right'], 1],
        ]),
      ),
    ).toBeNull()
  })

  it('↓→J：剑气·破月', () => {
    expect(
      last(
        script([
          [['down'], 3],
          [['right'], 3],
          [['right', 'attack'], 1],
        ]),
      ),
    ).toBe('wave')
  })

  it('↓ 和 → 之间隔 13 帧就不算', () => {
    const f = script([
      [['down'], 1],
      [[], 12],
      [['right'], 2],
      [['right', 'attack'], 1],
    ])
    expect(last(f)).toBe('attack')
  })

  it('最后一个方向到 J 超过 10 帧就不算', () => {
    const f = script([
      [['down'], 2],
      [['right'], 12],
      [['right', 'attack'], 1],
    ])
    expect(last(f)).toBe('attack')
  })

  it('方向相对朝向：面朝左时 D、A、J 是 ←→J', () => {
    const f = script([
      [['right'], 2],
      [['left'], 2],
      [['left', 'attack'], 1],
    ])
    expect(recognize(f, -1)).toBe('pierce')
    // 同样的按键，面朝右时是「前、后」，不成立
    expect(recognize(f, 1)).toBe('attack')
  })

  it('↓↓J 需要按两次 ↓', () => {
    const twice = script([
      [['down'], 2],
      [[], 2],
      [['down'], 2],
      [['down', 'attack'], 1],
    ])
    expect(last(twice)).toBe('quake')
    const heldOnce = script([
      [['down'], 6],
      [['down', 'attack'], 1],
    ])
    expect(last(heldOnce)).toBe('down')
  })

  it('↓↑J 是升龙斩，只按住 ↑ 是上挑', () => {
    expect(
      last(
        script([
          [['down'], 2],
          [['up'], 2],
          [['up', 'attack'], 1],
        ]),
      ),
    ).toBe('rising')
    expect(
      last(
        script([
          [['up'], 4],
          [['up', 'attack'], 1],
        ]),
      ),
    ).toBe('up')
  })

  it('→→J 是疾风连斩', () => {
    expect(
      last(
        script([
          [['right'], 2],
          [[], 2],
          [['right'], 2],
          [['right', 'attack'], 1],
        ]),
      ),
    ).toBe('gale')
  })

  it('↓↓→J 同时满足 ↓↓ 和 ↓→ 时，↓↓J 优先', () => {
    const f = script([
      [['down'], 2],
      [[], 1],
      [['down'], 2],
      [['right'], 2],
      [['right', 'attack'], 1],
    ])
    expect(last(f)).toBe('quake')
  })

  it('斜向过渡也算：按住 ↓ 的同时按 →', () => {
    expect(
      last(
        script([
          [['down'], 3],
          [['down', 'right'], 2],
          [['right', 'attack'], 1],
        ]),
      ),
    ).toBe('wave')
  })

  it('双击判定窗口 12 帧', () => {
    const quick = script([
      [['right'], 2],
      [[], 4],
      [['right'], 1],
    ])
    expect(doubleTapped(quick, BTN.right)).toBe(true)
    const slow = script([
      [['right'], 2],
      [[], 14],
      [['right'], 1],
    ])
    expect(doubleTapped(slow, BTN.right)).toBe(false)
  })
})
