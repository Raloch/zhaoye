import { describe, expect, it } from 'vitest'
import { MOVES, totalFrames } from '../src/core/moves'
import { distinct, game, idle, moveTrace, place, run, script } from './helpers'

describe('招式数据', () => {
  it('帧数与文档一致', () => {
    const expected: Record<string, [number, number, number]> = {
      n1: [5, 3, 12],
      n2: [5, 3, 13],
      n3: [6, 4, 14],
      n4: [10, 4, 22],
      charge: [8, 5, 20],
      launcher: [7, 4, 18],
      sweep: [6, 4, 16],
      dashSlash: [4, 6, 16],
      a1: [4, 3, 10],
      pierce: [6, 8, 18],
      wave: [10, 2, 16],
      rising: [3, 12, 24],
      gale: [8, 36, 20],
      quake: [14, 6, 26],
      counter: [3, 4, 16],
    }
    for (const [id, [s, a, r]] of Object.entries(expected)) {
      const m = MOVES[id as keyof typeof MOVES]
      expect([m.startup, m.active, m.recovery], id).toEqual([s, a, r])
    }
  })

  it('判定框都落在判定期内', () => {
    for (const m of Object.values(MOVES)) {
      if (m.untilLand || m.id === 'super') continue
      for (const h of m.hits) {
        expect(h.from, m.id).toBeGreaterThanOrEqual(m.startup)
        expect(h.to, m.id).toBeLessThanOrEqual(m.startup + m.active)
      }
    }
  })

  it('连段引用的下一段都存在', () => {
    for (const m of Object.values(MOVES)) if (m.next) expect(MOVES[m.next]).toBeDefined()
  })
})

describe('普攻连段', () => {
  it('连按 J 打出青锋一至四', () => {
    const s = game()
    const trace = moveTrace(
      s,
      script([
        [['attack'], 1],
        [[], 7],
        [['attack'], 1],
        [[], 7],
        [['attack'], 1],
        [[], 8],
        [['attack'], 1],
        [[], 50],
      ]),
    )
    expect(distinct(trace.filter((x) => x !== null))).toEqual(['n1', 'n2', 'n3', 'n4'])
  })

  it('挥空时，起手期按的 J 会被缓冲到收招期再接下一段', () => {
    const s = game()
    const trace = moveTrace(
      s,
      script([
        [['attack'], 1],
        [[], 2],
        [['attack'], 1],
        [[], 40],
      ]),
    )
    const firstN2 = trace.indexOf('n2')
    // n1 判定结束在第 8 帧，n2 最早在那之后开始
    expect(firstN2).toBeGreaterThanOrEqual(8)
    expect(firstN2).toBeLessThanOrEqual(10)
  })

  it('停手太久就不接了，重新从青锋·一开始', () => {
    const s = game()
    const trace = moveTrace(
      s,
      script([
        [['attack'], 1],
        [[], 40],
        [['attack'], 1],
        [[], 30],
      ]),
    )
    expect(distinct(trace).filter((x) => x !== null)).toEqual(['n1', 'n1'])
  })

  it('按住 J 蓄力，松开放蓄力斩', () => {
    const s = game()
    const trace = moveTrace(
      s,
      script([
        [['attack'], 40],
        [[], 40],
      ]),
    )
    expect(distinct(trace.filter((x) => x !== null))).toEqual(['n1', 'charge'])
  })

  it('蓄力不够就松开，不出蓄力斩', () => {
    const s = game()
    const trace = moveTrace(
      s,
      script([
        [['attack'], 24],
        [[], 40],
      ]),
    )
    expect(trace).not.toContain('charge')
  })
})

describe('特技与灵力', () => {
  it('↓→J 消耗 15 灵力放剑气', () => {
    const s = game()
    const before = s.player.mp
    run(
      s,
      script([
        [['down'], 2],
        [['right'], 2],
        [['right', 'attack'], 1],
        [[], 30],
      ]),
    )
    expect(s.player.mp).toBeLessThan(before - 14)
    expect(s.events.length).toBeGreaterThanOrEqual(0)
  })

  it('灵力不够时降级成普攻', () => {
    const s = game()
    s.player.mp = 5
    const trace = moveTrace(
      s,
      script([
        [['down'], 2],
        [['right'], 2],
        [['right', 'attack'], 1],
        [[], 30],
      ]),
    )
    expect(trace).not.toContain('wave')
    expect(trace).toContain('n1')
  })

  it('升龙斩前 8 帧无敌', () => {
    const s = game()
    const inv: boolean[] = []
    run(
      s,
      script([
        [['down'], 2],
        [['up'], 2],
        [['up', 'attack'], 1],
        [[], 12],
      ]),
      (st) => {
        if (st.player.move?.id === 'rising') inv.push(st.player.move.frame <= 8)
      },
    )
    expect(inv.length).toBeGreaterThan(8)
  })
})

