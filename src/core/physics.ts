import { PHYS } from './config'
import { clamp } from './geom'
import { type Level, supportAt } from './level'

/** 玩家和敌人共用的物理体。x 是脚底中心，y 是脚底。 */
export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
  /** 身体半宽，用于撞墙。 */
  halfW: number
}

export type StepResult = {
  landed: boolean
  hitWall: -1 | 0 | 1
  leftGround: boolean
}

export type StepOptions = {
  gravity?: number
  maxFall?: number
  /** 大于 0 时忽略单向平台（S+K 下平台）。 */
  dropThrough?: boolean
  /** 不受重力（例如坠星下冲、奥义中）。 */
  noGravity?: boolean
}

/**
 * 轴分离积分：先水平、再竖直。单向平台只在下落且上一帧脚底在平台之上时才接住。
 */
export function stepBody(b: Body, level: Level, o: StepOptions = {}): StepResult {
  const res: StepResult = { landed: false, hitWall: 0, leftGround: false }
  if (!b.onGround && !o.noGravity) {
    b.vy = Math.min(b.vy + (o.gravity ?? PHYS.gravity), o.maxFall ?? PHYS.maxFall)
  }

  b.x += b.vx
  const minX = b.halfW
  const maxX = level.width - b.halfW
  if (b.x < minX) {
    b.x = minX
    res.hitWall = -1
  } else if (b.x > maxX) {
    b.x = maxX
    res.hitWall = 1
  }

  if (b.onGround && b.vy >= 0) {
    // 走出平台边缘就开始下落
    if (supportAt(level, b.x, b.y) === null || (o.dropThrough && b.y !== level.floorY)) {
      b.onGround = false
      res.leftGround = true
    } else {
      b.vy = 0
      return res
    }
  }

  if (b.vy < 0) b.onGround = false
  const prevY = b.y
  b.y += b.vy
  if (b.vy >= 0) {
    let landY: number | null = null
    if (b.y >= level.floorY) landY = level.floorY
    if (!o.dropThrough) {
      for (const p of level.platforms) {
        if (prevY <= p.y && b.y >= p.y && b.x >= p.x0 && b.x <= p.x1) {
          landY = landY === null ? p.y : Math.min(landY, p.y)
        }
      }
    }
    if (landY !== null) {
      b.y = landY
      b.vy = 0
      if (!b.onGround) res.landed = true
      b.onGround = true
    }
  }
  b.y = clamp(b.y, -400, level.floorY)
  return res
}
