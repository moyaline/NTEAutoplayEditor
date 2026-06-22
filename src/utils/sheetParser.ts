/**
 * sheetParser — NTE 乐谱 JSON 解析工具
 *
 * JSON 格式：
 * ```json
 * { "bpm": 96, "timeSignature": { "num": 4, "den": 4 }, "sheet": [...] }
 * ```
 * timeSignature 可选，默认 4/4。
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
  /** 显示编号 label（外部计算） */
  label: string
}

export interface SheetData {
  bpm: number
  timeSignature: { num: number; den: number }
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

/** 八度 → 前缀 */
const OCTAVE_PREFIX: Record<number, string> = {
  4: 'L',
  5: '',
  6: 'H',
}

/** note 名反向映射（KeyPad key → JSON note） */
const REVERSE_NOTE_MAP: Record<string, string> = {
  C: 'C', 'C#': 'Cs', D: 'D', Eb: 'Eb', E: 'E',
  F: 'F', 'F#': 'Fs', G: 'G', 'G#': 'Gs', A: 'A',
  Bb: 'Bb', B: 'B',
}

const NOTE_NAMES = ['C#', 'Eb', 'F#', 'G#', 'Bb', 'C', 'D', 'E', 'F', 'G', 'A', 'B']

/**
 * 将 KeyPad keyId 转回 JSON note 字符串
 * 例: "C#6" → "HCs", "Eb5" → "Eb", "F4" → "LF"
 */
export function keyIdToNote(keyId: string): string {
  for (const name of NOTE_NAMES) {
    if (keyId.startsWith(name)) {
      const octaveStr = keyId.slice(name.length)
      const octave = parseInt(octaveStr, 10)
      const prefix = OCTAVE_PREFIX[octave] ?? ''
      return `${prefix}${REVERSE_NOTE_MAP[name]!}`
    }
  }
  return keyId
}

/**
 * 将 JSON note 字符串转为 KeyPad keyId
 * 例: "HCs" → "C#6", "Eb" → "Eb5", "LF" → "F4"
 */
export function parseNoteToKeyId(note: string): string {
  let i = 0
  let octave = 5

  const firstChar = note[0]
  if (firstChar === 'H' || firstChar === 'L') {
    octave = PREFIX_OCTAVE[firstChar]!
    i++
  }

  const letter = note[i]
  if (!letter) return note
  const baseName = NOTE_MAP[letter]
  if (!baseName) return note
  i++

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
  num: number
  den: number
}

/**
 * 将小数转为最简分数
 * 例: 0.5 → {num: 1, den: 2}, 0.25 → {num: 1, den: 4}
 */
function decimalToFraction(value: number): Fraction {
  const tolerance = 1 / 1000000
  let num = 1
  let den = 1

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
 * 根据时间签名计算节拍所在的小节号（1-based）
 * @param cumulative 累计 nvr（全音符分数）
 * @param tsNum  拍号分子（每小节拍数）
 * @param tsDen  拍号分母（以几分音符为一拍）
 */
export function measureForCumulative(cumulative: number, tsNum: number, tsDen: number): number {
  // 一小节长度 = tsNum * (tsDen 分之一音符) = tsNum * (4/tsDen) 个四分音符 = tsNum/tsDen 个全音符
  const measureLen = tsNum / tsDen
  if (measureLen <= 0) return 1
  return Math.floor(cumulative / measureLen) + 1
}

/**
 * 生成新格式标签 "小节号 | nvr]"
 * 例: measure #2, nvr=1/8 → "2 | 1/8]"
 */
export function beatLabel(nvrNum: number, nvrDen: number, measure: number): string {
  return `${measure} | ${nvrNum}/${nvrDen}`
}

/**
 * 校验所有小节时值总和是否正确
 * 返回处于异常小节中的 beat 索引集合
 */
export function validateMeasures(beats: BeatData[], tsNum: number, tsDen: number): Set<number> {
  const invalid = new Set<number>()
  if (beats.length === 0) return invalid
  const measureLen = tsNum / tsDen
  if (measureLen <= 0) return invalid

  let measStartIdx = 0
  while (measStartIdx < beats.length) {
    let measCum = 0
    let idx = measStartIdx
    while (idx < beats.length) {
      const nvr = beats[idx]!.nvr
      // 单个 beat 超出小节长度
      if (nvr > measureLen + 0.0001) {
        // 如果是小节长度的整数倍则通过，否则标记
        const ratio = nvr / measureLen
        if (Math.abs(ratio - Math.round(ratio)) > 0.0001) {
          invalid.add(idx)
        }
        idx++
        break
      }
      const nextCum = measCum + nvr
      if (nextCum > measureLen + 0.0001) break
      measCum = nextCum
      idx++
    }
    if (idx > measStartIdx && Math.abs(measCum - measureLen) > 0.0001) {
      for (let i = measStartIdx; i < idx; i++) {
        invalid.add(i)
      }
    }
    measStartIdx = idx
  }
  return invalid
}

/**
 * 累积值 → 带分数显示字符串（兼容旧代码中使用的地方）
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
    const reduced = reduceFraction(num, den)
    num = reduced.num
    den = reduced.den
    return { num, den, value: num / den }
  }
  const nvr = (typeof raw === 'number' ? raw : 0.5)
  const f = decimalToFraction(nvr)
  return { num: f.num, den: f.den, value: nvr }
}

/**
 * 解析完整乐谱 JSON（兼容新旧 nvr 格式）
 */
export function parseSheet(json: {
  bpm?: number
  timeSignature?: { num?: number; den?: number }
  sheet?: { note?: string[]; nvr?: unknown }[]
}): SheetData {
  const bpm = json.bpm ?? 120
  const tsNum = json.timeSignature?.num ?? 4
  const tsDen = json.timeSignature?.den ?? 4
  const rawBeats = json.sheet ?? []
  const beats: BeatData[] = []
  let cumulative = 0

  for (let i = 0; i < rawBeats.length; i++) {
    const raw = rawBeats[i]!
    const rawNotes = raw.note ?? []
    const { num, den, value: nvr } = parseNvr(raw.nvr)
    const keys = rawNotes.map(parseNoteToKeyId)
    const measure = measureForCumulative(cumulative, tsNum, tsDen)

    beats.push({
      keys,
      rawNotes,
      nvr,
      num,
      den,
      cumulative,
      label: beatLabel(num, den, measure),
    })

    cumulative += nvr
  }

  return { bpm, timeSignature: { num: tsNum, den: tsDen }, beats }
}

/**
 * 创建默认空乐谱（8 个空 Beat），默认 4/4 拍
 */
export function createEmptySheet(): SheetData {
  const beats: BeatData[] = []
  let cumulative = 0
  const nvr = 0.125 // 默认八分拍（1/8）
  const tsNum = 4
  const tsDen = 4

  for (let i = 0; i < 8; i++) {
    const measure = measureForCumulative(cumulative, tsNum, tsDen)
    beats.push({
      keys: [],
      rawNotes: [],
      nvr,
      num: 1,
      den: 8,
      cumulative,
      label: beatLabel(1, 8, measure),
    })
    cumulative += nvr
  }

  return { bpm: 120, timeSignature: { num: tsNum, den: tsDen }, beats }
}

/**
 * 添加一个新的空 Beat
 */
export function addEmptyBeat(beats: BeatData[], tsNum = 4, tsDen = 4): BeatData[] {
  const lastBeat = beats.length > 0 ? beats[beats.length - 1] : undefined
  const lastNvr = lastBeat?.nvr ?? 0.125
  const lastCumulative = lastBeat ? lastBeat.cumulative + lastNvr : 0
  const newNum = 1
  const newDen = 8
  const newNvr = newNum / newDen
  const idx = beats.length + 1
  const measure = measureForCumulative(lastCumulative, tsNum, tsDen)

  return [
    ...beats,
    {
      keys: [],
      rawNotes: [],
      nvr: newNvr,
      num: newNum,
      den: newDen,
      cumulative: lastCumulative,
      label: beatLabel(newNum, newDen, measure),
    },
  ]
}
