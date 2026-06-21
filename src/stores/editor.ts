/**
 * editor store —— 编辑器全局状态
 *
 * 管理乐谱数据、选中 Beat、文件操作。
 * AppHeader 和 EditorView 共享此 store。
 */

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { createEmptySheet, addEmptyBeat, parseSheet, cumulativeToLabel, reduceFraction } from '@/utils/sheetParser'
import type { SheetData, BeatData } from '@/utils/sheetParser'
import { playNote } from '@/utils/notePlayer'
import { load, save } from '@/utils/storage'

export const useEditorStore = defineStore('editor', () => {
  // ─── 状态（从 localStorage 初始化） ──────

  const sheetData = ref<SheetData>(createEmptySheet())
  const selectedBeatIndex = ref<number | null>(0)
  const fileName = ref('未命名乐谱')
  const isNewFile = ref(true)
  const soundEnabled = ref(load('soundEnabled', true))
  const soundVolume = ref(load('soundVolume', 0.5))
  /** 移动端默认 1 行，桌面端 2 行 */
  const defaultRows = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2
  const rowsPerPage = ref(load('rowsPerPage', defaultRows))

  // ─── 持久化：设置变化时自动写入 localStorage ──
  watch(soundEnabled, v => save('soundEnabled', v))
  watch(soundVolume, v => save('soundVolume', v))
  watch(rowsPerPage, v => save('rowsPerPage', v))

  // 播放状态
  const isPlaying = ref(false)
  let playTimer: ReturnType<typeof setTimeout> | null = null

  // ─── 计算属性 ───────────────────────────

  const beats = computed(() => sheetData.value.beats)
  const bpm = computed(() => sheetData.value.bpm)

  const activeKeys = computed(() => {
    if (selectedBeatIndex.value === null) return []
    const beat = sheetData.value.beats[selectedBeatIndex.value]
    return beat?.keys ?? []
  })

  /** 当前选中 Beat 的 nvr 信息 */
  const currentNvr = computed(() => {
    if (selectedBeatIndex.value === null) return { num: 1, den: 2, value: 0.5 }
    const beat = sheetData.value.beats[selectedBeatIndex.value]
    if (!beat) return { num: 1, den: 8, value: 0.125 }
    return { num: beat.num, den: beat.den, value: beat.nvr }
  })

  // ─── 播放控制 ───────────────────────────

  /** 播放指定拍的所有激活音符 */
  function playBeatNotes(index: number) {
    const beat = beats.value[index]
    if (beat) {
      beat.keys.forEach(key => playNote(key))
    }
  }

  /** 内部推进播放（不触发定时器重排） */
  function _advanceBeat(index: number) {
    selectedBeatIndex.value = index
    playBeatNotes(index)
  }

  /** 公开选拍：播放中会重排定时器 */
  function selectBeat(index: number | null) {
    selectedBeatIndex.value = index
    if (isPlaying.value) {
      rescheduleTimer()
    }
  }

  function firstBeat() {
    if (beats.value.length > 0) selectBeat(0)
  }

  function prevBeat() {
    if (selectedBeatIndex.value === null || selectedBeatIndex.value <= 0) return
    selectBeat(selectedBeatIndex.value - 1)
  }

  function nextBeat() {
    if (selectedBeatIndex.value === null) return
    if (selectedBeatIndex.value >= beats.value.length - 1) return
    selectBeat(selectedBeatIndex.value + 1)
  }

  function lastBeat() {
    if (beats.value.length > 0) selectBeat(beats.value.length - 1)
  }

  function togglePlay() {
    if (isPlaying.value) {
      stopPlay()
    } else {
      startPlay()
    }
  }

  function startPlay() {
    if (beats.value.length === 0) return
    // 如果没有选中 Beat 或已在最后一拍，从头开始
    if (selectedBeatIndex.value === null || selectedBeatIndex.value >= beats.value.length - 1) {
      selectBeat(0)
    }
    // 播放当前拍的音符
    const cur = selectedBeatIndex.value
    if (cur !== null) playBeatNotes(cur)
    isPlaying.value = true
    scheduleNext()
  }

  /** 递归调度下一拍（每个 Beat 的 nvr 时值可能不同） */
  function scheduleNext() {
    if (!isPlaying.value) return
    const idx = selectedBeatIndex.value
    if (idx === null || idx >= beats.value.length - 1) {
      stopPlay()
      return
    }
    const beat = beats.value[idx]
    if (!beat) { stopPlay(); return }

    // 时值 = (240000 / BPM) * nvr  （毫秒）
    // 说明: 1 个全音符 = 4 个四分音符 = 4 * 60000/BPM ms
    //       nvr 是全音符的分数，所以 delay = 240000/BPM * nvr
    const delay = (240000 / bpm.value) * beat.nvr

    playTimer = window.setTimeout(() => {
      if (!isPlaying.value) return
      _advanceBeat(idx + 1)
      scheduleNext()
    }, delay)
  }

  /** 重排定时器（用户手动切换 Beat 时调用） */
  function rescheduleTimer() {
    if (playTimer !== null) {
      clearTimeout(playTimer)
      playTimer = null
    }
    scheduleNext()
  }

  function stopPlay() {
    isPlaying.value = false
    if (playTimer !== null) {
      clearTimeout(playTimer)
      playTimer = null
    }
  }

  // ─── Beat 编辑 ─────────────────────────

  function toggleNoteKey(keyId: string) {
    if (selectedBeatIndex.value === null) return
    const beat = sheetData.value.beats[selectedBeatIndex.value]
    if (!beat) return

    const idx = beat.keys.indexOf(keyId)
    if (idx >= 0) {
      beat.keys.splice(idx, 1)
    } else {
      beat.keys.push(keyId)
    }
    sheetData.value = { ...sheetData.value }
  }

  function addBeat() {
    sheetData.value = {
      ...sheetData.value,
      beats: addEmptyBeat(sheetData.value.beats),
    }
  }

  /** 更新当前 Beat 的 nvr */
  function updateNvr(num: number, den: number) {
    if (selectedBeatIndex.value === null) return
    const beat = sheetData.value.beats[selectedBeatIndex.value]
    if (!beat) return
    // 约分
    const r = reduceFraction(num, den)
    beat.num = r.num
    beat.den = r.den
    beat.nvr = r.num / r.den
    // 重算所有 beat 的 cumulative 和 label
    recalcAllLabels()
    sheetData.value = { ...sheetData.value }
  }

  /** nvr 减半（分母 ×2，分母上限 32 时改为分子 ÷2） */
  function nvrHalve() {
    const { num, den } = currentNvr.value
    if (den * 2 <= 32) {
      updateNvr(num, den * 2)
    } else {
      updateNvr(Math.max(1, Math.ceil(num / 2)), den)
    }
  }

  /** nvr 加倍（分子 ×2） */
  function nvrDouble() {
    const { num, den } = currentNvr.value
    updateNvr(num * 2, den)
  }

  /** 重算所有 beat 的 cumulative 和 label */
  function recalcAllLabels() {
    let cum = 0
    for (const beat of beats.value) {
      beat.cumulative = cum
      beat.label = cumulativeToLabel(cum + beat.nvr)
      cum += beat.nvr
    }
  }

  // ─── 文件操作 ─────────────────────────

  function loadSheet(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr)
      const sheet = parseSheet(parsed)
      sheetData.value = sheet
      selectedBeatIndex.value = 0
      isNewFile.value = false
      stopPlay()
    } catch (e) {
      console.error('乐谱解析失败:', e)
      throw e
    }
  }

  function newSheet() {
    sheetData.value = createEmptySheet()
    selectedBeatIndex.value = 0
    isNewFile.value = true
    fileName.value = '未命名乐谱'
    stopPlay()
  }

  /** 更新 BPM */
  function setBpm(val: number) {
    sheetData.value = { ...sheetData.value, bpm: Math.max(20, Math.min(300, val)) }
  }

  /** 导出乐谱为 JSON 字符串 */
  function exportSheet(): string {
    const data = {
      bpm: sheetData.value.bpm,
      sheet: sheetData.value.beats.map(b => ({
        note: b.rawNotes.length > 0 ? b.rawNotes : b.keys.map(k => k),
        nvr: { num: b.num, den: b.den },
      })),
    }
    return JSON.stringify(data, null, 4)
  }

  return {
    sheetData,
    selectedBeatIndex,
    fileName,
    isNewFile,
    beats,
    bpm,
    activeKeys,
    currentNvr,
    soundEnabled,
    soundVolume,
    rowsPerPage,
    isPlaying,
    selectBeat,
    firstBeat,
    prevBeat,
    nextBeat,
    lastBeat,
    togglePlay,
    stopPlay,
    rescheduleTimer,
    toggleNoteKey,
    addBeat,
    updateNvr,
    nvrHalve,
    nvrDouble,
    loadSheet,
    newSheet,
    setBpm,
    exportSheet,
  }
})
