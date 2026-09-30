import type { Pt } from './math'

/**
 * 软链：发带、马尾、腰带尾。Verlet 积分 + 长度约束，在世界坐标里模拟，
 * 所以角色一跑、一跳、一个急转，它们就自然甩起来。只在渲染层计算，不影响战斗逻辑。
 */
export class SoftChain {
  private pts: { x: number; y: number; px: number; py: number }[] = []
  private inited = false

  constructor(
    private readonly segs: number,
    private readonly segLen: number,
    private readonly gravity = 0.16,
    private readonly drag = 0.86,
    /** 拉回垂落方向的力度：越大越「硬」，发带要软一点，马尾要硬一点。 */
    private readonly stiffness = 0.02,
  ) {}

  /** 每个逻辑帧调用一次。anchor 是根部的世界坐标，rest 是「没有风时想要垂的方向」。 */
  step(anchor: Pt, rest: Pt, wind: Pt): void {
    if (!this.inited) {
      this.pts = Array.from({ length: this.segs + 1 }, (_, i) => {
        const x = anchor.x + rest.x * this.segLen * i
        const y = anchor.y + rest.y * this.segLen * i
        return { x, y, px: x, py: y }
      })
      this.inited = true
    }
    const root = this.pts[0]
    if (!root) return
    root.x = anchor.x
    root.y = anchor.y
    root.px = anchor.x
    root.py = anchor.y
    for (let i = 1; i < this.pts.length; i++) {
      const p = this.pts[i]
      if (!p) continue
      const vx = (p.x - p.px) * this.drag
      const vy = (p.y - p.py) * this.drag
      p.px = p.x
      p.py = p.y
      // 轻微拉回「垂落方向」，让静止时的形状稳定
      const tx = anchor.x + rest.x * this.segLen * i
      const ty = anchor.y + rest.y * this.segLen * i
      p.x += vx + wind.x + (tx - p.x) * this.stiffness
      p.y += vy + this.gravity + wind.y + (ty - p.y) * this.stiffness
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < this.pts.length; i++) {
        const a = this.pts[i - 1]
        const b = this.pts[i]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 1e-6
        const k = (d - this.segLen) / d
        if (i === 1) {
          b.x -= dx * k
          b.y -= dy * k
        } else {
          a.x += dx * k * 0.5
          a.y += dy * k * 0.5
          b.x -= dx * k * 0.5
          b.y -= dy * k * 0.5
        }
      }
    }
  }

  /** 瞬移（读快照、重置）后别把链子拉成一条长线。 */
  reset(): void {
    this.inited = false
  }

  points(): Pt[] {
    return this.pts.map((p) => ({ x: p.x, y: p.y }))
  }
}
