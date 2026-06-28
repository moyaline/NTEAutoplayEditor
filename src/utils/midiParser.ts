/**
 * midiParser — MIDI 文件解析工具
 *
 * 将 .mid / .midi 二进制文件解析为中间音轨 JSON 格式 (MidiProject)。
 * 底层依赖 midi-file 库处理 MIDI 二进制协议。
 */

import { parseMidi } from 'midi-file'
import type { MidiProject, MidiTrack, MidiNote, MidiMetadata } from '@/types/midi'

/** MIDI note → 秒 */
function ticksToSeconds(ticks: number, ticksPerQuarter: number, bpm: number): number {
  const quarterMs = 60000 / bpm
  return (ticks / ticksPerQuarter) * quarterMs / 1000
}

/** 从 MIDI 事件中提取 BPM */
function extractBpm(trackEvents: any[]): number {
  for (const ev of trackEvents) {
    if (ev.type === 'setTempo' && ev.microsecondsPerBeat) {
      return Math.round(60000000 / ev.microsecondsPerBeat)
    }
  }
  return 120
}

/** 从 MIDI 事件中提取拍号 */
function extractTimeSignature(trackEvents: any[]): { num: number; den: number } {
  for (const ev of trackEvents) {
    if (ev.type === 'timeSignature') {
      return { num: ev.numerator ?? 4, den: ev.denominator ?? 4 }
    }
  }
  return { num: 4, den: 4 }
}

/** 从 MIDI 事件中提取轨道名称 */
function extractTrackName(trackEvents: any[]): string {
  for (const ev of trackEvents) {
    if (ev.type === 'trackName') return ev.text ?? '未命名'
  }
  return '未命名'
}

/** 判断是否为打击乐轨道（通道 9 / channel 10，MIDI 标准） */
function isPercussionChannel(channel: number): boolean {
  return channel === 9
}

/**
 * 将 ArrayBuffer 或 Uint8Array 格式的 MIDI 文件解析为 MidiProject
 */
export function parseMidiFile(data: ArrayBuffer | Uint8Array): MidiProject {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
  const midi = parseMidi(bytes)

  const format = midi.header?.format ?? 1
  const ticksPerQuarter = midi.header?.ticksPerBeat ?? 480

  // 从所有轨道中收集元数据（通常在第一个轨道）
  const allEvents = midi.tracks.flat()
  const targetBpm = extractBpm(allEvents)
  const timeSig = extractTimeSignature(allEvents)

  const metadata: MidiMetadata = {
    originalFormat: format,
    ticksPerQuarter,
    targetBpm,
    timeSignature: timeSig,
  }

  // 解析每条轨道
  const tracks: MidiTrack[] = midi.tracks.map((trackEvents: any[], index: number) => {
    const name = extractTrackName(trackEvents)
    const notes: MidiNote[] = []

    // 累积绝对 tick 位置（事件存储的是 deltaTime）
    let absoluteTick = 0
    // 先收集 NOTE_ON / NOTE_OFF 事件
    const activeNotes = new Map<number, { startTick: number; velocity: number; channel: number }>()

    for (const ev of trackEvents) {
      // 累积 deltaTime 得到绝对 tick
      absoluteTick += ev.deltaTime ?? 0

      if (ev.type === 'noteOn' && ev.velocity > 0) {
        // Note On
        activeNotes.set(ev.noteNumber, {
          startTick: absoluteTick,
          velocity: ev.velocity,
          channel: ev.channel ?? 0,
        })
      } else if (ev.type === 'noteOff' || (ev.type === 'noteOn' && ev.velocity === 0)) {
        // Note Off (or Note On with velocity 0)
        const active = activeNotes.get(ev.noteNumber)
        if (active) {
          activeNotes.delete(ev.noteNumber)
          const startSec = ticksToSeconds(active.startTick, ticksPerQuarter, targetBpm)
          const endSec = ticksToSeconds(absoluteTick, ticksPerQuarter, targetBpm)
          const durationSec = Math.max(0.01, endSec - startSec) // 最小 10ms

          const note: MidiNote = {
            midi: ev.noteNumber,
            startSec: Math.round(startSec * 1000) / 1000,
            durationSec: Math.round(durationSec * 1000) / 1000,
            velocity: active.velocity,
            channel: active.channel,
          }
          notes.push(note)
        }
      }
    }

    // 按 startSec 排序
    notes.sort((a, b) => a.startSec - b.startSec || a.midi - b.midi)

    return {
      index,
      name,
      notes,
    }
  }).filter(t => t.notes.length > 0) // 过滤掉空轨道

  return { metadata, tracks }
}

/**
 * 导出中间文件为 JSON 字符串
 */
export function exportMidiProject(project: MidiProject): string {
  return JSON.stringify(project, null, 2)
}

/**
 * 从 JSON 字符串解析中间文件。
 * 校验数据结构，只有包含 metadata 和 tracks 的 JSON 才视为合法的中间文件。
 */
export function parseMidiProject(json: string): MidiProject {
  const obj = JSON.parse(json)
  if (!obj || typeof obj !== 'object') throw new Error('非法的中间文件格式')
  if (!obj.metadata || typeof obj.metadata !== 'object') throw new Error('缺少 metadata')
  if (!Array.isArray(obj.tracks)) throw new Error('缺少 tracks 数组')
  return obj as MidiProject
}
