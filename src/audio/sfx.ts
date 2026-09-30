import type { GameEvent } from '../core/state'

/**
 * 占位音效：全部用 WebAudio 现场合成（docs/07-audio.md 的原型方案），正式版换采样。
 *
 * 剑的声音拆成三层，而不是一记低频「咚」：
 *   破风 swish   挥出去那一刻的「嗖」：带通噪声从高往低扫
 *   切入 slice   砍中时短促的「嗤」：高通噪声瞬态 + 中频噪声
 *   金属 ring    刀身的余响「铮」：几个不成谐波关系的高频分音，快速衰减
 * 只有重击才叠一层很短的低频冲击，让它「沉」但不「闷」。
 */

export type SfxName =
  | 'swing'
  | 'swingHeavy'
  | 'hit'
  | 'hitHeavy'
  | 'crit'
  | 'shield'
  | 'block'
  | 'parry'
  | 'guardBreak'
  | 'hurt'
  | 'wave'
  | 'light'
  | 'superFinal'
  | 'kill'

type Out = { ac: BaseAudioContext; dest: AudioNode; noise: AudioBuffer; t0: number }

function makeNoise(ac: BaseAudioContext): AudioBuffer {
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const d = buf.getChannelData(0)
  // 固定种子的白噪声：离线分析时结果可复现
  let s = 12345
  for (let i = 0; i < d.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    d[i] = (s / 0x3fffffff) * 2 - 1
  }
  return buf
}

