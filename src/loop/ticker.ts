export type Ticker = {
  start(): void
  stop(): void
}

export type TickerOptions = {
  /** 每个逻辑步长的毫秒数。每 tick 读一次，返回值变了速度就变。 */
  tickMs(): number
  /** 逻辑推进，频率与显示帧率无关。 */
  onTick(): void
  /** 每帧一次；alpha ∈ [0, 1) 是距下一 tick 的进度，供渲染层做视觉插值。 */
  onRender(alpha: number): void
}

/** 单帧最多补偿的时间。防止切走标签页再回来时一次性追赶上百个 tick 把蛇撞死。 */
const MAX_FRAME_MS = 250

/** 步长下限，兜住 tickMs() 返回 0 或负数导致的死循环。 */
const MIN_STEP_MS = 16

/**
 * 固定步长循环。
 *
 * 逻辑速度必须和刷新率解耦：直接在 requestAnimationFrame 里推进逻辑，
 * 蛇在 144Hz 屏上会比 60Hz 屏快一倍多。这里用累加器攒够一个步长才走一步，
 * 渲染仍然每帧执行并拿到 alpha 做平滑。
 */
export function createTicker(options: TickerOptions): Ticker {
  let raf = 0
  let last = 0
  let acc = 0
  let running = false

  function frame(now: number): void {
    if (!running) return
    raf = requestAnimationFrame(frame)

    acc += Math.min(now - last, MAX_FRAME_MS)
    last = now

    let stepMs = Math.max(MIN_STEP_MS, options.tickMs())
    while (acc >= stepMs) {
      acc -= stepMs
      options.onTick()
      // 分数上升会缩短步长，追赶过程中重新读取
      stepMs = Math.max(MIN_STEP_MS, options.tickMs())
    }

    options.onRender(acc / stepMs)
  }

  return {
    start() {
      if (running) return
      running = true
      last = performance.now()
      acc = 0
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
  }
}
