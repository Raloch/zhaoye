import { COMBO, DEFENSE, RES, VIEW_W } from './config'
import {
  armored,
  attackDef,
  ENEMY_DEFS,
  type EnemyHitProps,
  enemyHurtbox,
  hittable,
  releaseToken,
  shieldUp,
} from './enemies'
import { overlapCenter, overlaps, type Rect, sign, toWorld } from './geom'
import { type HitDef, type HitProps, MOVES, type MoveDef } from './moves'
import { currentMove, isInvulnerable, PLAYER_HURTBOX } from './player'
import { nextRandom } from './rng'
import type { Enemy, GameState } from './state'

/**
 * 每帧一次：玩家招式、玩家飞行道具、敌人招式，各自和对方的受击框求交。
 */
export function resolveHits(s: GameState): void {
  playerMoveHits(s)
  projectileHits(s)
  enemyAttackHits(s)
}

export function playerHurtbox(s: GameState): Rect {
  const p = s.player
  return toWorld(PLAYER_HURTBOX, p.x, p.y, 1)
}

/** 当前帧处于判定期的玩家判定框。 */
export function activePlayerHits(s: GameState): HitDef[] {
  const p = s.player
  const m = currentMove(p)
  const mv = p.move
  if (!m || !mv) return []
  if (mv.phase === 'land')
    return (m.untilLand?.hits ?? []).filter((h) => mv.frame >= h.from && mv.frame < h.to)
  return m.hits.filter((h) => mv.frame >= h.from && mv.frame < h.to)
}

function playerMoveHits(s: GameState): void {
  const p = s.player
  const m = currentMove(p)
  const mv = p.move
  if (!m || !mv) return
  for (const h of activePlayerHits(s)) {
    const area = h.screen
      ? { x: s.camera.x, y: -200, w: VIEW_W, h: 600 }
      : toWorld(h.box, p.x, p.y, p.facing)
    for (const e of s.enemies) {
      if (mv.hits.some((r) => r.id === e.id && r.group === h.group)) continue
      if (!canBeHit(e, h.props)) continue
      const hb = enemyHurtbox(e)
      if (!overlaps(area, hb)) continue
      mv.hits.push({ id: e.id, group: h.group })
      const at = h.screen ? { x: e.x, y: hb.y + hb.h / 2 } : overlapCenter(area, hb)
      const dir = h.props.radial ? sign(e.x - p.x) || p.facing : p.facing
      const landed = hitEnemy(s, e, h.props, m, at, dir, mv.hits.length === 1)
      mv.contact = true
      if (landed && m.hover && mv.hovers < 3 && !p.onGround) {
        mv.hovers++
        p.vy = Math.min(p.vy, -1.1)
      }
    }
  }
}

function canBeHit(e: Enemy, props: HitProps): boolean {
  if (!hittable(e)) return false
  if (e.state === 'down') return !!props.otg && !e.usedOtg
  return true
}

const WAVE_PROPS: Record<'wave' | 'quakeWave', HitProps> = {
  wave: { dmg: 1.6, stun: 26, kb: 2.4, poise: 15, hitstop: 4 },
  quakeWave: { dmg: 1.0, stun: 24, kb: 1.5, launch: 4, otg: true, poise: 15, hitstop: 3 },
}

function projectileHits(s: GameState): void {
  for (const pr of s.projectiles) {
    const area: Rect =
      pr.kind === 'wave'
        ? { x: pr.x - 8, y: pr.y - 16, w: 16, h: 32 }
        : { x: pr.x - 10, y: pr.y - 10, w: 20, h: 20 }
    for (const e of s.enemies) {
      if (pr.hits.includes(e.id)) continue
      const props = WAVE_PROPS[pr.kind]
      if (!canBeHit(e, props)) continue
      const hb = enemyHurtbox(e)
      if (!overlaps(area, hb)) continue
      pr.hits.push(e.id)
      hitEnemy(
        s,
        e,
        props,
        MOVES[pr.kind === 'wave' ? 'wave' : 'quake'],
        overlapCenter(area, hb),
        sign(pr.vx) || 1,
        pr.hits.length === 1,
      )
    }
  }
}

/**
 * 玩家打中敌人。返回 true 表示真正打中（而不是被盾挡住）。
 */
