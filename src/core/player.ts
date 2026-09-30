import { type Command, doubleTapped } from './command'
import { DEFENSE, INPUT_WINDOW, PHYS, RES } from './config'
import { approach, sign } from './geom'
import { axisX, BTN, type InputFrame, isHeld, isPressed } from './input'
import { onPlatform } from './level'
import {
  type CancelTag,
  cancelWindow,
  MOVES,
  type MoveDef,
  type MoveId,
  totalFrames,
} from './moves'
import { stepBody } from './physics'
import type { GameState, Player } from './state'

/**
 * 叶昭的状态机。只处理「自己」：移动、出招、取消、受击后的恢复。
 * 判定框之间的碰撞在 combat.ts 里做。
 */

export const PLAYER_HURTBOX = { x: -7, y: -40, w: 14, h: 40 } as const

const SPECIAL_OF: Partial<Record<Command, MoveId>> = {
  pierce: 'pierce',
  wave: 'wave',
  rising: 'rising',
  gale: 'gale',
  quake: 'quake',
}

/** 灵力不够时的降级（docs/03-combat.md 第 4 节第 5 条）。 */
const FALLBACK: Partial<Record<Command, Command>> = {
  pierce: 'attack',
  wave: 'attack',
  rising: 'up',
  gale: 'attack',
  quake: 'down',
}

export function isInvulnerable(s: GameState): boolean {
  const p = s.player
  if (p.invuln > 0) return true
  if (p.state === 'dash') {
    const [a, b] = DEFENSE.dashInvuln
    return p.stateFrame >= a && p.stateFrame <= b
  }
  if (p.state === 'getup' || p.state === 'dead') return true
  if (p.state === 'move' && p.move) {
    const inv = MOVES[p.move.id].invuln
    if (inv && p.move.frame >= inv[0] && p.move.frame <= inv[1]) return true
  }
  return false
}

export function currentMove(p: Player): MoveDef | null {
  return p.state === 'move' && p.move ? MOVES[p.move.id] : null
}

function setState(p: Player, st: Player['state']): void {
  p.state = st
  p.stateFrame = 0
  if (st !== 'move') p.move = null
}

function spendMp(s: GameState, cost: number): boolean {
  if (s.cheats.infiniteMp) return true
  if (s.player.mp < cost) return false
  s.player.mp -= cost
  return true
}

export function startMove(s: GameState, id: MoveId): void {
  const p = s.player
  const m = MOVES[id]
  p.state = 'move'
  p.stateFrame = 0
  p.move = { id, frame: 0, phase: 'main', contact: false, hits: [], hovers: 0 }
  p.runDir = 0
  if (!m.air && p.onGround) p.vx = 0
  if (m.air) p.jumpCut = true
  if (id === 'light') {
    p.lightCd = RES.lightCooldown
    s.events.push({ type: 'light', x: p.x, y: p.y - 24 })
  }
  if (id === 'super') {
    s.freeze = totalFrames(m)
    s.events.push({ type: 'super', phase: 'start' })
  }
  if (id === 'light' || id === 'super') s.events.push({ type: 'swing', move: id, heavy: true })
}

/**
 * 挥剑声放在「刀真正挥出去」的那一帧：每个判定段开始时各一次（升龙斩三声、疾风连斩七声）。
 * 没有判定框的招式（剑气）在起手结束时响。
 */
function swingFrames(m: MoveDef): number[] {
  if (m.id === 'light' || m.id === 'super') return []
  const frames = m.hits.map((h) => h.from).filter((f) => f < 999)
  return frames.length > 0 ? [...new Set(frames)] : [m.startup]
}