function env(g: GainNode, t: number, peak: number, attack: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

function tone(
  o: Out,
  f0: number,
  f1: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  delay = 0,
): void {
  const t = o.t0 + delay
  const osc = o.ac.createOscillator()
  const g = o.ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  env(g, t, peak, 0.002, dur)
  osc.connect(g).connect(o.dest)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise(
  o: Out,
  dur: number,
  type: BiquadFilterType,
  f0: number,
  f1: number,
  peak: number,
  q = 1,
  delay = 0,
  attack = 0.002,
): void {
  const t = o.t0 + delay
  const src = o.ac.createBufferSource()
  src.buffer = o.noise
  const f = o.ac.createBiquadFilter()
  f.type = type
  f.Q.value = q
  f.frequency.setValueAtTime(f0, t)
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  const g = o.ac.createGain()
  env(g, t, peak, attack, dur)
  src.connect(f).connect(g).connect(o.dest)
  src.start(t, (t * 7.31) % 0.5)
  src.stop(t + dur + 0.02)
}

/** 刀身余响：不成谐波关系的几个分音，听起来是「金属」而不是「乐音」。 */
function ring(o: Out, base: number, dur: number, peak: number, delay = 0): void {
  const ratios = [1, 1.483, 2.009, 2.71, 3.39]
  ratios.forEach((r, i) => {
    tone(o, base * r, base * r * 0.992, dur * (1 - i * 0.12), 'sine', peak / (1 + i * 0.6), delay)
  })
}

/** 每种声音的合成配方。detune 是这次播放的随机音高偏移，避免连打时听腻。 */
export function synth(o: Out, name: SfxName, detune = 1): void {
  const d = detune
  switch (name) {
    case 'swing':
      noise(o, 0.11, 'bandpass', 3400 * d, 900 * d, 0.28, 1.6, 0, 0.012)
      noise(o, 0.07, 'highpass', 6000, 3000, 0.06, 0.7, 0.01)
      return
    case 'swingHeavy':
      noise(o, 0.2, 'bandpass', 2600 * d, 420 * d, 0.36, 1.3, 0, 0.02)
      noise(o, 0.12, 'highpass', 5000, 2000, 0.08, 0.7, 0.02)
      return
    case 'hit':
      noise(o, 0.03, 'highpass', 3600 * d, 2600 * d, 0.13, 0.8)
      noise(o, 0.1, 'bandpass', 1800 * d, 1000 * d, 0.85, 0.9, 0.003)
      noise(o, 0.05, 'bandpass', 620 * d, 480 * d, 0.26, 1.4, 0.004)
      ring(o, 2150 * d, 0.13, 0.065, 0.005)
      return
    case 'hitHeavy':
      noise(o, 0.045, 'highpass', 3200 * d, 2200 * d, 0.24, 0.8)
      noise(o, 0.15, 'bandpass', 1500 * d, 650 * d, 0.55, 1, 0.003)
      noise(o, 0.07, 'bandpass', 520 * d, 380 * d, 0.3, 1.2, 0.004)
      ring(o, 1750 * d, 0.26, 0.09, 0.005)
      tone(o, 115, 58, 0.08, 'sine', 0.24)
      return
    case 'crit':
      noise(o, 0.04, 'highpass', 4200, 3000, 0.24, 0.8)
      noise(o, 0.1, 'bandpass', 2000, 1100, 0.6, 1.1, 0.003)
      ring(o, 2700 * d, 0.26, 0.1, 0.004)
      noise(o, 0.05, 'bandpass', 640, 480, 0.2, 1.4, 0.004)
      return
    case 'shield':
      // 刀砍在木盾上：短、干、带一点木头的共鸣
      noise(o, 0.05, 'bandpass', 1100 * d, 700 * d, 0.45, 3.5)
      tone(o, 620 * d, 540 * d, 0.06, 'triangle', 0.14)
      ring(o, 2600 * d, 0.1, 0.03, 0.004)
      return
    case 'block':
      // 剑格住爪牙：清脆的「叮」
      ring(o, 1900 * d, 0.28, 0.11)
      noise(o, 0.03, 'highpass', 6000, 4000, 0.22, 0.8)
      return
    case 'parry':
      // 弹反：最响、最长的一声「锵」
      noise(o, 0.05, 'highpass', 7000, 4500, 0.5, 0.8)
      ring(o, 1320, 0.7, 0.2)
      ring(o, 1760, 0.55, 0.12, 0.004)
      noise(o, 0.35, 'bandpass', 3800, 2400, 0.08, 6, 0.01)
      return
    case 'guardBreak':
      noise(o, 0.18, 'bandpass', 1800, 400, 0.45, 0.8)
      noise(o, 0.05, 'highpass', 4000, 2500, 0.35, 0.8)
      tone(o, 150, 70, 0.1, 'sine', 0.18)
      return
    case 'hurt':
      // 玩家被爪子挠中：撕裂感的中频噪声，少量低频
      noise(o, 0.12, 'bandpass', 1400, 500, 0.4, 1.4)
      tone(o, 180, 90, 0.08, 'sawtooth', 0.07)
      return
    case 'wave':
      noise(o, 0.3, 'bandpass', 4200, 1200, 0.3, 2, 0, 0.03)
      ring(o, 2900, 0.35, 0.05, 0.02)
      return
    case 'light':
      // 照夜：清亮的钟鸣
      noise(o, 0.25, 'highpass', 3000, 8000, 0.1, 0.8, 0, 0.04)
      for (const [f, g] of [
        [1568, 0.16],
        [2352, 0.09],
        [3136, 0.06],
        [4704, 0.03],
      ] as const)
        tone(o, f, f * 0.997, 1.1, 'sine', g, 0.02)
      return
    case 'superFinal':
      noise(o, 0.08, 'highpass', 6000, 3000, 0.55, 0.8)
      ring(o, 1100, 0.9, 0.16)
      noise(o, 0.5, 'bandpass', 1400, 200, 0.4, 0.7, 0.01)
      tone(o, 100, 36, 0.4, 'sine', 0.4)
      return
    case 'kill':
      noise(o, 0.07, 'highpass', 4800, 2800, 0.4, 0.9)
      noise(o, 0.3, 'bandpass', 1200, 300, 0.3, 0.8, 0.01)
      ring(o, 2100, 0.4, 0.06, 0.01)
      return
  }
}

export type Sfx = {
  unlock(): void
  consume(events: readonly GameEvent[]): void
  toggleMute(): boolean
  play(name: SfxName): void
}

export function createSfx(): Sfx {
  let ac: AudioContext | null = null
  let master: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null
  let muted = false
  const lastPlayed = new Map<string, number>()

  function unlock(): void {
    if (!ac) {
      const Ctor = window.AudioContext
      if (!Ctor) return
      ac = new Ctor()
      master = ac.createGain()
      master.gain.value = 0.6
      const comp = ac.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      master.connect(comp).connect(ac.destination)
      noiseBuf = makeNoise(ac)
    }
    if (ac.state === 'suspended') void ac.resume()
  }

  function out(): Out | null {
    if (!ac || !master || !noiseBuf || muted) return null
    return { ac, dest: master, noise: noiseBuf, t0: ac.currentTime }
  }

  function play(name: SfxName): void {
    const o = out()
    if (!o) return
    // 同一种声音 35ms 内只放一次，一刀砍中三只狼时不会炸音
    if (o.t0 - (lastPlayed.get(name) ?? -1) < 0.035) return
    lastPlayed.set(name, o.t0)
    synth(o, name, 0.94 + Math.random() * 0.12)
  }

  /** 非剑的小声音：脚步、预警、提示。 */
  function playMinor(e: GameEvent): void {
    const o = out()
    if (!o) return
    switch (e.type) {
      case 'jump':
        noise(o, 0.07, 'lowpass', 1400, 500, 0.08)
        return
      case 'land':
        noise(o, 0.05, 'lowpass', 700, 200, 0.12)
        return
      case 'dash':
        noise(o, 0.16, 'highpass', 3600, 1200, 0.16, 0.8, 0, 0.01)
        return
      case 'evade':
        tone(o, 1100, 2200, 0.1, 'sine', 0.06)
        return
      case 'telegraph':
        if (e.color === 'red') {
          tone(o, 180, 170, 0.22, 'square', 0.08)
          tone(o, 90, 88, 0.3, 'sine', 0.18)
        } else tone(o, 1500, 1500, 0.025, 'sine', 0.04)
        return
      case 'bounce':
        noise(o, 0.08, 'lowpass', 900, 200, 0.2)
        return
      case 'mpShort':
        tone(o, 240, 220, 0.09, 'square', 0.035)
        return
      case 'tech':
        tone(o, 800, 1400, 0.08, 'triangle', 0.07)
        return
      default:
        return
    }
  }

  function onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'swing':
        if (e.move === 'super') return
        if (e.move === 'light') play('light')
        else if (e.move === 'wave') play('wave')
        else play(e.heavy ? 'swingHeavy' : 'swing')
        return
      case 'hit':
        if (e.target === 'player') play('hurt')
        else if (e.crit) play('crit')
        else play(e.heavy ? 'hitHeavy' : 'hit')
        return
      case 'block':
        play(e.by === 'enemy' ? 'shield' : 'block')
        return
      case 'parry':
        play('parry')
        return
      case 'guardBreak':
        play('guardBreak')
        return
      case 'kill':
        play('kill')
        return
      case 'super':
        if (e.phase === 'final') play('superFinal')
        return
      default:
        playMinor(e)
    }
  }

  return {
    unlock,
    consume(events) {
      if (muted || !ac) return
      for (const e of events) onEvent(e)
    },
    toggleMute() {
      muted = !muted
      return muted
    },
    play,
  }
}

