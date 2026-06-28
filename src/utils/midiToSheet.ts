/**
 * midiToSheet — 中间音轨 → 乐谱格式转换算法
 *
 * 将选中的 MIDI 音轨（MidiTrack[]）转换为编辑器可渲染的 SheetData。
 *
 * 转换策略：
 * 1. 量化所有音符到时间网格
 * 2. 在每个时间位置按音高分离声部（旋律 / 伴奏）
 * 3. 分别将各声部移调到 C4–B6 范围
 * 4. 合并生成 beat 序列
 */

import type { SheetData, BeatData } from '@/utils/sheetParser'
import type { MidiTrack, MidiNote } from '@/types/midi'
import { reduceFraction, beatLabel, measureForCumulative, cumulativeToLabel } from '@/utils/sheetParser'

export interface ConversionOptions {
  /** 目标 BPM（不指定则用 metadata 中的值） */
  bpm?: number
  /** 量化粒度分母（默认 64 = 1/64 拍） */
  quantizationDen?: number
  /** 每个和弦中分配给旋律声部的最多音符数（默认 2） */
  melodyVoices?: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] as const
/** KeyPad 支持的音域：C4 (midi 48) ~ B6 (midi 83) */
const KEYPAD_MIN_MIDI = 48
const KEYPAD_MAX_MIDI = 83

/**
 * 将 MIDI note 编号转为 KeyPad keyId
 * KeyPad 的八度编号比科学音高编号大 1：
 *   MIDI 48 = C3(科学) → KeyPad C4
 *   MIDI 60 = C4(科学) → KeyPad C5
 *   MIDI 72 = C5(科学) → KeyPad C6
 */
function midiToKeyId(midi: number): string {
  if (midi < KEYPAD_MIN_MIDI || midi > KEYPAD_MAX_MIDI) return ''
  const octave = Math.floor(midi / 12) // KeyPad 八度 = 科学八度 + 1
  const noteIndex = midi % 12
  const noteName = NOTE_NAMES[noteIndex]
  if (!noteName) return ''
  return `${noteName}${octave}`
}

/**
 * 将秒转换为全音符位置（基于 BPM）
 */
function secondsToWholeNote(sec: number, bpm: number): number {
  return sec * bpm / 240
}

/**
 * 计算将一批 MIDI 音符移调到目标范围的最佳 octave 偏移
 * 策略：使尽可能多的音符落在 [targetMin, targetMax] 内
 */
function bestOctaveShift(notes: number[], targetMin: number, targetMax: number): number {
  if (notes.length === 0) return 0
  let bestShift = 0
  let bestCount = 0

  for (let shift = -3; shift <= 3; shift++) {
    const octShift = shift * 12
    let count = 0
    for (const n of notes) {
      const shifted = n + octShift
      if (shifted >= targetMin && shifted <= targetMax) count++
    }
    if (count > bestCount) {
      bestCount = count
      bestShift = octShift
    } else if (count === bestCount && count > 0) {
      if (Math.abs(shift) < Math.abs(bestShift / 12)) {
        bestShift = octShift
      }
    }
  }
  return bestShift
}

// ─── 声部分离 ──────────────────────────────────

interface VoiceGroup {
  label: string
  notes: { midi: number; quantPos: number }[]
  octaveShift: number
}

/**
 * 改进的声部分离算法。
 *
 * 核心思路：
 * 1. 全局分析所有音符的音高分布，找到一个「分割边界」。
 *    边界以下 → 明确属于伴奏/低音区；
 *    边界以上 → 旋律候选。
 * 2. 在每个时间位置上：
 *    - 只有 1–2 个音符 → 全部归旋律
 *    - 3+ 个音符 → 边界以下的归伴奏；边界以上的取最高 N 个作旋律，其余归伴奏
 * 3. 分割边界的计算：
 *    - 取所有音高的 25 百分位（lower quartile）作为伴奏上限
 *    - 但至少保留 MIDI 48（C4）以上的音符给旋律
 */