/** 把「按了什么」翻译成「出哪一招」。返回 null 表示这一帧出不了招。 */
export function resolveCommand(s: GameState, cmd: Command): MoveId | null {
  const p = s.player
  const air = !p.onGround
  const cur = currentMove(p)

  if (p.counterWindow > 0 && !air && (cmd === 'attack' || cmd === 'up')) return 'counter'

  const special = SPECIAL_OF[cmd]
  if (special) {
    const def = MOVES[special]
    const usable = air ? def.air || def.anywhere : !def.air
    if (usable && (s.cheats.infiniteMp || p.mp >= def.mp)) return special
    if (usable) s.events.push({ type: 'mpShort' })
    const fb = FALLBACK[cmd]
    return fb ? resolveCommand(s, fb) : null
  }

  if (cmd === 'down') return air ? 'plunge' : 'sweep'
  if (cmd === 'up' && !air) return 'launcher'

  // 普攻：优先接当前这一段的下一段
  if (cur?.next && cur.air === air) return cur.next
  if (air) return 'a1'
  if (p.runDir !== 0 && p.runFrames >= INPUT_WINDOW.runSlash) return 'dashSlash'
  return 'n1'
}

/** 当前能不能取消成 target。free 状态下永远可以。 */
export function canStart(s: GameState, target: MoveId): boolean {
  const p = s.player
  const t = MOVES[target]
  if (p.state === 'free') {
    if (t.tag === 'counter') return p.counterWindow > 0
    if (target === 'n2' || target === 'n3' || target === 'n4' || target === 'a2' || target === 'a3')
      return false
    if (t.air && p.onGround) return false
    return true
  }
  if (p.state === 'guard' || p.state === 'blockstun')
    return t.tag === 'counter' && p.counterWindow > 0
  if (p.state === 'dash') return p.stateFrame >= DEFENSE.dashMoveFrames && !t.air
  if (p.state !== 'move' || !p.move) return false

  const m = MOVES[p.move.id]
  const f = p.move.frame
  if (p.move.phase !== 'main') return false
  const activeEnd = m.startup + m.active
  if (m.next === target) return f >= (p.move.contact ? m.startup + 1 : activeEnd)
  const tag = tagOf(t)
  if (!tag) return false
  const [w0, w1] = cancelWindow(m)
  if (f < w0 || f > w1) return false
  if (m.always?.includes(tag)) return true
  return p.move.contact && !!m.onHit?.includes(tag)
}

function tagOf(t: MoveDef): CancelTag | null {
  if (t.tag === 'command') return 'command'
  if (t.tag === 'special' || t.tag === 'utility') return 'special'
  if (t.tag === 'super') return 'super'
  return null
}

function tryConsumeBuffer(s: GameState): boolean {
  const p = s.player
  if (!p.buffer) return false
  const id = resolveCommand(s, p.buffer.cmd)
  if (!id) return false
  if (!canStart(s, id)) return false
  if (!spendMp(s, MOVES[id].mp)) {
    s.events.push({ type: 'mpShort' })
    return false
  }
  p.buffer = null
  if (p.counterWindow > 0 && id === 'counter') p.counterWindow = 0
  startMove(s, id)
  return true
}

function doJump(s: GameState, speed: number, double: boolean): void {
  const p = s.player
  p.vy = -speed
  p.onGround = false
  p.coyote = 0
  p.jumpBuffer = 0
  p.jumpCut = false
  p.airHovers = 0
  if (double) p.jumpsLeft--
  s.events.push({ type: 'jump', x: p.x, y: p.y, double })
}

function startDash(s: GameState, dir: -1 | 1): void {
  const p = s.player
  setState(p, 'dash')
  p.dashDir = dir
  p.runDir = 0
  s.events.push({ type: 'dash', x: p.x, y: p.y, dir })
}

/** L + 左右：按住 L 时按方向，或按住方向时按 L，都算。 */
function dashInput(input: InputFrame): -1 | 0 | 1 {
  const guardNow = isPressed(input, BTN.guard)
  const guardHeld = isHeld(input, BTN.guard)
  if (guardHeld && isPressed(input, BTN.left)) return -1
  if (guardHeld && isPressed(input, BTN.right)) return 1
  if (guardNow) return axisX(input)
  return 0
}

// ───────────────────────── 每帧更新 ─────────────────────────

