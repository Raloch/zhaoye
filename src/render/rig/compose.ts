import { colorPaint, maskPaint, type Paint, type Palette } from './paint'

export type Bounds = { x: number; y: number; w: number; h: number }

export type ComposeOptions = {
  colors: Palette
  /** 边缘光颜色；null 表示不要轮廓光。 */
  rim: string | null
  rimWidth?: number
  light?: readonly [number, number]
  alpha?: number
  /** 整体外发光（预警、幻影）。 */
  halo?: { color: string; blur: number } | null
}

/**
 * 剪影合成器。在一块和角色包围盒一样大的离屏画布上画两遍（遮罩、着色），
 * 再贴回主画布：遮罩朝光源偏移一点先贴，着色盖上去，露出的一圈就是轮廓光。
 * 离屏只有包围盒大小，一帧画十几个角色也没压力。
 */
export class Compositor {
  private readonly a = document.createElement('canvas')
  private readonly b = document.createElement('canvas')

  draw(
    ctx: CanvasRenderingContext2D,
    box: Bounds,
    o: ComposeOptions,
    fn: (c: CanvasRenderingContext2D, p: Paint) => void,
  ): void {
    const m = ctx.getTransform()
    const k = Math.hypot(m.a, m.b)
    const W = Math.max(1, Math.ceil(box.w * k))
    const H = Math.max(1, Math.ceil(box.h * k))
    const passes: [HTMLCanvasElement, Paint][] = o.rim
      ? [
          [this.a, maskPaint(o.rim)],
          [this.b, colorPaint(o.colors)],
        ]
      : [[this.b, colorPaint(o.colors)]]
    for (const [cv, paint] of passes) {
      if (cv.width < W) cv.width = W
      if (cv.height < H) cv.height = H
      const c = cv.getContext('2d')
      if (!c) continue
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.clearRect(0, 0, W + 2, H + 2)
      c.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
      c.lineCap = 'round'
      c.lineJoin = 'round'
      fn(c, paint)
    }
    ctx.save()
    const alpha = o.alpha ?? 1
    if (o.rim) {
      const d = o.rimWidth ?? 0.8
      const [lx, ly] = o.light ?? [-0.7, -0.7]
      ctx.globalAlpha = alpha * 0.9
      ctx.drawImage(this.a, 0, 0, W, H, box.x + lx * d, box.y + ly * d, W / k, H / k)
    }
    ctx.globalAlpha = alpha
    if (o.halo) {
      ctx.shadowColor = o.halo.color
      ctx.shadowBlur = o.halo.blur * k
    }
    ctx.drawImage(this.b, 0, 0, W, H, box.x, box.y, W / k, H / k)
    ctx.restore()
  }
}
