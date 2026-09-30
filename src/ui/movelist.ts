import { MOVE_LIST, type MoveId, totalFrames } from '../core/moves'

/** 招式表（暂停时按 H 查看）。帧数直接从 moves.ts 读，改了数据这里自动跟着变。 */

const INPUTS: Partial<Record<MoveId, string>> = {
  n1: 'J',
  n2: 'J（续）',
  n3: 'J（续）',
  n4: 'J（续）',
  charge: '按住 J，松开',
  launcher: '↑ + J',
  sweep: '↓ + J',
  dashSlash: '疾跑中 J',
  a1: '空中 J',
  a2: '空中 J（续）',
  a3: '空中 J（续）',
  plunge: '空中 ↓ + J',
  pierce: '← → J',
  wave: '↓ → J',
  rising: '↓ ↑ J',
  gale: '→ → J',
  quake: '↓ ↓ J',
  light: 'U',
  counter: '弹反后 J',
  super: 'O（剑意满）',
}

const BASICS: readonly [string, string][] = [
  ['移动 / 疾跑', 'A D · 双击疾跑'],
  ['跳 / 二段跳', 'K（或空格）· 空中再按'],
  ['下平台', 'S + K'],
  ['格挡', '按住 L'],
  ['弹反', '受击前 6 帧内按 L'],
  ['闪步', 'L + A/D（第 2～11 帧无敌）'],
  ['闪步取消', '普攻收招中 L + 方向（10 灵力）'],
  ['受身', '被击飞时 K'],
]

export function renderMoveList(root: HTMLElement): void {
  const rows = MOVE_LIST.map((m) => {
    const frames = m.untilLand
      ? `${m.startup}/落地/${m.untilLand.recovery}`
      : `${m.startup}/${m.active}/${m.recovery}`
    return `<tr><td>${m.name}</td><td class="cmd">${INPUTS[m.id] ?? ''}</td><td class="num">${frames}</td><td class="num">${
      m.mp || ''
    }</td><td class="num">${m.untilLand ? '' : totalFrames(m)}</td></tr>`
  }).join('')
  const basics = BASICS.map(
    ([a, b]) => `<tr><td>${a}</td><td class="cmd" colspan="4">${b}</td></tr>`,
  ).join('')
  root.innerHTML = `
    <h2>招式表</h2>
    <p class="muted">→ 指面朝方向。帧数格式：起手 / 判定 / 收招。按 H 或 Esc 关闭。</p>
    <div class="cols">
      <table><thead><tr><th>招式</th><th>指令</th><th>帧数</th><th>灵力</th><th>总帧</th></tr></thead><tbody>${rows}</tbody></table>
      <table><thead><tr><th>动作</th><th colspan="4">输入</th></tr></thead><tbody>${basics}</tbody></table>
    </div>`
}
