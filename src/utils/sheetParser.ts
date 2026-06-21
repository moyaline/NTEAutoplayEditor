/**
 * sheetParser — NTE 乐谱 JSON 解析工具
 *
 * JSON 格式：
 * ```json
 * { "bpm": 96, "sheet": [{ "note": ["HD", "C", "LF"], "nvr": 0.5 }] }
 * ```
 * note 命名：
 *   - 前缀: H=高音(6), L=低音(4), 无=中音(5)
 *   - 字母: C D E F G A B
 *   - 后缀: s=升号(#), b=降号(b)
 * 例: "HCs" → C#6, "Eb" → Eb5, "LF" → F4
 *
 * Beat 编号：累积 nvr / 4 的约分带分数
 *   nvr=0.5  → 1/8 拍（八分之一）
 *   nvr=1    → 1/4 拍（四分之一）
 */

export interface BeatData {
  /** 该拍激活的按键 ID 列表，如 ["C5", "D#6", "Eb4"] */
  keys: string[]
  /** 原始 JSON note 列表 */
  rawNotes: string[]
  /** 原始 nvr 值（数值） */
  nvr: number
  /** nvr 分子 */
  num: number
  /** nvr 分母 */
  den: number
  /** 累计位置（nvr 累加和） */
  cumulative: number
  /** 显示编号，如 "0 1/8" */
  label: string
}

export interface SheetData {
  bpm: number
  beats: BeatData[]
}

// ─── 音符映射表 ──────────────────────────────────

/** JSON note → KeyPad 按键名 */
const NOTE_MAP: Record<string, string> = {
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
  A: 'A',
  B: 'B',
}

/** JSON 后缀 → KeyPad 升降号 */
const SUFFIX_MAP: Record<string, string> = {
  s: '#',
  b: 'b',
}

/** 前缀 → 八度 */
const PREFIX_OCTAVE: Record<string, number> = {
  H: 6,
  L: 4,
}

/**
 * 将 JSON note 字符串转为 KeyPad keyId
 * 例: "HCs" → "C#6", "Eb" → "Eb5", "LF" → "F4"
 */
export function parseNoteToKeyId(note: string): string {
  let i = 0
  let octave = 5 // 默认中音

  // 解析前缀
  const firstChar = note[0]
  if (firstChar === 'H' || firstChar === 'L') {
    octave = PREFIX_OCTAVE[firstChar]!
    i++
  }

  // 解析音名
  const letter = note[i]
  if (!letter) return note // fallback
  const baseName = NOTE_MAP[letter]
  if (!baseName) return note // fallback
  i++

  // 解析后缀
  let accidental = ''
  if (i < note.length) {
    const suffix = note[i]
    if (suffix) accidental = SUFFIX_MAP[suffix] ?? ''
  }

  return `${baseName}${accidental}${octave}`
}

// ─── 分数运算 ──────────────────────────────────

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b)
}

interface Fraction {
  num: number // 分子
  den: number // 分母
}

/**
 * 将小数转为最简分数
 * 例: 0.5 → {num: 1, den: 2}, 0.25 → {num: 1, den: 4}
 */
function decimalToFraction(value: number): Fraction {
  const tolerance = 1 / 1000000
  let num = 1
  let den = 1

  // 不断放大直到接近整数
  for (let i = 1; i <= 1000000; i *= 2) {
    const scaled = value * i
    const rounded = Math.round(scaled)
    if (Math.abs(scaled - rounded) < tolerance) {
      num = rounded
      den = i
      break
    }
  }

  const g = gcd(Math.abs(num), den)
  return { num: num / g, den: den / g }
}

/**
 * 数值 → 显示用最简分数
 * 累积值直接按全音符分数显示
 */
function nvrToDisplayFraction(value: number): Fraction {
  return decimalToFraction(value)
}

/**
 * 累积值 → 带分数显示字符串
 * 例: 0.5 → "0 1/8", 1.0 → "0 1/4", 4.0 → "1", 5.5 → "1 3/8"
 * 始终显示带分数格式（含 0 整数部分）
 */
export function cumulativeToLabel(cumulative: number): string {
  if (cumulative === 0) return '0'

  const f = nvrToDisplayFraction(cumulative)
  const wholePart = Math.floor(f.num / f.den)
  const fracNum = f.num % f.den

  if (fracNum === 0) return `${wholePart}`
  return `${wholePart} ${fracNum}/${f.den}`
}

// ─── 核心解析 ──────────────────────────────────

/** 约分分数 */
export function reduceFraction(num: number, den: number): { num: number; den: number } {
  const g = gcd(Math.abs(num), Math.abs(den))
  return { num: num / g, den: den / g }
}

/**
 * 解析单条 nvr 值，支持 {num, den} 对象和纯数字
 */
export function parseNvr(raw: unknown): { num: number; den: number; value: number } {
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, number>
    let num = r.num ?? 1
    let den = r.den ?? 8
    // 约分
    const reduced = reduceFraction(num, den)
    num = reduced.num
    den = reduced.den
    return { num, den, value: num / den }
  }
  const nvr = (typeof raw === 'number' ? raw : 0.5)
  // 转为分数
  const f = decimalToFraction(nvr)
  return { num: f.num, den: f.den, value: nvr }
}

/**
 * 解析完整乐谱 JSON（兼容新旧 nvr 格式）
 */
export function parseSheet(json: { bpm?: number; sheet?: { note?: string[]; nvr?: unknown }[] }): SheetData {
  const bpm = json.bpm ?? 120
  const rawBeats = json.sheet ?? []
  const beats: BeatData[] = []
  let cumulative = 0

  for (const raw of rawBeats) {
    const rawNotes = raw.note ?? []
    const { num, den, value: nvr } = parseNvr(raw.nvr)
    const keys = rawNotes.map(parseNoteToKeyId)

    beats.push({
      keys,
      rawNotes,
      nvr,
      num,
      den,
      cumulative,
      label: cumulativeToLabel(cumulative + nvr),
    })

    cumulative += nvr
  }

  return { bpm, beats }
}

/**
 * 创建默认空乐谱（8 个空 Beat）
 */
export function createEmptySheet(): SheetData {
  const beats: BeatData[] = []
  let cumulative = 0
  const nvr = 0.125 // 默认八分拍（1/8）

  for (let i = 0; i < 8; i++) {
    beats.push({
      keys: [],
      rawNotes: [],
      nvr,
      num: 1,
      den: 8,
      cumulative,
      label: cumulativeToLabel(cumulative + nvr),
    })
    cumulative += nvr
  }

  return { bpm: 120, beats }
}

/**
 * 添加一个新的空 Beat
 */
export function addEmptyBeat(beats: BeatData[]): BeatData[] {
  const lastBeat = beats.length > 0 ? beats[beats.length - 1] : undefined
  const lastNvr = lastBeat?.nvr ?? 0.125
  const lastCumulative = lastBeat ? lastBeat.cumulative + lastNvr : 0
  const newNum = 1
  const newDen = 8
  const newNvr = newNum / newDen

  return [
    ...beats,
    {
      keys: [],
      rawNotes: [],
      nvr: newNvr,
      num: newNum,
      den: newDen,
      cumulative: lastCumulative,
      label: cumulativeToLabel(lastCumulative + newNvr),
    },
  ]
}