/**
 * 开发用：离线渲染一种声音，返回各频段能量占比（%）。
 * 我没法「听」，用它确认命中声的能量主要在中高频，而不是低频的「咚」。
 */
export async function analyzeSfx(name: SfxName): Promise<Record<string, number>> {
  const rate = 44100
  const ac = new OfflineAudioContext(1, Math.floor(rate * 0.6), rate)
  synth({ ac, dest: ac.destination, noise: makeNoise(ac), t0: 0 }, name)
  const buf = await ac.startRendering()
  const x = buf.getChannelData(0)
  const bands: [string, number, number][] = [
    ['<200Hz', 0, 200],
    ['200-800', 200, 800],
    ['800-2k', 800, 2000],
    ['2k-5k', 2000, 5000],
    ['>5k', 5000, 22050],
  ]
  const N = 1024
  const energy = bands.map(() => 0)
  for (let start = 0; start + N <= x.length; start += N) {
    for (let k = 1; k < N / 2; k++) {
      let re = 0
      let im = 0
      for (let n = 0; n < N; n++) {
        const v = x[start + n] ?? 0
        const a = (2 * Math.PI * k * n) / N
        re += v * Math.cos(a)
        im -= v * Math.sin(a)
      }
      const f = (k * rate) / N
      const e = re * re + im * im
      bands.forEach(([, lo, hi], i) => {
        if (f >= lo && f < hi) energy[i] = (energy[i] ?? 0) + e
      })
    }
  }
  const total = energy.reduce((a, b) => a + b, 0) || 1
  return Object.fromEntries(
    bands.map(([label], i) => [label, Math.round(((energy[i] ?? 0) / total) * 100)]),
  )
}