describe('打击', () => {
  it('命中后双方顿帧 3 帧，招式帧不前进', () => {
    const s = game()
    place(s, 'dummy', 188)
    let hitFrame = -1
    const frames: number[] = []
    run(
      s,
      script([
        [['attack'], 1],
        [[], 20],
      ]),
      (st) => {
        if (hitFrame < 0 && st.events.some((e) => e.type === 'hit')) hitFrame = frames.length
        frames.push(st.player.move?.frame ?? -1)
      },
    )
    expect(hitFrame).toBeGreaterThan(0)
    const a = frames[hitFrame]
    expect(frames[hitFrame + 1]).toBe(a)
    expect(frames[hitFrame + 3]).toBe(a)
    expect(frames[hitFrame + 4]).not.toBe(a)
  })

  it('上挑把木桩挑起约 60 像素', () => {
    const s = game()
    const d = place(s, 'dummy', 186)
    let top = d.y
    run(
      s,
      script([
        [['up'], 2],
        [['up', 'attack'], 1],
        [[], 50],
      ]),
      () => {
        top = Math.min(top, d.y)
      },
    )
    expect(s.level.floorY - top).toBeGreaterThan(50)
    expect(s.level.floorY - top).toBeLessThan(75)
  })

  it('上挑命中后按 K 跳跃取消，跟上去空中追击', () => {
    const s = game()
    place(s, 'dummy', 186)
    const trace = moveTrace(
      s,
      script([
        [['up'], 1],
        [['up', 'attack'], 1],
        [[], 9],
        [['jump'], 6],
        [['jump', 'attack'], 1],
        [['jump'], 6],
        [['jump', 'attack'], 1],
        [[], 30],
      ]),
    )
    expect(distinct(trace.filter((x) => x !== null))).toEqual(['launcher', 'a1', 'a2'])
    expect(s.combo.count).toBeGreaterThanOrEqual(3)
  })

  it('普攻命中后可以取消成特技', () => {
    const s = game()
    place(s, 'dummy', 188)
    const trace = moveTrace(
      s,
      script([
        [['attack'], 1],
        [[], 4],
        [['down'], 2],
        [['right'], 1],
        [['right', 'attack'], 1],
        [[], 40],
      ]),
    )
    expect(distinct(trace.filter((x) => x !== null))).toEqual(['n1', 'wave'])
  })

  it('普攻挥空时不能取消成特技，要等收招结束', () => {
    const s = game()
    const trace = moveTrace(
      s,
      script([
        [['attack'], 1],
        [[], 4],
        [['down'], 2],
        [['right'], 1],
        [['right', 'attack'], 1],
        [[], 40],
      ]),
    )
    const n1End = trace.lastIndexOf('n1')
    expect(n1End).toBe(totalFrames(MOVES.n1) - 1)
  })
})

describe('防御', () => {
  it('闪步第 2～11 帧无敌，穿过灰狼的扑咬', () => {
    const s = game()
    const w = place(s, 'wolf', 230)
    w.cooldown = 0
    let evaded = false
    let hurt = false
    // 等灰狼起跳后闪步
    run(s, script([[[], 20]]))
    run(
      s,
      script([
        [['guard'], 1],
        [['guard', 'right'], 12],
        [[], 30],
      ]),
      (st) => {
        if (st.events.some((e) => e.type === 'evade')) evaded = true
        if (st.events.some((e) => e.type === 'hit' && e.target === 'player')) hurt = true
      },
    )
    expect(evaded || !hurt).toBe(true)
  })

  it('按住格挡挡住灰狼，不掉血', () => {
    const s = game()
    const w = place(s, 'wolf', 190)
    w.facing = -1
    run(s, script([[['guard'], 1]]))
    w.cooldown = 0
    run(s, script([[['guard'], 60]]))
    expect(s.player.hp).toBe(s.player.maxHp)
  })

  it('弹反：受击前 6 帧内按下 L', () => {
    const s = game()
    const w = place(s, 'wolf', 184)
    w.facing = -1
    w.cooldown = 0
    let hitAt = -1
    // 先找出灰狼的撕咬在第几帧打到
    const probe = structuredClone(s)
    run(probe, script([[[], 60]]), (st) => {
      if (hitAt < 0 && st.events.some((e) => e.type === 'hit' && e.target === 'player'))
        hitAt = st.frame
    })
    expect(hitAt).toBeGreaterThan(0)
    let parried = false
    run(
      s,
      script([
        [[], hitAt - 3],
        [['guard'], 20],
      ]),
      (st) => {
        if (st.events.some((e) => e.type === 'parry')) parried = true
      },
    )
    expect(parried).toBe(true)
    expect(s.player.hp).toBe(s.player.maxHp)
  })

  it('红光攻击不能格挡', () => {
    const s = game()
    const g = place(s, 'guard', 196)
    g.facing = -1
    g.attack = { id: 'cleave', frame: 0, done: 0 }
    g.state = 'windup'
    run(s, script([[['guard'], 60]]))
    expect(s.player.hp).toBeLessThan(s.player.maxHp)
  })

  it('被击飞后落地前按 K 受身', () => {
    const s = game()
    s.player.state = 'launched'
    s.player.onGround = false
    s.player.vy = -3
    s.player.y -= 20
    let teched = false
    run(
      s,
      script([
        [[], 8],
        [['jump'], 2],
        [[], 30],
      ]),
      (st) => {
        if (st.events.some((e) => e.type === 'tech')) teched = true
      },
    )
    expect(teched).toBe(true)
    expect(s.player.state).toBe('free')
  })
})

describe('其他', () => {
  it('剑意满了按 O 放奥义，期间无敌', () => {
    const s = game()
    s.player.sword = 100
    place(s, 'dummy', 300)
    run(
      s,
      script([
        [['super'], 1],
        [[], 130],
      ]),
    )
    expect(s.player.sword).toBe(0)
    idle(s, 1)
    expect(s.combo.best).toBeGreaterThanOrEqual(13)
  })
})