export function updatePlayer(s: GameState, input: InputFrame): void {
  const p = s.player
  p.stateFrame++
  if (p.invuln > 0) p.invuln--
  if (p.dropThrough > 0) p.dropThrough--
  if (p.counterWindow > 0) p.counterWindow--
  if (p.lightCd > 0) p.lightCd--
  if (p.jumpBuffer > 0) p.jumpBuffer--
  if (p.coyote > 0) p.coyote--
  if (p.buffer) {
    p.buffer.age++
    if (p.buffer.age > INPUT_WINDOW.buffer) p.buffer = null
  }
  p.chargeFrames = isHeld(input, BTN.attack) ? p.chargeFrames + 1 : 0
  if (p.state !== 'dead' && p.state !== 'move' && !s.cheats.infiniteMp)
    p.mp = Math.min(p.maxMp, p.mp + RES.mpRegen)
  if (s.cheats.infiniteMp) p.mp = p.maxMp

  const dir = axisX(input)
  updateRun(s, dir)

  let gravity: number = PHYS.gravity
  let noGravity = false

  switch (p.state) {
    case 'free':
      freeState(s, input, dir)
      break
    case 'move': {
      const r = moveState(s, input)
      gravity = r.gravity
      noGravity = r.noGravity
      break
    }
    case 'charge':
      p.vx = approach(p.vx, 0, PHYS.groundDecel)
      if (!isHeld(input, BTN.attack)) {
        if (p.stateFrame + INPUT_WINDOW.chargeStart >= INPUT_WINDOW.chargeRelease)
          startMove(s, 'charge')
        else setState(p, 'free')
      }
      break
    case 'guard':
      p.vx = approach(p.vx, 0, PHYS.groundDecel)
      {
        const d = dashInput(input)
        if (d !== 0) startDash(s, d)
        else if (!isHeld(input, BTN.guard) && p.stateFrame > 2) setState(p, 'free')
        else if (p.buffer?.cmd && p.counterWindow > 0) tryConsumeBuffer(s)
      }
      break
    case 'blockstun':
      p.vx = approach(p.vx, 0, 0.25)
      p.stun--
      if (p.counterWindow > 0 && p.buffer) tryConsumeBuffer(s)
      else if (p.stun <= 0) setState(p, isHeld(input, BTN.guard) ? 'guard' : 'free')
      break
    case 'dash':
      dashState(s)
      break
    case 'hurt':
      p.vx = approach(p.vx, 0, 0.3)
      p.stun--
      if (p.stun <= 0) setState(p, 'free')
      break
    case 'launched':
      if (isPressed(input, BTN.jump) && !p.techUsed && p.stateFrame > 6) {
        p.techUsed = true
        setState(p, 'free')
        p.invuln = DEFENSE.techInvuln
        p.vy = Math.min(p.vy, -2)
        s.events.push({ type: 'tech', x: p.x, y: p.y })
      }
      break
    case 'down':
      p.vx = approach(p.vx, 0, 0.4)
      if (p.stateFrame >= DEFENSE.downFrames) setState(p, 'getup')
      break
    case 'getup':
      if (p.stateFrame >= DEFENSE.getupFrames) {
        setState(p, 'free')
        p.invuln = DEFENSE.getupInvuln - DEFENSE.getupFrames
      }
      break
    case 'dead':
      p.vx = approach(p.vx, 0, 0.3)
      if (p.stateFrame >= RES.respawn) respawn(s)
      break
  }

  const wasGround = p.onGround
  const res = stepBody(p, s.level, { gravity, noGravity, dropThrough: p.dropThrough > 0 })
  if (res.leftGround && p.state === 'free') p.coyote = PHYS.coyote
  if (res.landed) onLand(s, wasGround)
}

function updateRun(s: GameState, dir: -1 | 0 | 1): void {
  const p = s.player
  if (p.runDir !== 0 && dir !== p.runDir) p.runDir = 0
  if (p.onGround && p.state === 'free') {
    if (doubleTapped(s.history, BTN.right)) p.runDir = 1
    else if (doubleTapped(s.history, BTN.left)) p.runDir = -1
  }
  p.runFrames = p.runDir !== 0 ? p.runFrames + 1 : 0
}

