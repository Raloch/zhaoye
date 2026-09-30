import { activePlayerHits, playerHurtbox } from '../core/combat'
import { VIEW_W } from '../core/config'
import { attackDef, enemyHurtbox } from '../core/enemies'
import { toWorld } from '../core/geom'
import { BTN, type InputFrame } from '../core/input'
import { totalFrames } from '../core/moves'
import { currentMove, isInvulnerable } from '../core/player'
import type { GameState } from '../core/state'
import { FONT } from './theme'

/**
 * 调试层（docs/10-tech.md「调试工具」）。
 * F1 判定框：攻击红、受击蓝、推挤绿。F2 帧数据条。F5 输入历史。
 */

export function drawHitboxes(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.save()
  ctx.lineWidth = 0.8
  const p = s.player
  const hurt = playerHurtbox(s)
  ctx.strokeStyle = isInvulnerable(s) ? 'rgba(120,255,160,0.95)' : 'rgba(80,160,255,0.95)'
  ctx.fillStyle = isInvulnerable(s) ? 'rgba(120,255,160,0.15)' : 'rgba(80,160,255,0.15)'
  ctx.fillRect(hurt.x, hurt.y, hurt.w, hurt.h)
  ctx.strokeRect(hurt.x, hurt.y, hurt.w, hurt.h)
  for (const h of activePlayerHits(s)) {
    if (h.screen) continue
    const r = toWorld(h.box, p.x, p.y, p.facing)
    ctx.fillStyle = 'rgba(255,60,60,0.28)'
    ctx.strokeStyle = 'rgba(255,60,60,1)'
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  }
  for (const e of s.enemies) {
    const hb = enemyHurtbox(e)
    ctx.strokeStyle = 'rgba(80,160,255,0.9)'
    ctx.strokeRect(hb.x, hb.y, hb.w, hb.h)
    ctx.strokeStyle = 'rgba(80,220,120,0.8)'
    ctx.beginPath()
    ctx.moveTo(e.x - e.halfW, e.y + 1)
    ctx.lineTo(e.x + e.halfW, e.y + 1)
    ctx.stroke()
    const def = attackDef(e)
    const atk = e.attack
    if (def && atk) {
      for (const h of def.hits) {
        const r = toWorld(h.box, e.x, e.y, e.facing)
        const live = atk.frame >= h.from && atk.frame < h.to && e.state === 'attack'
        ctx.strokeStyle = live ? 'rgba(255,90,40,1)' : 'rgba(255,90,40,0.3)'
        ctx.fillStyle = live ? 'rgba(255,90,40,0.3)' : 'rgba(0,0,0,0)'
        ctx.fillRect(r.x, r.y, r.w, r.h)
        ctx.strokeRect(r.x, r.y, r.w, r.h)
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `600 6px ${FONT.mono}`
    ctx.textAlign = 'center'
    ctx.fillText(`${e.state}${e.hasToken ? ' ●' : ''}`, e.x, e.y + 8)
    ctx.textAlign = 'left'
  }
  for (const pr of s.projectiles) {
    ctx.strokeStyle = 'rgba(255,60,60,1)'
    const w = pr.kind === 'wave' ? 16 : 20
    const hh = pr.kind === 'wave' ? 32 : 20
    ctx.strokeRect(pr.x - w / 2, pr.y - hh / 2, w, hh)
  }
  ctx.strokeStyle = 'rgba(80,220,120,0.9)'
  ctx.beginPath()
  ctx.moveTo(p.x - p.halfW, p.y + 1)
  ctx.lineTo(p.x + p.halfW, p.y + 1)
  ctx.stroke()
  ctx.restore()
}

/** 格斗游戏训练模式那种帧数条：绿=起手、红=判定、蓝=收招，白框是当前帧。 */
export function drawFrameMeter(ctx: CanvasRenderingContext2D, s: GameState): void {
  const p = s.player
  const m = currentMove(p)
  const mv = p.move
  const x0 = 140
  const y0 = 8
  ctx.save()
  ctx.fillStyle = 'rgba(10,12,16,0.72)'
  ctx.fillRect(x0 - 4, y0 - 2, 204, 40)
  ctx.font = `600 7px ${FONT.body}`
  ctx.fillStyle = '#f3ecdc'
  const buf = p.buffer ? `  缓冲:${p.buffer.cmd}` : ''
  const label =
    m && mv
      ? `${m.name}  ${mv.phase === 'main' ? '' : mv.phase} 第 ${mv.frame + 1} 帧`
      : `状态 ${p.state}`
  ctx.fillText(`${label}${buf}`, x0, y0 + 7)
  ctx.fillText(
    `顿帧 ${s.hitstop}  灵力 ${p.mp.toFixed(0)}  剑意 ${p.sword.toFixed(0)}  无敌 ${isInvulnerable(s) ? '是' : '否'}  反击窗 ${p.counterWindow}`,
    x0,
    y0 + 35,
  )
  if (m && mv) {
    const total =
      mv.phase === 'land' && m.untilLand
        ? m.untilLand.active + m.untilLand.recovery
        : totalFrames(m)
    const cell = Math.min(3.2, 196 / Math.max(1, total))
    for (let i = 0; i < total; i++) {
      let color = '#3fbf6a'
      if (mv.phase === 'land' && m.untilLand) color = i < m.untilLand.active ? '#e5484d' : '#3b82f6'
      else if (i >= m.startup + m.active) color = '#3b82f6'
      else if (i >= m.startup) color = '#e5484d'
      ctx.fillStyle = color
      ctx.fillRect(x0 + i * cell, y0 + 12, Math.max(1, cell - 0.6), 10)
    }
    const cur = Math.min(total - 1, mv.frame)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.8
    ctx.strokeRect(x0 + cur * cell - 0.3, y0 + 11, cell + 0.2, 12)
    if (m.invuln) {
      ctx.fillStyle = 'rgba(120,255,160,0.9)'
      ctx.fillRect(x0 + m.invuln[0] * cell, y0 + 24, (m.invuln[1] - m.invuln[0] + 1) * cell, 2)
    }
  }
  ctx.restore()
}

const DIR_GLYPH: [number, string][] = [
  [BTN.up | BTN.left, '↖'],
  [BTN.up | BTN.right, '↗'],
  [BTN.down | BTN.left, '↙'],
  [BTN.down | BTN.right, '↘'],
  [BTN.up, '↑'],
  [BTN.down, '↓'],
  [BTN.left, '←'],
  [BTN.right, '→'],
]
const BTN_GLYPH: [number, string][] = [
  [BTN.attack, 'J'],
  [BTN.jump, 'K'],
  [BTN.guard, 'L'],
  [BTN.light, 'U'],
  [BTN.super, 'O'],
]

function glyphs(held: number): string {
  const dirMask = BTN.up | BTN.down | BTN.left | BTN.right
  let dir = '·'
  for (const [m, g] of DIR_GLYPH) {
    if ((held & dirMask) === m) {
      dir = g
      break
    }
  }
  const btns = BTN_GLYPH.filter(([m]) => held & m).map(([, g]) => g)
  return `${dir} ${btns.join('')}`
}

/** 输入历史：把连续相同的输入合并成一行，右边是持续帧数。 */
export class InputLog {
  private rows: { held: number; frames: number }[] = []
  push(f: InputFrame): void {
    const last = this.rows[this.rows.length - 1]
    if (last && last.held === f.held && f.pressed === 0) last.frames++
    else this.rows.push({ held: f.held, frames: 1 })
    if (this.rows.length > 18) this.rows.shift()
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.fillStyle = 'rgba(10,12,16,0.7)'
    ctx.fillRect(4, 48, 54, 18 * 9 + 6)
    ctx.font = `600 7px ${FONT.mono}`
    const rows = this.rows.slice().reverse()
    rows.forEach((r, i) => {
      ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(243,236,220,0.75)'
      ctx.fillText(glyphs(r.held), 8, 58 + i * 9)
      ctx.textAlign = 'right'
      ctx.fillText(String(Math.min(99, r.frames)), 54, 58 + i * 9)
      ctx.textAlign = 'left'
    })
    ctx.restore()
  }
}

export function drawTrainingInfo(ctx: CanvasRenderingContext2D, s: GameState, flags: string): void {
  ctx.save()
  ctx.font = `600 6.5px ${FONT.body}`
  ctx.fillStyle = 'rgba(243,236,220,0.85)'
  ctx.textAlign = 'right'
  ctx.fillText(flags, VIEW_W - 8, 262)
  ctx.textAlign = 'left'
  ctx.fillText(`敌人 ${s.enemies.length}  最高连击 ${s.combo.best}`, 8, 262)
  ctx.restore()
}
