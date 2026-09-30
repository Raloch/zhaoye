import { ENEMY } from './config'
import { type Box, box, sign } from './geom'
import { stepBody } from './physics'
import { nextRandom, randomInt } from './rng'
import type { Enemy, EnemyKind, GameState } from './state'

/**
 * 敌人：数值、招式、AI。M1 只有木桩、灰狼妖、狼卫三种（docs/04-enemies.md 第 1～3 号）。
 */

export type EnemyHitProps = {
  /** 敌人的伤害是绝对值。 */
  readonly dmg: number
  readonly stun: number
  readonly kb: number
  readonly launch?: number
  readonly unblockable?: boolean
  readonly hitstop: number
}

export type EnemyAttackDef = {
  readonly id: string
  readonly windup: number
  readonly telegraph: 'white' | 'red'
  readonly active: number
  readonly recovery: number
  readonly hits: readonly { from: number; to: number; box: Box; props: EnemyHitProps }[]
  readonly motion?: readonly {
    from: number
    to: number
    vx?: number
    vy?: number
    impulse?: boolean
  }[]
  /** 起手和判定期间有霸体（韧性 > 0 时不会被打断）。 */
  readonly armor?: boolean
  /** 判定期间一落地就进入收招（灰狼扑咬）。 */
  readonly endOnLand?: boolean
}

export type EnemyDef = {
  readonly name: string
  readonly hp: number
  readonly halfW: number
  readonly height: number
  readonly poise: number
  readonly walk: number
  readonly shield: boolean
  readonly attacks: Readonly<Record<string, EnemyAttackDef>>
}

const wolfAttacks: Record<string, EnemyAttackDef> = {
  pounce: {
    id: 'pounce',
    windup: 18,
    telegraph: 'white',
    active: 20,
    recovery: 30,
    hits: [
      {
        from: 18,
        to: 38,
        box: box(2, -20, 24, 18),
        props: { dmg: 8, stun: 18, kb: 3, hitstop: 4 },
      },
    ],
    motion: [
      { from: 18, to: 19, vx: 4.4, vy: -2.8, impulse: true },
      { from: 19, to: 38, vx: 4.4 },
    ],
    endOnLand: true,
  },
  bite: {
    id: 'bite',
    windup: 12,
    telegraph: 'white',
    active: 11,
    recovery: 20,
    hits: [
      {
        from: 12,
        to: 15,
        box: box(8, -22, 18, 14),
        props: { dmg: 5, stun: 14, kb: 1.5, hitstop: 3 },
      },
      {
        from: 20,
        to: 23,
        box: box(8, -22, 18, 14),
        props: { dmg: 5, stun: 14, kb: 2, hitstop: 3 },
      },
    ],
  },
}

const guardAttacks: Record<string, EnemyAttackDef> = {
  slash: {
    id: 'slash',
    windup: 16,
    telegraph: 'white',
    active: 4,
    recovery: 22,
    armor: true,
    hits: [
      {
        from: 16,
        to: 20,
        box: box(6, -46, 30, 42),
        props: { dmg: 12, stun: 20, kb: 3, hitstop: 5 },
      },
    ],
    motion: [{ from: 14, to: 20, vx: 1.2 }],
  },
  bash: {
    id: 'bash',
    windup: 10,
    telegraph: 'white',
    active: 4,
    recovery: 18,
    hits: [
      {
        from: 10,
        to: 14,
        box: box(6, -38, 18, 32),
        props: { dmg: 6, stun: 16, kb: 4.5, hitstop: 4 },
      },
    ],
    motion: [{ from: 10, to: 14, vx: 2 }],
  },
  cleave: {
    id: 'cleave',
    windup: 30,
    telegraph: 'red',
    active: 5,
    recovery: 30,
    armor: true,
    hits: [
      {
        from: 30,
        to: 35,
        box: box(4, -52, 40, 52),
        props: { dmg: 16, stun: 30, kb: 3.5, launch: 4, unblockable: true, hitstop: 7 },
      },
    ],
    motion: [{ from: 28, to: 34, vx: 1.6 }],
  },
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  dummy: {
    name: '木桩',
    hp: 400,
    halfW: 8,
    height: 44,
    poise: 0,
    walk: 0,
    shield: false,
    attacks: {},
  },
  wolf: {
    name: '灰狼妖',
    hp: 50,
    halfW: 15,
    height: 20,
    poise: 0,
    walk: 1.7,
    shield: false,
    attacks: wolfAttacks,
  },
  guard: {
    name: '狼卫',
    hp: 90,
    halfW: 9,
    height: 46,
    poise: 30,
    walk: 0.8,
    shield: true,
    attacks: guardAttacks,
  },
}