function freeState(s: GameState, input: InputFrame, dir: -1 | 0 | 1): void {
  const p = s.player

  if (p.onGround) {
    const d = dashInput(input)
    if (d !== 0) {
      startDash(s, d)
      return
    }
    if (isHeld(input, BTN.guard)) {
      setState(p, 'guard')
      p.runDir = 0
      return
    }
  }

  if (isPressed(input, BTN.super) && p.sword >= RES.swordMax) {
    p.sword = 0
    startMove(s, 'super')
    return
  }
  if (isPressed(input, BTN.light) && p.lightCd <= 0 && spendMp(s, MOVES.light.mp)) {
    startMove(s, 'light')
    return
  }
  if (tryConsumeBuffer(s)) return

  if (p.onGround && p.chargeFrames >= INPUT_WINDOW.chargeStart && isHeld(input, BTN.attack)) {
    setState(p, 'charge')
    p.stateFrame = p.chargeFrames - INPUT_WINDOW.chargeStart
    return
  }

  if (dir !== 0) p.facing = dir
  const speed = p.runDir !== 0 ? PHYS.run : PHYS.walk
  if (p.onGround) {
    p.vx = approach(p.vx, dir * speed, dir !== 0 ? PHYS.groundAccel : PHYS.groundDecel)
  } else {
    p.vx = approach(p.vx, dir * speed * PHYS.airControl, PHYS.airAccel)
  }

  if (p.jumpBuffer > 0) {
    if (p.onGround && isHeld(input, BTN.down) && onPlatform(s.level, p.x, p.y)) {
      p.dropThrough = PHYS.dropThrough
      p.jumpBuffer = 0
      p.onGround = false
      p.vy = 0.5
    } else if (p.onGround || p.coyote > 0) {
      doJump(s, PHYS.jump, false)
    } else if (isPressed(input, BTN.jump) && p.jumpsLeft > 0) {
      doJump(s, PHYS.doubleJump, true)
    }
  }
  if (!p.onGround && p.vy < 0 && !p.jumpCut && !isHeld(input, BTN.jump)) {
    p.vy *= PHYS.jumpCut
    p.jumpCut = true
  }
}

function moveState(s: GameState, input: InputFrame): { gravity: number; noGravity: boolean } {
  const p = s.player
  const mv = p.move
  if (!mv) {
    setState(p, 'free')
    return { gravity: PHYS.gravity, noGravity: false }
  }
  const m = MOVES[mv.id]
  const f = mv.frame
  let gravity = PHYS.gravity * (m.gravity ?? 1)
  let noGravity = m.gravity === 0

  if (mv.phase === 'main') {
    for (const k of m.motion ?? []) {
      if (f >= k.from && f < k.to) {
        if (k.vx !== undefined) p.vx = k.vx * p.facing
        if (k.vy !== undefined && (!k.impulse || f === k.from)) {
          p.vy = k.vy
          if (k.vy < 0) p.onGround = false
        }
      }
    }
    if (!m.motion?.some((k) => k.vx !== undefined && f >= k.from && f < k.to) && p.onGround) {
      p.vx = approach(p.vx, 0, PHYS.groundDecel)
    }
    for (const sp of m.spawns ?? [])
      if (sp.frame === f) spawnProjectile(s, sp.kind, sp.dx, sp.dy, sp.vx, sp.both)
    if (m.id === 'super' && f === 84) s.events.push({ type: 'super', phase: 'final' })
    if (swingFrames(m).includes(f)) s.events.push({ type: 'swing', move: m.id, heavy: !!m.heavy })
    if (m.untilLand && f >= m.startup) {
      mv.phase = 'fall'
      mv.frame = m.startup
    }
  }

  if (mv.phase === 'fall' && m.untilLand) {
    p.vy = m.untilLand.fall
    p.vx = 0
    noGravity = true
  }

  // ── 取消 ──
  const inRecovery = mv.phase === 'main' && f >= m.startup + m.active
  if (
    mv.contact &&
    m.onHit?.includes('jump') &&
    p.jumpBuffer > 0 &&
    mv.phase === 'main' &&
    f >= m.startup
  ) {
    p.state = 'free'
    p.move = null
    if (p.onGround) doJump(s, PHYS.jumpCancel, false)
    else {
      p.jumpsLeft = Math.max(p.jumpsLeft, 1)
      doJump(s, PHYS.doubleJump, true)
    }
    return { gravity: PHYS.gravity, noGravity: false }
  }
  const d = dashInput(input)
  if (d !== 0 && p.onGround && mv.phase === 'main') {
    const always = m.always?.includes('dash') ?? false
    const onHit = mv.contact && (m.onHit?.includes('dash') ?? false)
    if ((always || onHit) && inRecovery && spendMp(s, DEFENSE.dashCancelMp)) {
      startDash(s, d)
      return { gravity, noGravity }
    }
  }
  if (isPressed(input, BTN.super) && p.sword >= RES.swordMax && mv.contact && m.tag !== 'super') {
    p.sword = 0
    startMove(s, 'super')
    return { gravity, noGravity }
  }
  if (tryConsumeBuffer(s)) return { gravity: PHYS.gravity, noGravity: false }

  mv.frame++
  if (mv.phase === 'land' && m.untilLand) {
    if (mv.frame >= m.untilLand.active + m.untilLand.recovery) setState(p, 'free')
  } else if (mv.phase === 'main' && mv.frame >= totalFrames(m)) {
    setState(p, 'free')
    if (!p.onGround) p.jumpCut = true
  }
  if (m.id === 'super') gravity = 0
  return { gravity, noGravity: noGravity || m.id === 'super' }
}