function computeSplitBoundary(allMidis: number[]): number {
  if (allMidis.length === 0) return 60
  const sorted = [...allMidis].sort((a, b) => a - b)
  // 25 百分位
  const qIndex = Math.floor(sorted.length * 0.25)
  const quartile = sorted[qIndex] ?? sorted[0]!
  // 边界至少保留 C4 (48) 以上的空间给旋律
  return Math.max(48, quartile)
}

function splitVoices(
  quantized: { midi: number; quantPos: number }[],
  melodyVoices: number,
): { melody: VoiceGroup; accompaniment: VoiceGroup } {
  const allMidis = quantized.map(n => n.midi)
  const splitBoundary = computeSplitBoundary(allMidis)

  // 按时间位置分组
  const posGroups = new Map<number, number[]>()
  for (const q of quantized) {
    if (!posGroups.has(q.quantPos)) posGroups.set(q.quantPos, [])
    posGroups.get(q.quantPos)!.push(q.midi)
  }

  const melodyNotes: { midi: number; quantPos: number }[] = []
  const accompNotes: { midi: number; quantPos: number }[] = []

  for (const [pos, midis] of posGroups) {
    const sorted = [...midis].sort((a, b) => b - a) // 高音在前

    if (sorted.length <= 2) {
      // 只有 1–2 个音符，全部视为旋律
      for (const m of sorted) melodyNotes.push({ midi: m, quantPos: pos })
      continue
    }

    // 3+ 个音符：分离伴奏
    const aboveBorder = sorted.filter(m => m > splitBoundary)
    const belowBorder = sorted.filter(m => m <= splitBoundary)

    // 边界以下的全部归伴奏
    for (const a of belowBorder) accompNotes.push({ midi: a, quantPos: pos })

    // 边界以上的：取最高 melodyVoices 个作旋律，其余归伴奏
    const mel = aboveBorder.slice(0, melodyVoices)
    const acc = aboveBorder.slice(melodyVoices)

    for (const m of mel) melodyNotes.push({ midi: m, quantPos: pos })
    for (const a of acc) accompNotes.push({ midi: a, quantPos: pos })
  }

  // 没有伴奏时全部归旋律
  if (accompNotes.length === 0) {
    return {
      melody: { label: '旋律', notes: [...quantized], octaveShift: 0 },
      accompaniment: { label: '伴奏', notes: [], octaveShift: 0 },
    }
  }

  // 没有旋律时（极端情况）把最高的音符分给旋律
  if (melodyNotes.length === 0 && accompNotes.length > 0) {
    const sorted = [...accompNotes].sort((a, b) => b.midi - a.midi)
    melodyNotes.push(sorted[0]!)
    accompNotes.splice(accompNotes.indexOf(sorted[0]!), 1)
  }

  return {
    melody: { label: '旋律', notes: melodyNotes, octaveShift: 0 },
    accompaniment: { label: '伴奏', notes: accompNotes, octaveShift: 0 },
  }
}

/**
 * 将 MIDI 音轨（选中多个）转换为 SheetData
 */
