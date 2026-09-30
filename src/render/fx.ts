import type { GameEvent, GameState } from '../core/state'
import { circle, glow, withAlpha } from './draw'
import { C, FONT } from './theme'

/**
 * 表现层特效：只吃 core 发出的事件，从不反过来影响逻辑。
 * 每个逻辑 tick 更新一次，顿帧期间照样更新，所以定格时粒子还在动。
 */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  kind: 'ink' | 'spark' | 'dust' | 'ember'
}

type Ring = {
  x: number
  y: number
  r: number
  grow: number
  life: number
  max: number
  color: string
  width: number
}
type Text = {
  x: number
  y: number
  text: string
  life: number
  max: number
  color: string
  size: number
  font: string
}
type Streak = {
  x: number
  y: number
  angle: number
  len: number
  life: number
  max: number
  color: string
}
type Ghost = { x: number; y: number; facing: number; life: number }

export type Fx = {
  consume(events: readonly GameEvent[]): void
  update(s: GameState): void
  drawWorld(ctx: CanvasRenderingContext2D): void
  drawScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void
  shake(): { x: number; y: number }
  flashOf(id: number): number
  recentHit(id: number): number
  mpFlash(): number
  ghosts(): readonly Ghost[]
  comboHold(): number
}

export function createFx(): Fx {
  const parts: Particle[] = []
  const rings: Ring[] = []
  const texts: Text[] = []
  const streaks: Streak[] = []
  const ghosts: Ghost[] = []
  const flash = new Map<number, number>()
  const hitAge = new Map<number, number>()
  let shakePower = 0
  let shakeFrames = 0
  let screenFlash = 0
  let invert = 0
  let darken = 0
  let mpFlashT = 0
  let comboHoldT = 0
  let seed = 1
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }

  function burst(
    x: number,
    y: number,
    n: number,
    speed: number,
    color: string,
    kind: Particle['kind'],
    size = 1,
    dir = 0,
  ): void {
    for (let i = 0; i < n; i++) {
      const a = dir !== 0 ? (dir > 0 ? 0 : Math.PI) + (rnd() - 0.5) * 2.2 : rnd() * Math.PI * 2
      const v = speed * (0.35 + rnd() * 0.9)
      const life = 14 + Math.floor(rnd() * 16)
      parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.6,
        life,
        max: life,
        size: size * (0.5 + rnd()),
        color,
        kind,
      })
    }
  }

  function addText(
    x: number,
    y: number,
    text: string,
    color: string,
    size = 12,
    font: string = FONT.display,
    life = 36,
  ): void {
    texts.push({ x, y, text, life, max: life, color, size, font })
  }

  function consume(events: readonly GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          if (e.target === 'enemy') {
            flash.set(e.id, 3)
            hitAge.set(e.id, 0)
            burst(
              e.x,
              e.y,
              e.heavy ? 18 : 10,
              e.heavy ? 3.4 : 2.4,
              C.ink,
              'ink',
              e.heavy ? 1.6 : 1.1,
              e.dir,
            )
            burst(e.x, e.y, e.heavy ? 8 : 4, 3.2, '#e8fdff', 'spark', 0.8, e.dir)
            const ang = (e.dir > 0 ? -0.5 : Math.PI + 0.5) + (rnd() - 0.5) * 0.8
            streaks.push({
              x: e.x,
              y: e.y,
              angle: ang,
              len: e.heavy ? 34 : 22,
              life: 5,
              max: 5,
              color: '#e8fdff',
            })
            if (e.heavy)
              rings.push({
                x: e.x,
                y: e.y,
                r: 4,
                grow: 2.2,
                life: 10,
                max: 10,
                color: '#e8fdff',
                width: 1.6,
              })
            addText(
              e.x + (rnd() - 0.5) * 8,
              e.y - 10,
              String(e.dmg),
              e.crit ? C.warnRed : '#ffffff',
              e.crit ? 16 : 11,
              FONT.display,
              34,
            )
            if (e.crit) addText(e.x, e.y - 24, '暴击', C.warnRed, 9, FONT.display, 30)
          } else {
            burst(e.x, e.y, 12, 2.6, C.seal, 'ink', 1.2, e.dir)
            screenFlash = Math.max(screenFlash, 4)
          }
          if (e.shake > 0) {
            shakePower = Math.max(shakePower, e.shake)
            shakeFrames = Math.max(shakeFrames, 6 + e.shake * 2)
          }
          break
        }
        case 'block':
          burst(e.x, e.y, 8, 2.6, C.gold, 'spark', 0.8)
          addText(e.x, e.y - 12, '叮', C.gold, 11, FONT.display, 24)
          break
        case 'parry':
          rings.push({
            x: e.x,
            y: e.y,
            r: 4,
            grow: 3,
            life: 14,
            max: 14,
            color: '#ffffff',
            width: 2.4,
          })
          rings.push({
            x: e.x,
            y: e.y,
            r: 2,
            grow: 1.6,
            life: 18,
            max: 18,
            color: C.bladeGlow,
            width: 1.4,
          })
          burst(e.x, e.y, 16, 4, '#ffffff', 'spark', 1)
          addText(e.x, e.y - 18, '锵', '#ffffff', 20, FONT.display, 40)
          screenFlash = Math.max(screenFlash, 3)
          break
        case 'guardBreak':
          burst(e.x, e.y, 14, 3, C.gold, 'spark', 1)
          addText(e.x, e.y - 22, '破防', C.gold, 14, FONT.display, 44)
          break
        case 'jump':
          if (!e.double) burst(e.x, e.y, 5, 1.2, C.fog, 'dust', 1.6)
          else
            rings.push({
              x: e.x,
              y: e.y,
              r: 3,
              grow: 1.2,
              life: 10,
              max: 10,
              color: C.teal,
              width: 1,
            })
          break
        case 'land':
          burst(e.x, e.y - 1, 6, 1.3, C.fog, 'dust', 1.6)
          break
        case 'dash':
          burst(e.x, e.y - 1, 6, 1.6, C.fog, 'dust', 1.6, -e.dir)
          break
        case 'evade':
          addText(e.x, e.y - 18, '闪', C.teal, 14, FONT.display, 30)
          break
        case 'kill':
          burst(e.x, e.y - 8, 26, 3.2, C.ink, 'ink', 1.8)
          rings.push({
            x: e.x,
            y: e.y - 8,
            r: 6,
            grow: 2.6,
            life: 14,
            max: 14,
            color: C.ink,
            width: 2,
          })
          break
        case 'bounce':
          burst(e.x, e.y, 8, 2, e.wall ? '#ffffff' : C.fog, e.wall ? 'spark' : 'dust', 1.4)
          if (e.wall) shakeFrames = Math.max(shakeFrames, 6)
          break
        case 'tech':
          addText(e.x, e.y - 30, '受身', '#ffffff', 11, FONT.display, 30)
          break
        case 'mpShort':
          mpFlashT = 24
          break
        case 'light':
          rings.push({
            x: e.x,
            y: e.y,
            r: 8,
            grow: 6,
            life: 16,
            max: 16,
            color: '#f6fdff',
            width: 3,
          })
          rings.push({
            x: e.x,
            y: e.y,
            r: 4,
            grow: 4.6,
            life: 20,
            max: 20,
            color: C.bladeGlow,
            width: 1.5,
          })
          screenFlash = Math.max(screenFlash, 2)
          break
        case 'super':
          if (e.phase === 'start') darken = 110
          else {
            // 奥义末击：黑白冲击帧
            invert = 3
            shakePower = 6
            shakeFrames = 18
          }
          break
        case 'comboEnd':
          comboHoldT = 40
          break
        case 'telegraph':
        case 'swing':
        case 'playerDown':
          break
      }
    }
  }

  function update(s: GameState): void {
    for (const p of parts) {
      p.x += p.vx
      p.y += p.vy
      p.vx *= p.kind === 'dust' ? 0.9 : 0.93
      p.vy = p.kind === 'dust' ? p.vy * 0.9 - 0.02 : p.vy + (p.kind === 'ink' ? 0.16 : 0.05)
      p.life--
    }
    removeDead(parts)
    for (const r of rings) {
      r.r += r.grow
      r.grow *= 0.88
      r.life--
    }
    removeDead(rings)
    for (const t of texts) {
      t.y -= 0.45
      t.life--
    }
    removeDead(texts)
    for (const st of streaks) st.life--
    removeDead(streaks)
    for (const g of ghosts) g.life--
    removeDead(ghosts)
    const p = s.player
    if (p.state === 'dash' && s.frame % 2 === 0)
      ghosts.push({ x: p.x, y: p.y, facing: p.facing, life: 10 })
    for (const [id, v] of flash) {
      if (v <= 1) flash.delete(id)
      else flash.set(id, v - 1)
    }
    for (const [id, v] of hitAge) hitAge.set(id, v + 1)
    if (shakeFrames > 0) shakeFrames--
    else shakePower = 0
    if (screenFlash > 0) screenFlash--
    if (invert > 0) invert--
    if (darken > 0) darken--
    if (mpFlashT > 0) mpFlashT--
    if (comboHoldT > 0) comboHoldT--
  }

  function drawWorld(ctx: CanvasRenderingContext2D): void {
    for (const g of ghosts) {
      ctx.fillStyle = withAlpha(C.teal, (g.life / 10) * 0.35)
      ctx.beginPath()
      ctx.ellipse(g.x, g.y - 20, 6, 20, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const p of parts) {
      const a = p.life / p.max
      if (p.kind === 'ink') {
        ctx.fillStyle = withAlpha(p.color, Math.min(1, a * 1.4))
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, p.size * 1.8, p.size, Math.atan2(p.vy, p.vx), 0, Math.PI * 2)
        ctx.fill()
      } else if (p.kind === 'spark') {
        ctx.strokeStyle = withAlpha(p.color, a)
        ctx.lineWidth = p.size * 0.8
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2)
        ctx.stroke()
      } else {
        ctx.fillStyle = withAlpha(p.color, a * 0.5)
        circle(ctx, p, p.size * (2 - a))
      }
    }
    for (const r of rings) {
      ctx.strokeStyle = withAlpha(r.color, r.life / r.max)
      ctx.lineWidth = r.width * (r.life / r.max + 0.3)
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const st of streaks) {
      const a = st.life / st.max
      ctx.save()
      ctx.translate(st.x, st.y)
      ctx.rotate(st.angle)
      glow(ctx, C.bladeGlow, 6)
      ctx.fillStyle = withAlpha(st.color, a)
      ctx.beginPath()
      ctx.moveTo(-st.len / 2, 0)
      ctx.quadraticCurveTo(0, -2.6 * a, st.len / 2, 0)
      ctx.quadraticCurveTo(0, 1.2 * a, -st.len / 2, 0)
      ctx.fill()
      ctx.restore()
    }
    for (const t of texts) {
      const a = Math.min(1, (t.life / t.max) * 2)
      ctx.font = `${t.size}px ${t.font}`
      ctx.textAlign = 'center'
      ctx.lineWidth = 2.4
      ctx.strokeStyle = withAlpha(C.ink, a * 0.9)
      ctx.strokeText(t.text, t.x, t.y)
      ctx.fillStyle = withAlpha(t.color.startsWith('#') ? t.color : '#ffffff', a)
      ctx.fillText(t.text, t.x, t.y)
    }
    ctx.textAlign = 'left'
  }

  function drawScreen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (darken > 0) {
      ctx.fillStyle = `rgba(8,10,16,${Math.min(0.55, darken / 40) * (darken > 20 ? 1 : darken / 20)})`
      ctx.fillRect(0, 0, w, h)
    }
    if (screenFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${screenFlash * 0.06})`
      ctx.fillRect(0, 0, w, h)
    }
    if (invert > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'difference'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }

  return {
    consume,
    update,
    drawWorld,
    drawScreen,
    shake() {
      if (shakePower <= 0) return { x: 0, y: 0 }
      const k = shakePower * (shakeFrames / 16 + 0.3)
      return { x: (rnd() - 0.5) * 2 * k, y: (rnd() - 0.5) * 2 * k }
    },
    flashOf: (id) => flash.get(id) ?? 0,
    recentHit: (id) => hitAge.get(id) ?? 9999,
    mpFlash: () => mpFlashT,
    ghosts: () => ghosts,
    comboHold: () => comboHoldT,
  }
}

function removeDead<T extends { life: number }>(arr: T[]): void {
  let j = 0
  for (const x of arr) if (x.life > 0) arr[j++] = x
  arr.length = j
}