function hitEnemy(
  s: GameState,
  e: Enemy,
  props: HitProps,
  move: MoveDef,
  at: { x: number; y: number },
  dir: number,
  firstOfInstance: boolean,
): boolean {
  const p = s.player

  // 狼卫举盾：正面挡住不破防的攻击
  const fromFront = sign(p.x - e.x) === e.facing
  if (shieldUp(e) && fromFront && !props.guardBreak && move.tag !== 'super') {
    e.vx = -e.facing * 1.8
    s.hitstop = Math.max(s.hitstop, 4)
    s.events.push({ type: 'block', x: at.x, y: at.y, by: 'enemy' })
    return false
  }
  if (shieldUp(e) && fromFront && props.guardBreak) {
    e.state = 'broken'
    e.stateFrame = 0
    e.stun = 40
    e.attack = null
    releaseToken(e)
    s.events.push({ type: 'guardBreak', x: at.x, y: at.y, id: e.id })
  }

  // 伤害
  const c = s.combo
  const scale = c.count >= 40 ? COMBO.scaleAt40 : c.count >= 20 ? COMBO.scaleAt20 : 1
  const crit = !!props.crit || nextRandom(s) < RES.critRate
  const broken = e.state === 'broken' || e.state === 'parried'
  const variance = 0.95 + nextRandom(s) * 0.1
  const dmg = Math.max(
    1,
    Math.round(
      p.atk *
        props.dmg *
        scale *
        (crit ? RES.critMul : 1) *
        (broken ? COMBO.brokenBonus : 1) *
        variance,
    ),
  )
  e.hp -= dmg
  if (e.kind === 'dummy') e.hp = Math.max(1, e.hp)
  e.sinceHit = 0
  e.poise = Math.max(0, e.poise - props.poise)

  // 连击
  registerComboHit(s, move, dmg, firstOfInstance)
  if (move.tag === 'normal' || move.tag === 'command') p.mp = Math.min(p.maxMp, p.mp + RES.mpOnHit)
  p.sword = Math.min(
    RES.swordMax,
    p.sword + (COMBO.ratingMul[c.rating] ?? 1) * (move.tag === 'super' ? 0 : 1),
  )

  s.hitstop = Math.max(s.hitstop, props.hitstop)
  s.events.push({
    type: 'hit',
    x: at.x,
    y: at.y,
    dmg,
    crit,
    heavy: !!props.heavy,
    shake: props.shake ?? 0,
    dir,
    target: 'enemy',
    id: e.id,
  })

  if (e.hp <= 0 && e.kind !== 'dummy') {
    e.dying = true
    releaseToken(e)
  }

  // 霸体：只掉血，不硬直
  if (armored(e) && !e.dying) return true

  applyReaction(e, props, dir)
  return true
}

function applyReaction(e: Enemy, props: HitProps, dir: number): void {
  e.attack = null
  releaseToken(e)
  if (props.wallBounce && !e.usedWallBounce) e.wallArmed = true

  const airborne = e.state === 'air' || !e.onGround
  if (e.state === 'down') {
    // 追地：弹回空中
    e.usedOtg = true
    launch(e, props.launch ?? 3.2, dir * props.kb * 0.5)
    return
  }
  if (airborne) {
    e.juggleHits++
    e.gravityScale += COMBO.juggleGravity
    if (e.juggleHits >= COMBO.juggleMax) e.techPending = true
    if (props.groundBounce && !e.usedGroundBounce) e.bouncePending = true
    if (props.slam) {
      e.vy = 4.8
    } else if (props.launch) {
      e.vy = -props.launch
    } else {
      e.vy = Math.min(e.vy, -(props.lift ?? 2.4))
    }
    e.vx = dir * props.kb * 0.6
    e.state = 'air'
    e.stateFrame = 0
    return
  }
  if (props.launch) {
    launch(e, props.launch, dir * props.kb * 0.5)
    e.juggleHits = 1
    return
  }
  if (props.down || e.dying) {
    launch(e, 2.4, dir * Math.max(props.kb, 1.5))
    return
  }
  e.state = e.state === 'broken' ? 'broken' : 'hurt'
  e.stateFrame = 0
  e.stun = Math.max(e.state === 'broken' ? e.stun : 0, props.stun)
  e.vx = dir * props.kb
}

function launch(e: Enemy, vy: number, vx: number): void {
  e.state = 'air'
  e.stateFrame = 0
  e.onGround = false
  e.vy = -vy
  e.vx = vx
}

// ───────────────────────── 敌人打玩家 ─────────────────────────

