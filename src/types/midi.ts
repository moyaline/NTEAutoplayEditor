/**
 * MIDI 中间格式类型定义
 *
 * 此格式是 MIDI 文件解析后的中间表示，可由用户编辑/下载，
 * 并通过转换算法转为 SheetData 供编辑器渲染。
 */

/** 单个音符事件 */
export interface MidiNote {
  midi: number
  startSec: number
  durationSec: number
  velocity?: number
  channel?: number
}

/** 单条音轨 */
export interface MidiTrack {
  index: number
  name: string
  notes: MidiNote[]
}

/** 中间格式元数据 */
export interface MidiMetadata {
  originalFormat: number
  ticksPerQuarter: number
  targetBpm: number
  timeSignature: { num: number; den: number }
}

/** 完整中间音轨 JSON 文件结构 */
export interface MidiProject {
  metadata: MidiMetadata
  tracks: MidiTrack[]
}

/** 轨道选择状态 */
export interface TrackSelection {
  index: number
  name: string
  noteCount: number
  selected: boolean
  lowestPitch: number
  highestPitch: number
  isPercussion: boolean
}
