/**
 * mulberry32，和 adder 同一个算法，但状态存在 GameState 里而不是闭包里：
 * 这样存快照（F9）、回退、回放时随机序列也跟着还原，不会错位。
 */
export type RngHolder = { rng: number }

/** 取一个 [0, 1) 的随机数，并推进 holder 里的状态。 */
export function nextRandom(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0
  let t = Math.imul(h.rng ^ (h.rng >>> 15), 1 | h.rng)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** [lo, hi) 的整数。 */
export function randomInt(h: RngHolder, lo: number, hi: number): number {
  return lo + Math.floor(nextRandom(h) * (hi - lo))
}

/** 闭包版 mulberry32，给不存进 GameState 的地方用（比如背景生成）。 */
export function mulberry32(seed: number): () => number {
  const h: RngHolder = { rng: seed | 0 }
  return () => nextRandom(h)
}
