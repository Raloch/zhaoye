import { resolveHits } from './combat'
import { recognize } from './command'
import { COMBO, VIEW_W } from './config'
import { ENEMY_DEFS, inCombo, removeDead, resetCombo, spawnEnemy, updateEnemy } from './enemies'
import { clamp } from './geom'
import { type InputFrame, pushHistory } from './input'
import { bufferCommand, currentMove, latchInput, updatePlayer } from './player'
import { createGame, type EnemyKind, type GameOptions, type GameState } from './state'

export { createGame, type GameOptions, type GameState }

/**
 * 推进一个逻辑帧（1/60 秒）。
 *
 * 纯逻辑、确定性：同一个初始状态 + 同一串输入，永远得到同一个结果。
 * 为了性能，状态原地修改；要保留旧状态用 structuredClone（F9 快照就是这么做的）。
 */
export function step(s: GameState, input: InputFrame): void {
  s.events = []
  pushHistory(s.history, input)
  bufferCommand(s, recognize(s.history, s.player.facing))
  latchInput(s, input)

  // 顿帧：只停逻辑。输入照常进历史和缓冲，所以顿帧期间按的键不会丢。
  if (s.hitstop > 0) {
    s.hitstop--
    return
  }

  updatePlayer(s, input)
  if (s.freeze > 0) s.freeze--
  const frozen = s.freeze > 0 && currentMove(s.player)?.id === 'super'
  for (const e of s.enemies) {
    if (frozen && e.state !== 'air') continue
    updateEnemy(s, e)
  }
  updateProjectiles(s)
  resolveHits(s)
  separate(s)
  updateCombo(s)
  removeDead(s)
  updateCamera(s)
  s.frame++
}

function updateProjectiles(s: GameState): void {
  for (const pr of s.projectiles) {
    pr.x += pr.vx
    pr.life--
  }
  s.projectiles = s.projectiles.filter(
    (pr) => pr.life > 0 && pr.x > -40 && pr.x < s.level.width + 40,
  )
}

/** 身体之间的推挤：玩家推不动正在出招的敌人，穿身技和闪步可以穿过去。 */
function separate(s: GameState): void {
  const p = s.player
  const m = currentMove(p)
  const pass = p.state === 'dash' || !!m?.passThrough || p.state === 'dead'
  for (const e of s.enemies) {
    if (
      pass ||
      e.state === 'dead' ||
      e.state === 'air' ||
      e.state === 'down' ||
      !p.onGround ||
      !e.onGround
    )
      continue
    if (e.kind === 'wolf' && e.state === 'idle') continue
    const minDist = p.halfW + e.halfW - 2
    const dx = p.x - e.x
    const overlap = minDist - Math.abs(dx)
    if (overlap <= 0) continue
    const push = dx === 0 ? p.facing : Math.sign(dx)
    const heavy = e.kind === 'guard' || e.kind === 'dummy'
    p.x = clamp(p.x + push * overlap * (heavy ? 1 : 0.5), p.halfW, s.level.width - p.halfW)
    if (!heavy) e.x = clamp(e.x - push * overlap * 0.5, e.halfW, s.level.width - e.halfW)
  }
}

function updateCombo(s: GameState): void {
  const c = s.combo
  if (c.count === 0) return
  if (s.enemies.some((e) => inCombo(e) && !e.dying)) {
    c.idle = 0
    return
  }
  c.idle++
  if (c.idle > COMBO.endDelay) {
    s.events.push({ type: 'comboEnd', count: c.count, rating: c.rating })
    c.count = 0
    c.damage = 0
    c.uses = []
    c.rating = 0
    c.repeat = 0
    c.lastMove = ''
    for (const e of s.enemies) if (!inCombo(e)) resetCombo(e)
  }
}

function updateCamera(s: GameState): void {
  const p = s.player
  const look = p.facing * 36
  const target = clamp(p.x + look - VIEW_W / 2, 0, s.level.width - VIEW_W)
  s.camera.x += (target - s.camera.x) * 0.12
}

/** 训练场用：在指定位置刷一个敌人。 */
export function spawn(s: GameState, kind: EnemyKind, x: number): void {
  spawnEnemy(s, kind, clamp(x, 20, s.level.width - 20))
}

/** 训练场的默认布置：木桩、两只灰狼、一个狼卫。 */
export function createTraining(seed = 7): GameState {
  const s = createGame({ seed, playerX: 160 })
  spawn(s, 'dummy', 260)
  spawn(s, 'wolf', 560)
  spawn(s, 'wolf', 640)
  spawn(s, 'guard', 780)
  return s
}

export { ENEMY_DEFS }
