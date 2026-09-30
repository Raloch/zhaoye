import { describe, expect, it } from 'vitest'
import { TRAINING } from '../src/core/level'
import { game, idle, run, script } from './helpers'

describe('移动与物理', () => {
  it('按住跳跃键的最高跳约 52 像素', () => {
    const s = game()
    const ground = s.player.y
    let top = ground
    run(s, script([[['jump'], 40]]), (st) => {
      top = Math.min(top, st.player.y)
    })
    expect(ground - top).toBeGreaterThan(49)
    expect(ground - top).toBeLessThan(55)
  })

  it('轻点跳跃跳得更矮（可控跳高）', () => {
    const s = game()
    let top = s.player.y
    run(
      s,
      script([
        [['jump'], 3],
        [[], 40],
      ]),
      (st) => {
        top = Math.min(top, st.player.y)
      },
    )
    expect(s.level.floorY - top).toBeLessThan(35)
  })

  it('二段跳能到更高的地方', () => {
    const s = game()
    let top = s.player.y
    run(
      s,
      script([
        [['jump'], 16],
        [[], 2],
        [['jump'], 30],
      ]),
      (st) => {
        top = Math.min(top, st.player.y)
      },
    )
    expect(s.level.floorY - top).toBeGreaterThan(75)
  })

  it('单向平台：从下面跳上去能站住', () => {
    const plat = TRAINING.platforms[0]
    if (!plat) throw new Error('训练场缺少平台')
    const s = game({ playerX: (plat.x0 + plat.x1) / 2 })
    run(
      s,
      script([
        [['jump'], 30],
        [[], 40],
      ]),
    )
    expect(s.player.y).toBe(plat.y)
    expect(s.player.onGround).toBe(true)
  })

  it('S+K 从单向平台跳下来', () => {
    const plat = TRAINING.platforms[0]
    if (!plat) throw new Error('训练场缺少平台')
    const s = game({ playerX: (plat.x0 + plat.x1) / 2 })
    run(
      s,
      script([
        [['jump'], 30],
        [[], 40],
      ]),
    )
    expect(s.player.y).toBe(plat.y)
    run(
      s,
      script([
        [['down'], 2],
        [['down', 'jump'], 1],
        [[], 40],
      ]),
    )
    expect(s.player.y).toBe(s.level.floorY)
  })

  it('走到关卡边缘会被墙挡住', () => {
    const s = game({ playerX: 20 })
    run(s, script([[['left'], 60]]))
    expect(s.player.x).toBe(s.player.halfW)
  })

  it('双击方向进入疾跑，速度 3.4', () => {
    const s = game()
    run(
      s,
      script([
        [['right'], 2],
        [[], 2],
        [['right'], 20],
      ]),
    )
    expect(s.player.runDir).toBe(1)
    expect(s.player.vx).toBeCloseTo(3.4)
    idle(s, 1)
    expect(s.player.runDir).toBe(0)
  })

  it('土狼时间：走出平台边缘 3 帧后按跳跃仍能起跳', () => {
    const plat = TRAINING.platforms[0]
    if (!plat) throw new Error('训练场缺少平台')
    const s = game({ playerX: plat.x1 - 4 })
    run(
      s,
      script([
        [['jump'], 30],
        [[], 30],
      ]),
    )
    expect(s.player.y).toBe(plat.y)
    for (let i = 0; i < 30 && s.player.onGround; i++) run(s, script([[['right'], 1]]))
    expect(s.player.onGround).toBe(false)
    run(
      s,
      script([
        [[], 3],
        [['jump'], 1],
      ]),
    )
    expect(s.player.vy).toBeLessThan(-4)
  })
})
