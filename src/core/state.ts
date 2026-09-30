import type { Command } from './command'
import { RES } from './config'
import type { Facing } from './geom'
import type { InputFrame } from './input'
import { type Level, TRAINING } from './level'
import type { MoveId, ProjectileKind } from './moves'

export type PlayerState =
  | 'free'
  | 'move'
  | 'charge'
  | 'guard'
  | 'blockstun'
  | 'dash'
  | 'hurt'
  | 'launched'
  | 'down'
  | 'getup'
  | 'dead'

export type HitRecord = { id: number; group: number }

export type MoveInstance = {
  id: MoveId
  frame: number
  /** 'fall' 只有坠星用：起手后持续下冲的阶段；'land' 是落地后的冲击与收招。 */
  phase: 'main' | 'fall' | 'land'
  /** 命中或被挡过：普攻在这之后才能取消成指令技、特技。 */
  contact: boolean
  hits: HitRecord[]
  hovers: number
}

export type Player = {
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
  halfW: number
  facing: Facing
  state: PlayerState
  stateFrame: number
  move: MoveInstance | null
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  sword: number
  atk: number
  jumpsLeft: number
  coyote: number
  jumpBuffer: number
  jumpCut: boolean
  airHovers: number
  runDir: -1 | 0 | 1
  runFrames: number
  dashDir: -1 | 1
  invuln: number
  dropThrough: number
  lastGuardPress: number
  counterWindow: number
  chargeFrames: number
  stun: number
  lightCd: number
  techUsed: boolean
  buffer: { cmd: Command; age: number } | null
}

export type EnemyKind = 'dummy' | 'wolf' | 'guard'

export type EnemyState =
  | 'spawn'
  | 'idle'
  | 'windup'
  | 'attack'
  | 'recover'
  | 'hurt'
  | 'air'
  | 'down'
  | 'getup'
  | 'parried'
  | 'broken'
  | 'dead'

export type Enemy = {
  id: number
  kind: EnemyKind
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
  halfW: number
  facing: Facing
  state: EnemyState
  stateFrame: number
  hp: number
  maxHp: number
  poise: number
  maxPoise: number
  sinceHit: number
  attack: { id: string; frame: number; done: number } | null
  stun: number
  gravityScale: number
  juggleHits: number
  bouncePending: boolean
  wallArmed: boolean
  usedGroundBounce: boolean
  usedWallBounce: boolean
  usedOtg: boolean
  techPending: boolean
  dying: boolean
  invuln: number
  hasToken: boolean
  cooldown: number
  aiSide: -1 | 1
  aiTimer: number
  turnTimer: number
}

export type Projectile = {
  id: number
  kind: ProjectileKind
  x: number
  y: number
  vx: number
  life: number
  hits: number[]
}

export type ComboState = {
  count: number
  damage: number
  /** 按顺序记录命中过的招式种类，用于评级。 */
  uses: string[]
  rating: number
  idle: number
  best: number
  lastMove: string
  repeat: number
}

export type GameEvent =
  | {
      type: 'hit'
      x: number
      y: number
      dmg: number
      crit: boolean
      heavy: boolean
      shake: number
      dir: number
      target: 'enemy' | 'player'
      id: number
    }
  | { type: 'block'; x: number; y: number; by: 'enemy' | 'player' }
  | { type: 'parry'; x: number; y: number }
  | { type: 'guardBreak'; x: number; y: number; id: number }
  | { type: 'swing'; move: MoveId; heavy: boolean }
  | { type: 'jump'; x: number; y: number; double: boolean }
  | { type: 'land'; x: number; y: number }
  | { type: 'dash'; x: number; y: number; dir: number }
  | { type: 'telegraph'; id: number; color: 'white' | 'red' }
  | { type: 'kill'; x: number; y: number; id: number }
  | { type: 'bounce'; x: number; y: number; wall: boolean }
  | { type: 'evade'; x: number; y: number }
  | { type: 'mpShort' }
  | { type: 'tech'; x: number; y: number }
  | { type: 'super'; phase: 'start' | 'final' }
  | { type: 'light'; x: number; y: number }
  | { type: 'comboEnd'; count: number; rating: number }
  | { type: 'playerDown' }

export type Cheats = { invincible: boolean; infiniteMp: boolean }

export type GameState = {
  frame: number
  rng: number
  hitstop: number
  level: Level
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  combo: ComboState
  history: InputFrame[]
  camera: { x: number }
  nextId: number
  events: GameEvent[]
  cheats: Cheats
  /** 奥义期间敌人全部定格。 */
  freeze: number
}

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    onGround: true,
    halfW: 7,
    facing: 1,
    state: 'free',
    stateFrame: 0,
    move: null,
    hp: RES.hp,
    maxHp: RES.hp,
    mp: RES.mp,
    maxMp: RES.mp,
    sword: 0,
    atk: RES.atk,
    jumpsLeft: 1,
    coyote: 0,
    jumpBuffer: 0,
    jumpCut: false,
    airHovers: 0,
    runDir: 0,
    runFrames: 0,
    dashDir: 1,
    invuln: 0,
    dropThrough: 0,
    lastGuardPress: -999,
    counterWindow: 0,
    chargeFrames: 0,
    stun: 0,
    lightCd: 0,
    techUsed: false,
    buffer: null,
  }
}

export type SpawnSpec = { kind: EnemyKind; x: number }

export type GameOptions = {
  seed?: number
  level?: Level
  playerX?: number
  enemies?: readonly SpawnSpec[]
}

export function createGame(o: GameOptions = {}): GameState {
  const level = o.level ?? TRAINING
  const s: GameState = {
    frame: 0,
    rng: o.seed ?? 1,
    hitstop: 0,
    level,
    player: createPlayer(o.playerX ?? 160, level.floorY),
    enemies: [],
    projectiles: [],
    combo: { count: 0, damage: 0, uses: [], rating: 0, idle: 0, best: 0, lastMove: '', repeat: 0 },
    history: [],
    camera: { x: 0 },
    nextId: 1,
    events: [],
    cheats: { invincible: false, infiniteMp: false },
    freeze: 0,
  }
  return s
}
