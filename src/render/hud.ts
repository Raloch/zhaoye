import { COMBO, RES, VIEW_W } from '../core/config'
import type { GameState } from '../core/state'
import type { Fx } from './fx'
import { C, FONT } from './theme'

/** HUD：左上生命 / 灵力 / 剑意，右侧连击数和评级印章（docs/08-ui.md）。 */
export function drawHud(ctx: CanvasRenderingContext2D, s: GameState, fx: Fx, lagHp: number): void {
  const p = s.player
  const plate = ctx.createLinearGradient(0, 0, 190, 0)
  plate.addColorStop(0, 'rgba(16,18,23,0.55)')
  plate.addColorStop(1, 'rgba(16,18,23,0)')
  ctx.fillStyle = plate
  ctx.fillRect(0, 0, 190, 44)

  ctx.fillStyle = C.seal
  ctx.beginPath()
  ctx.roundRect(12, 11, 22, 22, 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(243,236,220,0.7)'
  ctx.lineWidth = 0.6
  ctx.strokeRect(14, 13, 18, 18)
  ctx.fillStyle = C.paper
  ctx.font = `17px ${FONT.display}`
  ctx.textAlign = 'center'
  ctx.fillText('昭', 23, 28.5)
  ctx.textAlign = 'left'

  const bar = (x: number, y: number, w: number, h: number, pct: number, color: string, lag = 0) => {
    ctx.fillStyle = 'rgba(16,18,23,0.62)'
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2)
    if (lag > pct) {
      ctx.fillStyle = 'rgba(243,236,220,0.85)'
      ctx.fillRect(x, y, w * lag, h)
    }
    ctx.fillStyle = color
    ctx.fillRect(x, y, w * Math.max(0, pct), h)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(x, y, w * Math.max(0, pct), 1)
  }
  bar(40, 13, 118, 5, p.hp / p.maxHp, '#d9483b', lagHp)
  const mpColor = fx.mpFlash() > 0 && Math.floor(fx.mpFlash() / 4) % 2 === 0 ? '#ffffff' : C.teal
  bar(40, 22, 94, 3.6, p.mp / p.maxMp, mpColor)

  const full = p.sword >= RES.swordMax
  for (let i = 0; i < 5; i++) {
    const x = 44 + i * 9
    const y = 31
    const fill = Math.max(0, Math.min(1, p.sword / 20 - i))
    ctx.beginPath()
    ctx.moveTo(x, y - 3.4)
    ctx.lineTo(x + 3.4, y)
    ctx.lineTo(x, y + 3.4)
    ctx.lineTo(x - 3.4, y)
    ctx.closePath()
    ctx.fillStyle = 'rgba(16,18,23,0.5)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(243,200,107,0.8)'
    ctx.lineWidth = 0.7
    ctx.stroke()
    if (fill > 0) {
      ctx.save()
      ctx.clip()
      ctx.fillStyle = C.gold
      ctx.fillRect(x - 3.4, y + 3.4 - 6.8 * fill, 6.8, 6.8 * fill)
      ctx.restore()
    }
  }
  ctx.font = `600 6px ${FONT.body}`
  ctx.fillStyle = full ? C.gold : 'rgba(243,236,220,0.9)'
  ctx.fillText(full ? '剑意满 · 按 O' : '剑意', 90, 33.2)

  // 连击
  const c = s.combo
  const hold = fx.comboHold()
  if (c.count >= 2 || hold > 0) {
    const count = c.count >= 2 ? c.count : c.best
    const alpha = c.count >= 2 ? 1 : hold / 40
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.textAlign = 'right'
    ctx.font = `40px ${FONT.display}`
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(16,18,23,0.85)'
    ctx.fillStyle = C.paper
    ctx.strokeText(String(count), VIEW_W - 38, 96)
    ctx.fillText(String(count), VIEW_W - 38, 96)
    ctx.font = `13px ${FONT.display}`
    ctx.strokeText('连击', VIEW_W - 14, 95)
    ctx.fillText('连击', VIEW_W - 14, 95)
    ctx.translate(VIEW_W - 34, 118)
    ctx.rotate(-0.14)
    ctx.fillStyle = C.seal
    ctx.fillRect(-11, -11, 22, 22)
    ctx.strokeStyle = 'rgba(243,236,220,0.8)'
    ctx.lineWidth = 0.8
    ctx.strokeRect(-9, -9, 18, 18)
    ctx.fillStyle = C.paper
    ctx.font = `17px ${FONT.display}`
    ctx.textAlign = 'center'
    ctx.fillText(COMBO.ratingNames[c.rating] ?? '初', 0, 6)
    ctx.restore()
    if (c.count >= 2) {
      ctx.font = `600 7px ${FONT.body}`
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(243,236,220,0.9)'
      ctx.fillText(`伤害 ${c.damage}  剑意 ×${COMBO.ratingMul[c.rating] ?? 1}`, VIEW_W - 14, 140)
      ctx.textAlign = 'left'
    }
  }

  if (p.state === 'dead') {
    ctx.fillStyle = 'rgba(16,18,23,0.5)'
    ctx.fillRect(0, 110, VIEW_W, 40)
    ctx.fillStyle = C.paper
    ctx.font = `20px ${FONT.display}`
    ctx.textAlign = 'center'
    ctx.fillText('倒下了 · 片刻后复起', VIEW_W / 2, 137)
    ctx.textAlign = 'left'
  }
}
