/** 色板出自 docs/06-art.md。第 1 章「黄昏烽火」。 */
export const C = {
  ink: '#101217',
  inkFar: '#2a2e38',
  teal: '#3fd0c9',
  blade: '#eefcff',
  bladeGlow: '#7fe8ff',
  iron: '#4a505a',
  seal: '#c8372d',
  paper: '#f3ecdc',
  gold: '#f3c86b',
  warnWhite: '#ffffff',
  warnRed: '#ff3b30',
  warnPurple: '#c07bff',
  eye: '#ff4a3d',
  rim: '#ffd2a0',
  wood: '#5a3e2a',
  straw: '#b89a5e',
  sky0: '#f4d3a0',
  sky1: '#e2825e',
  far: '#c99a82',
  mid: '#8e6660',
  near: '#4a3436',
  fog: '#f0c6a0',
  ground: '#14100f',
  fire: '#ff8a3d',
} as const

export const FONT = {
  display: '"Ma Shan Zheng", "STKaiti", "KaiTi", serif',
  body: '"Noto Serif SC", "Songti SC", "PingFang SC", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
} as const

export function rgba(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