export function spawnEnemy(s: GameState, kind: EnemyKind, x: number): Enemy {
  const d = ENEMY_DEFS[kind]
  const e: Enemy = {
    id: s.nextId++,
    kind,
    x,
    y: s.level.floorY,
    vx: 0,
    vy: 0,
    onGround: true,
    halfW: d.halfW,
    facing: x > s.player.x ? -1 : 1,
    state: 'spawn',
    stateFrame: 0,
    hp: d.hp,
    maxHp: d.hp,
    poise: d.poise,
    maxPoise: d.poise,
    sinceHit: 999,
    attack: null,
    stun: 0,
    gravityScale: 1,
    juggleHits: 0,
    bouncePending: false,
    wallArmed: false,
    usedGroundBounce: false,
    usedWallBounce: false,
    usedOtg: false,
    techPending: false,
    dying: false,
    invuln: 0,
    hasToken: false,
    cooldown: 40 + randomInt(s, 0, 60),
    aiSide: x > s.player.x ? 1 : -1,
    aiTimer: randomInt(s, 120, 240),
    turnTimer: 0,
  }
  s.enemies.push(e)
  return e
}

/** 受击框：脚底中心往上 height。 */
export function enemyHurtbox(e: Enemy): { x: number; y: number; w: number; h: number } {
  const h = e.state === 'down' ? 10 : ENEMY_DEFS[e.kind].height
  return { x: e.x - e.halfW, y: e.y - h, w: e.halfW * 2, h }
}

export function shieldUp(e: Enemy): boolean {
  return ENEMY_DEFS[e.kind].shield && (e.state === 'idle' || e.state === 'recover')
}

/** 处于「被连」的状态：计入连击，不会主动行动。 */
export function inCombo(e: Enemy): boolean {
  return (
    e.state === 'hurt' ||
    e.state === 'air' ||
    e.state === 'down' ||
    e.state === 'parried' ||
    e.state === 'broken'
  )
}

export function hittable(e: Enemy): boolean {
  if (e.state === 'dead' || e.state === 'spawn' || e.state === 'getup') return false
  return e.invuln <= 0
}

// ───────────────────────── 攻击令牌 ─────────────────────────

function requestToken(s: GameState, e: Enemy): boolean {
  if (e.hasToken) return true
  const held = s.enemies.filter((o) => o.hasToken).length
  if (held >= ENEMY.maxTokens) return false
  e.hasToken = true
  return true
}

export function releaseToken(e: Enemy): void {
  e.hasToken = false
}

// ───────────────────────── 出招 ─────────────────────────

function startAttack(s: GameState, e: Enemy, id: string): void {
  const def = ENEMY_DEFS[e.kind].attacks[id]
  if (!def) return
  e.attack = { id, frame: 0, done: 0 }
  e.state = 'windup'
  e.stateFrame = 0
  e.vx = 0
  s.events.push({ type: 'telegraph', id: e.id, color: def.telegraph })
}

export function attackDef(e: Enemy): EnemyAttackDef | null {
  if (!e.attack) return null
  return ENEMY_DEFS[e.kind].attacks[e.attack.id] ?? null
}