export function midiTracksToSheet(
  tracks: MidiTrack[],
  metadata: { targetBpm: number; timeSignature: { num: number; den: number } },
  options: ConversionOptions = {},
): SheetData {
  const bpm = options.bpm ?? metadata.targetBpm
  const quantDen = options.quantizationDen ?? 64
  const quantValue = 1 / quantDen
  const melodyVoices = options.melodyVoices ?? 2
  const tsNum = metadata.timeSignature.num
  const tsDen = metadata.timeSignature.den

  // 1. 收集所有音符（不限范围）
  const allRaw: { midi: number; startSec: number }[] = []
  for (const track of tracks) {
    for (const note of track.notes) {
      allRaw.push({ midi: note.midi, startSec: note.startSec })
    }
  }

  if (allRaw.length === 0) {
    return { bpm, timeSignature: { num: tsNum, den: tsDen }, beats: [] }
  }

  allRaw.sort((a, b) => a.startSec - b.startSec || a.midi - b.midi)

  // 2. 量化到网格
  const quantized: { midi: number; quantPos: number }[] = allRaw.map(n => {
    const wnPos = secondsToWholeNote(n.startSec, bpm)
    const quantPos = Math.round(wnPos / quantValue) * quantValue
    return { midi: n.midi, quantPos }
  })

  // 3. 声部分离
  const { melody, accompaniment } = splitVoices(quantized, melodyVoices)

  // 4. 分别计算最佳移调
  const melodyMidis = melody.notes.map(n => n.midi)
  const accompMidis = accompaniment.notes.map(n => n.midi)

  if (melodyMidis.length > 0) {
    melody.octaveShift = bestOctaveShift(melodyMidis, KEYPAD_MIN_MIDI, KEYPAD_MAX_MIDI)
  }
  if (accompMidis.length > 0) {
    accompaniment.octaveShift = bestOctaveShift(accompMidis, KEYPAD_MIN_MIDI, KEYPAD_MAX_MIDI)
  }

  // 5. 应用移调并收集可用的 keyId
  type KeyEntry = { quantPos: number; keyId: string }
  const allKeys: KeyEntry[] = []

  function applyVoice(group: VoiceGroup) {
    for (const n of group.notes) {
      const shifted = n.midi + group.octaveShift
      const keyId = midiToKeyId(shifted)
      if (keyId) {
        allKeys.push({ quantPos: n.quantPos, keyId })
      }
    }
  }

  applyVoice(melody)
  applyVoice(accompaniment)

  // 6. 按量化位置分组合并 keyId
  const groups = new Map<number, Set<string>>()
  for (const entry of allKeys) {
    if (!groups.has(entry.quantPos)) groups.set(entry.quantPos, new Set())
    groups.get(entry.quantPos)!.add(entry.keyId)
  }

  const sortedPositions = Array.from(groups.keys()).sort((a, b) => a - b)

  // 7. 生成 beats
  const beats: BeatData[] = []
  let cumulative = 0

  for (let i = 0; i < sortedPositions.length; i++) {
    const pos = sortedPositions[i]!
    const keys = Array.from(groups.get(pos)!).sort()

    let nvr: number
    if (i < sortedPositions.length - 1) {
      const nextPos = sortedPositions[i + 1]!
      const rawNvr = nextPos - pos
      nvr = quantizeNvr(rawNvr, quantDen)
    } else {
      nvr = quantValue
    }

    if (nvr <= 0) nvr = quantValue

    const reduced = reduceFractionToNumDen(nvr)
    const measure = measureForCumulative(cumulative, tsNum, tsDen)

    beats.push({
      keys,
      rawNotes: [],
      nvr,
      num: reduced.num,
      den: reduced.den,
      cumulative,
      label: beatLabel(reduced.num, reduced.den, measure),
    })

    cumulative += nvr
  }

  // 8. 重新计算 label
  let cum = 0
  for (const beat of beats) {
    beat.cumulative = cum
    beat.label = cumulativeToLabel(cum + beat.nvr)
    cum += beat.nvr
  }

  return { bpm, timeSignature: { num: tsNum, den: tsDen }, beats }
}

/**
 * 将 nvr 值量化为最接近的分数
 */
function quantizeNvr(raw: number, maxDen: number): number {
  // 尝试找到最接近的分数，分母不超过 maxDen
  let bestNum = 1
  let bestDen = maxDen
  let bestDiff = Infinity

  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(raw * den)
    const value = num / den
    const diff = Math.abs(value - raw)
    if (diff < bestDiff) {
      bestDiff = diff
      bestNum = num
      bestDen = den
    }
  }

  // 如果量化后为 0，返回最小粒度
  if (bestNum <= 0) return 1 / maxDen

  return bestNum / bestDen
}

/**
 * 将 nvr 数值约分为分子分母
 */
function reduceFractionToNumDen(value: number): { num: number; den: number } {
  // 尝试常见分母
  const denominators = [1, 2, 4, 8, 16, 32, 64]
  for (const den of denominators) {
    const num = Math.round(value * den)
    if (Math.abs(num / den - value) < 0.001) {
      const r = reduceFraction(num, den)
      return { num: r.num, den: r.den }
    }
  }
  // 回退
  const num = Math.round(value * 32)
  const r = reduceFraction(Math.max(1, num), 32)
  return { num: r.num, den: r.den }
}
