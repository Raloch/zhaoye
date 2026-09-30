import { describe, expect, it } from 'vitest'
import { ratingOf } from '../src/core/combat'
import { createTraining, step } from '../src/core/game'
import { NO_INPUT } from '../src/core/input'
import { startMove } from '../src/core/player'
import { game, idle, place, run, script } from './helpers'

describe('连击评级', () => {
  it('招式种类越多，评级越高', () => {
    expect(ratingOf(['qingfeng'], 4)).toBe(0)
    expect(ratingOf(['qingfeng', 'launcher'], 5)).toBe(1)
    expect(ratingOf(['qingfeng', 'launcher', 'air'], 8)).toBe(2)
    expect(ratingOf(['qingfeng', 'launcher', 'air', 'plunge'], 20)).toBe(3)
    expect(ratingOf(['qingfeng', 'launcher', 'air', 'plunge', 'wave'], 35)).toBe(4)
  })

  it('「绝」要 20 连击，只换招不够', () => {
    expect(ratingOf(['qingfeng', 'launcher', 'air', 'plunge'], 12)).toBe(2)
  })

  it('同一招连用 3 次，算少一种', () => {
    expect(ratingOf(['qingfeng', 'launcher'], 6, 3)).toBe(0)
  })
})

describe('伤害与连段修正', () => {
  it('连击第 20 下起伤害 ×0.8', () => {
    const s = game()
    const d = place(s, 'dummy', 188)
    s.combo.count = 25
    s.combo.idle = 0
    d.state = 'hurt'
    d.stun = 60
    s.rng = 11
    const dmgs: number[] = []
    run(
      s,
      script([
        [['attack'], 1],
        [[], 20],
      ]),
      (st) => {
        for (const e of st.events) if (e.type === 'hit') dmgs.push(e.dmg)
      },
    )
    expect(dmgs[0]).toBeLessThanOrEqual(9)
  })

  it('浮空中挨满 15 下会自动受身', () => {
    const s = game()
    const d = place(s, 'dummy', 188)
    d.state = 'air'
    d.onGround = false
    d.y -= 40
    d.juggleHits = 14
    run(
      s,
      script([
        [['attack'], 1],
        [[], 60],
      ]),
    )
    expect(d.techPending || (d.state as string) === 'idle').toBe(true)
  })

  it('每段连击只能弹地一次', () => {
    const s = game()
    const d = place(s, 'dummy', 170)
    d.state = 'air'
    d.onGround = false
    d.y -= 30
    d.bouncePending = true
    let bounces = 0
    run(s, script([[[], 60]]), (st) => {
      bounces += st.events.filter((e) => e.type === 'bounce' && !e.wall).length
    })
    expect(bounces).toBe(1)
    d.state = 'air'
    d.onGround = false
    d.y -= 30
    d.bouncePending = true
    run(s, script([[[], 60]]), (st) => {
      bounces += st.events.filter((e) => e.type === 'bounce' && !e.wall).length
    })
    expect(bounces).toBe(1)
  })

  it('断岳把敌人打到墙上会墙弹', () => {
    const s = game({ playerX: 900 })
    s.player.facing = 1
    place(s, 'dummy', 930)
    let wall = false
    startMove(s, 'n4')
    for (let i = 0; i < 80; i++) {
      step(s, NO_INPUT)
      if (s.events.some((e) => e.type === 'bounce' && e.wall)) wall = true
    }
    expect(wall).toBe(true)
  })
})

describe('狼卫的盾', () => {
  it('正面普攻被盾挡住，不掉血', () => {
    const s = game()
    const g = place(s, 'guard', 190)
    g.facing = -1
    run(
      s,
      script([
        [['attack'], 1],
        [[], 20],
      ]),
    )
    expect(g.hp).toBe(g.maxHp)
  })

  it('断岳破防', () => {
    const s = game()
    const g = place(s, 'guard', 192)
    g.facing = -1
    let broke = false
    startMove(s, 'n4')
    for (let i = 0; i < 20; i++) {
      step(s, NO_INPUT)
      if (s.events.some((e) => e.type === 'guardBreak')) broke = true
    }
    expect(broke).toBe(true)
    expect(g.hp).toBeLessThan(g.maxHp)
  })

  it('从背后打没有盾', () => {
    const s = game()
    const g = place(s, 'guard', 188)
    g.facing = 1
    run(
      s,
      script([
        [['attack'], 1],
        [[], 10],
      ]),
    )
    expect(g.hp).toBeLessThan(g.maxHp)
  })
})

describe('攻击令牌', () => {
  it('同一时刻最多 2 个敌人在出招', () => {
    const s = createTraining(5)
    for (let i = 0; i < 4; i++) place(s, 'wolf', 300 + i * 60).cooldown = 0
    s.cheats.invincible = true
    let maxAttackers = 0
    for (let i = 0; i < 1500; i++) {
      step(s, NO_INPUT)
      const n = s.enemies.filter((e) => e.state === 'windup' || e.state === 'attack').length
      maxAttackers = Math.max(maxAttackers, n)
    }
    expect(maxAttackers).toBeGreaterThan(0)
    expect(maxAttackers).toBeLessThanOrEqual(2)
  })
})

describe('确定性', () => {
  it('同样的种子和输入，结果完全一样', () => {
    const inputs = script([
      [['right'], 30],
      [['attack'], 1],
      [[], 6],
      [['attack'], 1],
      [[], 6],
      [['up', 'attack'], 1],
      [['jump'], 20],
      [['attack'], 1],
      [[], 200],
      [['left'], 40],
      [['guard'], 30],
      [[], 300],
    ])
    const a = createTraining(42)
    const b = createTraining(42)
    run(a, inputs)
    run(b, inputs)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('快照读回来再跑，结果和没存过一样', () => {
    const a = createTraining(9)
    idle(a, 100)
    const snap = structuredClone(a)
    idle(a, 200)
    idle(snap, 200)
    expect(JSON.stringify(snap)).toBe(JSON.stringify(a))
  })
})