/** 招式有霸体且韧性未破时，受击不打断。 */
export function armored(e: Enemy): boolean {
  const def = attackDef(e)
  return !!def?.armor && (e.state === 'windup' || e.state === 'attack') && e.poise > 0
}

function advanceAttack(s: GameState, e: Enemy): void {
  const def = attackDef(e)
  const atk = e.attack
  if (!def || !atk) {
    e.state = 'idle'
    return
  }
  const f = atk.frame
  for (const m of def.motion ?? []) {
    if (f >= m.from && f < m.to) {
      if (m.vx !== undefined) e.vx = m.vx * e.facing
      if (m.vy !== undefined && (!m.impulse || f === m.from)) {
        e.vy = m.vy
        if (m.vy < 0) e.onGround = false
      }
    }
  }
  const activeEnd = def.windup + def.active
  if (f < def.windup) e.state = 'windup'
  else if (f < activeEnd) e.state = 'attack'
  else e.state = 'recover'
  if (def.endOnLand && e.state === 'attack' && f > def.windup + 2 && e.onGround)
    atk.frame = activeEnd - 1
  atk.frame++
  if (atk.frame >= activeEnd + def.recovery) {
    e.attack = null
    e.state = 'idle'
    e.stateFrame = 0
    releaseToken(e)
    e.cooldown = randomInt(s, 40, 100)
  }
}

// ───────────────────────── AI ─────────────────────────

function faceToward(e: Enemy, x: number): void {
  const d = sign(x - e.x)
  if (d !== 0) e.facing = d
}

function wolfAi(s: GameState, e: Enemy): void {
  const p = s.player
  const dx = p.x - e.x
  const adx = Math.abs(dx)
  const def = ENEMY_DEFS.wolf
  faceToward(e, p.x)
  if (p.state === 'dead') {
    e.vx = 0
    return
  }
  if (e.cooldown <= 0 && adx < 130) requestToken(s, e)
  if (e.hasToken) {
    if (adx < 30) startAttack(s, e, 'bite')
    else if (adx < 92) startAttack(s, e, 'pounce')
    else e.vx = sign(dx) * def.walk * 1.3
    return
  }
  // 没拿到令牌：在外圈游走，时不时绕到玩家背后
  e.aiTimer--
  if (e.aiTimer <= 0) {
    e.aiTimer = randomInt(s, 150, 280)
    e.aiSide = nextRandom(s) < 0.4 ? (p.facing === 1 ? -1 : 1) : e.x > p.x ? 1 : -1
  }
  const ring = 66 + (e.id % 3) * 14
  const target = p.x + e.aiSide * ring
  const diff = target - e.x
  e.vx = Math.abs(diff) > 6 ? sign(diff) * def.walk : 0
}

function guardAi(s: GameState, e: Enemy): void {
  const p = s.player
  const dx = p.x - e.x
  const adx = Math.abs(dx)
  const def = ENEMY_DEFS.guard
  // 狼卫转身慢：玩家绕到背后后要过 18 帧才转过来，这是给绕背的窗口
  if (sign(dx) !== 0 && sign(dx) !== e.facing) {
    e.turnTimer++
    if (e.turnTimer > 18) {
      e.facing = sign(dx) === 1 ? 1 : -1
      e.turnTimer = 0
    }
  } else e.turnTimer = 0
  if (p.state === 'dead') {
    e.vx = 0
    return
  }
  const facingPlayer = sign(dx) === e.facing
  if (e.cooldown <= 0 && adx < 70 && facingPlayer) requestToken(s, e)
  if (e.hasToken && facingPlayer) {
    if (adx < 22) startAttack(s, e, 'bash')
    else if (adx < 44) startAttack(s, e, nextRandom(s) < 0.28 ? 'cleave' : 'slash')
    else e.vx = sign(dx) * def.walk
    return
  }
  e.vx = adx > 52 && facingPlayer ? sign(dx) * def.walk : 0
}