function enemyAttackHits(s: GameState): void {
  const p = s.player
  if (p.state === 'dead') return
  const hurt = playerHurtbox(s)
  for (const e of s.enemies) {
    const def = attackDef(e)
    const atk = e.attack
    if (!def || !atk || e.state !== 'attack') continue
    def.hits.forEach((h, i) => {
      if (atk.frame < h.from || atk.frame >= h.to) return
      if (atk.done & (1 << i)) return
      const area = toWorld(h.box, e.x, e.y, e.facing)
      if (!overlaps(area, hurt)) return
      atk.done |= 1 << i
      hitPlayer(s, e, h.props, overlapCenter(area, hurt))
    })
  }
}

function hitPlayer(
  s: GameState,
  e: Enemy,
  props: EnemyHitProps,
  at: { x: number; y: number },
): void {
  const p = s.player
  if (isInvulnerable(s)) {
    if (p.state === 'dash') s.events.push({ type: 'evade', x: p.x, y: p.y - 20 })
    return
  }
  const fromFront = sign(e.x - p.x) === p.facing
  const guarding = p.state === 'guard' || p.state === 'blockstun'
  if (guarding && fromFront && !props.unblockable) {
    if (s.frame - p.lastGuardPress <= DEFENSE.parry) {
      e.state = 'parried'
      e.stateFrame = 0
      e.stun = 30
      e.attack = null
      e.poise = Math.max(0, e.poise - 40)
      releaseToken(e)
      p.counterWindow = DEFENSE.counterWindow
      p.sword = Math.min(RES.swordMax, p.sword + RES.swordOnParry)
      p.mp = Math.min(p.maxMp, p.mp + RES.mpOnParry)
      s.hitstop = Math.max(s.hitstop, 8)
      s.events.push({ type: 'parry', x: at.x, y: at.y })
      return
    }
    p.state = 'blockstun'
    p.stateFrame = 0
    p.stun = DEFENSE.blockstun
    p.vx = -p.facing * DEFENSE.blockPush
    s.hitstop = Math.max(s.hitstop, 3)
    s.events.push({ type: 'block', x: at.x, y: at.y, by: 'player' })
    return
  }
  if (s.cheats.invincible) {
    s.events.push({ type: 'block', x: at.x, y: at.y, by: 'player' })
    return
  }
  const dir = sign(p.x - e.x) || -e.facing
  p.hp = Math.max(0, p.hp - props.dmg)
  p.sword = Math.min(RES.swordMax, p.sword + (props.dmg / p.maxHp) * 100 * RES.swordOnHurt)
  p.move = null
  p.buffer = null
  p.runDir = 0
  s.hitstop = Math.max(s.hitstop, props.hitstop)
  s.events.push({
    type: 'hit',
    x: at.x,
    y: at.y,
    dmg: props.dmg,
    crit: false,
    heavy: !!props.launch,
    shake: props.launch ? 3 : 1,
    dir,
    target: 'player',
    id: 0,
  })
  if (p.hp <= 0) {
    p.state = 'dead'
    p.stateFrame = 0
    p.vx = dir * 2
    s.events.push({ type: 'playerDown' })
    return
  }
  if (props.launch || !p.onGround) {
    p.state = 'launched'
    p.stateFrame = 0
    p.onGround = false
    p.vy = -(props.launch ?? 2.5)
    p.vx = dir * props.kb
    return
  }
  p.state = 'hurt'
  p.stateFrame = 0
  p.stun = props.stun || DEFENSE.hurtStun
  p.vx = dir * props.kb
}

// ───────────────────────── 连击评级 ─────────────────────────

function registerComboHit(
  s: GameState,
  move: MoveDef,
  dmg: number,
  firstOfInstance: boolean,
): void {
  const c = s.combo
  c.count++
  c.damage += dmg
  c.idle = 0
  c.best = Math.max(c.best, c.count)
  if (firstOfInstance) {
    // 同一招（同一个 id）连续使用才算重复；青锋一至四是四个不同的 id
    c.repeat = move.id === c.lastMove ? c.repeat + 1 : 1
    c.lastMove = move.id
    if (c.uses[c.uses.length - 1] !== move.family) c.uses.push(move.family)
  }
  c.rating = ratingOf(c.uses, c.count, c.repeat)
}

/** 用过的招式种类越多评级越高；同一招连续用满 3 次，算少一种。 */
export function ratingOf(uses: readonly string[], count: number, repeat = 0): number {
  const kinds = new Set(uses).size - (repeat >= 3 ? 1 : 0)
  if (kinds >= 5 && count >= 35) return 4
  if (kinds >= 4 && count >= 20) return 3
  if (kinds >= 3) return 2
  if (kinds >= 2) return 1
  return 0
}

export { ENEMY_DEFS }