function dashState(s: GameState): void {
  const p = s.player
  const f = p.stateFrame
  if (f < DEFENSE.dashMoveFrames) p.vx = p.dashDir * DEFENSE.dashSpeed
  else p.vx = approach(p.vx, 0, 0.6)
  if (f >= DEFENSE.dashMoveFrames && tryConsumeBuffer(s)) return
  if (f >= DEFENSE.dashFrames) setState(p, 'free')
}

function onLand(s: GameState, wasGround: boolean): void {
  const p = s.player
  p.jumpsLeft = 1
  p.airHovers = 0
  p.techUsed = false
  if (!wasGround) s.events.push({ type: 'land', x: p.x, y: p.y })
  if (p.state === 'launched') {
    setState(p, 'down')
    return
  }
  const mv = p.move
  if (p.state === 'move' && mv) {
    const m = MOVES[mv.id]
    if (m.untilLand && mv.phase === 'fall') {
      mv.phase = 'land'
      mv.frame = 0
      mv.hits = mv.hits.filter((h) => h.group !== 1)
      p.vx = 0
      return
    }
    // 空中普攻落地直接收招
    if (m.air || m.id === 'rising' || m.id === 'wave') {
      if (m.id !== 'wave' || mv.frame > m.startup) setState(p, 'free')
    }
  }
}

function respawn(s: GameState): void {
  const p = s.player
  p.hp = p.maxHp
  p.mp = p.maxMp
  p.sword = 0
  setState(p, 'free')
  p.invuln = 90
}

export function spawnProjectile(
  s: GameState,
  kind: 'wave' | 'quakeWave',
  dx: number,
  dy: number,
  vx: number,
  both = false,
): void {
  const p = s.player
  const dirs: (-1 | 1)[] = both ? [1, -1] : [p.facing]
  for (const d of dirs) {
    s.projectiles.push({
      id: s.nextId++,
      kind,
      x: p.x + dx * d,
      y: p.y + dy,
      vx: vx * d,
      life: kind === 'wave' ? 40 : 24,
      hits: [],
    })
  }
}

/**
 * 跳跃、格挡的「按下」要在顿帧期间也记下来，否则上挑命中后的顿帧里按 K 会被吞掉。
 * 攻击键走 bufferCommand，这里只管另外两个。
 */
export function latchInput(s: GameState, input: InputFrame): void {
  const p = s.player
  if (isPressed(input, BTN.jump)) p.jumpBuffer = PHYS.jumpBuffer + 1
  if (isPressed(input, BTN.guard)) p.lastGuardPress = s.frame
}

/** 攻击键那一帧的指令进缓冲。受击、倒地时不收。 */
export function bufferCommand(s: GameState, cmd: Command | null): void {
  if (!cmd) return
  const st = s.player.state
  if (st === 'hurt' || st === 'launched' || st === 'down' || st === 'dead' || st === 'getup') return
  s.player.buffer = { cmd, age: 0 }
}

export { sign }