// ───────────────────────── 每帧更新 ─────────────────────────

export function updateEnemy(s: GameState, e: Enemy): void {
  e.stateFrame++
  e.sinceHit++
  if (e.invuln > 0) e.invuln--
  if (e.cooldown > 0) e.cooldown--
  const def = ENEMY_DEFS[e.kind]

  if (e.sinceHit > ENEMY.poiseRegenDelay && e.poise < e.maxPoise)
    e.poise = Math.min(e.maxPoise, e.poise + 1)
  if (e.kind === 'dummy' && e.sinceHit > 120 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + 8)

  switch (e.state) {
    case 'spawn':
      if (e.stateFrame >= 24) setState(e, 'idle')
      break
    case 'idle':
      if (e.kind === 'wolf') wolfAi(s, e)
      else if (e.kind === 'guard') guardAi(s, e)
      else e.vx = 0
      break
    case 'windup':
    case 'attack':
    case 'recover':
      advanceAttack(s, e)
      break
    case 'hurt':
    case 'parried':
    case 'broken':
      e.stun--
      if (e.stun <= 0) setState(e, 'idle')
      break
    case 'down':
      if (e.dying) {
        setState(e, 'dead')
        s.events.push({ type: 'kill', x: e.x, y: e.y, id: e.id })
      } else if (e.stateFrame >= ENEMY.downFrames) setState(e, 'getup')
      break
    case 'getup':
      if (e.stateFrame >= ENEMY.getupFrames) {
        setState(e, 'idle')
        resetCombo(e)
      }
      break
    case 'dead':
      break
    case 'air':
      break
  }

  const grounded = e.onGround
  const inAir = e.state === 'air'
  const res = stepBody(e, s.level, { gravity: 0.28 * (inAir ? e.gravityScale : 1) })

  if (grounded && e.state !== 'windup' && e.state !== 'attack' && e.state !== 'idle') e.vx *= 0.82
  if (e.state === 'idle' && def.walk === 0) e.vx *= 0.7

  if (res.hitWall !== 0 && e.wallArmed && Math.abs(e.vx) >= ENEMY.wallBounceMin) {
    e.wallArmed = false
    e.usedWallBounce = true
    e.vx = -e.vx * 0.55
    e.vy = -3.4
    e.onGround = false
    e.state = 'air'
    s.events.push({ type: 'bounce', x: e.x, y: e.y - 16, wall: true })
  }

  if (e.state === 'air' && e.onGround) onAirLand(s, e)
  if (e.state === 'dead' && e.stateFrame >= ENEMY.deadFrames) e.hp = -999
}

function onAirLand(s: GameState, e: Enemy): void {
  if (e.bouncePending && !e.usedGroundBounce) {
    e.bouncePending = false
    e.usedGroundBounce = true
    e.vy = -ENEMY.groundBounce
    e.onGround = false
    s.events.push({ type: 'bounce', x: e.x, y: e.y, wall: false })
    return
  }
  if (e.techPending && !e.dying) {
    setState(e, 'idle')
    e.invuln = ENEMY.techInvuln
    resetCombo(e)
    s.events.push({ type: 'tech', x: e.x, y: e.y })
    return
  }
  e.vx *= 0.4
  setState(e, 'down')
  s.events.push({ type: 'land', x: e.x, y: e.y })
}

function setState(e: Enemy, st: Enemy['state']): void {
  e.state = st
  e.stateFrame = 0
}

/** 一段连击结束：弹地、墙弹、追地的次数和浮空重力修正都复位。 */
export function resetCombo(e: Enemy): void {
  e.gravityScale = 1
  e.juggleHits = 0
  e.bouncePending = false
  e.wallArmed = false
  e.usedGroundBounce = false
  e.usedWallBounce = false
  e.usedOtg = false
  e.techPending = false
}

export function removeDead(s: GameState): void {
  s.enemies = s.enemies.filter((e) => e.hp > -999)
}
