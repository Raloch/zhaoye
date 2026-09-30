// 装配：找到页面上的每块画布，按逻辑尺寸设好分辨率后绘制。

import * as BD from './boards.js'
import { CH1, drawGreybox, drawWorldMap, PACE_KIND, PACING } from './levels.js'

const FONTS = {
  display: '"Ma Shan Zheng", "STKaiti", "KaiTi", serif',
  body: '"Noto Serif SC", "Songti SC", "SimSun", serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
}

function theme() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n) => cs.getPropertyValue(n).trim()
  return {
    panel: v('--panel'),
    panelHex: v('--panel'),
    ink: v('--ink'),
    inkHex: v('--ink'),
    seal: v('--seal'),
    sealHex: v('--seal'),
    muted: v('--ink-2'),
    wood: v('--wood'),
    fire: v('--fire'),
    gold: v('--gold'),
    teal: v('--teal'),
    tealHex: v('--teal'),
    ...FONTS,
  }
}

const BOARDS = {
  frame: { w: 480, h: 270, draw: (ctx) => BD.targetFrame(ctx, FONTS) },
  banner: { w: 480, h: 150, draw: (ctx, el) => BD.chapterBanner(ctx, Number(el.dataset.ch)) },
  heroStrip: { w: 480, h: 120, draw: (ctx) => BD.heroStrip(ctx) },
  npc: { w: 120, h: 120, draw: (ctx, el) => BD.npcCard(ctx, el.dataset.id) },
  enemy: { w: 160, h: 100, draw: (ctx, el) => BD.enemyCard(ctx, el.dataset.id) },
  boss: { w: 300, h: 150, draw: (ctx, el) => BD.bossCard(ctx, el.dataset.id) },
  lineup: { w: 800, h: 150, draw: (ctx) => BD.lineup(ctx, FONTS) },
  world: { w: 480, h: 170, themed: true, draw: (ctx) => drawWorldMap(ctx, 480, 170, theme()) },
  greybox: { w: 4800, h: 306, themed: true, draw: (ctx) => drawGreybox(ctx, CH1, theme()) },
}

function render(el) {
  const b = BOARDS[el.dataset.board]
  if (!b) return
  el.style.aspectRatio = `${b.w} / ${b.h}`
  const cssW = el.clientWidth
  if (!cssW) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(cssW * dpr)
  el.height = Math.round(((cssW * b.h) / b.w) * dpr)
  const ctx = el.getContext('2d')
  const s = el.width / b.w
  ctx.setTransform(s, 0, 0, s, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  try {
    b.draw(ctx, el)
  } catch (err) {
    console.error(el.dataset.board, err)
  }
  el.dataset.rendered = String(cssW)
}

function renderAll({ themedOnly = false } = {}) {
  for (const el of document.querySelectorAll('canvas[data-board]')) {
    const b = BOARDS[el.dataset.board]
    if (themedOnly && !b?.themed) continue
    render(el)
  }
}

function buildPacing() {
  const root = document.getElementById('pacing')
  if (!root) return
  for (const row of PACING) {
    const line = document.createElement('div')
    line.className = 'pace-row'
    const label = document.createElement('div')
    label.className = 'pace-ch'
    label.textContent = row.ch
    const track = document.createElement('div')
    track.className = 'pace-track'
    for (const [name, screens, kind, level] of row.segs) {
      const seg = document.createElement('div')
      seg.className = `pace-seg k-${kind}`
      seg.style.flexGrow = String(screens)
      seg.style.setProperty('--lv', String(level))
      seg.title = `${name} · ${PACE_KIND[kind]} · ${screens} 屏`
      const bar = document.createElement('span')
      bar.className = 'pace-bar'
      const txt = document.createElement('span')
      txt.className = 'pace-name'
      txt.textContent = name
      seg.append(bar, txt)
      track.append(seg)
    }
    line.append(label, track)
    root.append(line)
  }
}

async function loadFonts() {
  const sample =
    '照夜封魔录昭连击妙白光可格挡剑意主角身高一二三四五青崖镇雾隐竹林断岳山幽泽蜃楼幻宫观镇魔碑九幽烛鬼火小蝠灰狼蛊蛾叶骷髅兵卫影镜魅藤精沼蛙妖骨刹石傀儡黑鬃枯姥屏锁战Boss：移动跳攻击断蓄力斩破防穿云刺门谱人桩0123456789,×I→←'
  const jobs = [
    document.fonts.load(`20px ${FONTS.display}`, sample),
    document.fonts.load(`600 12px ${FONTS.body}`, sample),
    document.fonts.load(`700 12px ${FONTS.body}`, sample),
    document.fonts.load(`600 10px ${FONTS.mono}`, '0123456789,屏I'),
  ]
  const timeout = new Promise((r) => setTimeout(r, 2500))
  try {
    await Promise.race([Promise.all(jobs), timeout])
  } catch {
    // 字体加载失败时用后备字体继续画
  }
}

async function main() {
  buildPacing()
  await loadFonts()
  renderAll()
  let last = window.innerWidth
  let timer = 0
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - last) < 8) return
    last = window.innerWidth
    clearTimeout(timer)
    timer = setTimeout(() => renderAll(), 160)
  })
  const rerenderThemed = () => renderAll({ themedOnly: true })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerenderThemed)
  new MutationObserver(rerenderThemed).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}

main()
