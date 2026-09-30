/**
 * 关卡几何。M1 只有训练场：一块地面、左右两堵墙、三块单向平台。
 * 第 1 章的 ASCII 灰盒（concept/js/levels.js）在 M2 接进来。
 */

export type Platform = { readonly x0: number; readonly x1: number; readonly y: number }

export type Level = {
  readonly name: string
  readonly width: number
  /** 地面表面的 y。 */
  readonly floorY: number
  readonly platforms: readonly Platform[]
}

export const TRAINING: Level = {
  name: '训练场',
  width: 960,
  floorY: 230,
  platforms: [
    { x0: 96, x1: 196, y: 186 },
    { x0: 420, x1: 540, y: 158 },
    { x0: 764, x1: 864, y: 186 },
  ],
}

/** 脚下是否有支撑：地面，或者站在某块单向平台上。 */
export function supportAt(level: Level, x: number, y: number): number | null {
  if (Math.abs(y - level.floorY) < 0.01) return level.floorY
  for (const p of level.platforms) {
    if (Math.abs(y - p.y) < 0.01 && x >= p.x0 && x <= p.x1) return p.y
  }
  return null
}

export function onPlatform(level: Level, x: number, y: number): boolean {
  return level.platforms.some((p) => Math.abs(y - p.y) < 0.01 && x >= p.x0 && x <= p.x1)
}
