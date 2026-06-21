/**
 * editor store —— 编辑器全局状态
 *
 * 管理乐谱数据、选中 Beat、文件操作。
 * AppHeader 和 EditorView 共享此 store。
 */

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { createEmptySheet, addEmptyBeat, parseSheet, cumulativeToLabel, reduceFraction } from '@/utils/sheetParser'
import type { SheetData } from '@/utils/sheetParser'
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
  const defaultRows = typeof window !== 'undefined' && window.innerHeight <= 500 ? 1 : 2
  const rowsPerPage = ref(load('rowsPerPage', defaultRows))
  const playFollow = ref(load('playFollow', true))

  // ─── 持久化 ──
  watch(soundEnabled, v => save('soundEnabled', v))
  watch(soundVolume, v => save('soundVolume', v))
  watch(rowsPerPage, v => save('rowsPerPage', v))
  watch(playFollow, v => save('playFollow', v))

  // ─── 编辑状态 ──
  const isDirty = ref(false)
  const showSaveDialog = ref(false)
  let pendingAction: (() => void) | null = null

  function markDirty() { isDirty.value = true }

  function confirmSaveBefore(action: () => void) {
    if (isDirty.value) {
      pendingAction = action
      showSaveDialog.value = true
    } else {
      action()
    }
  }

  function saveAndProceed() {
    downloadSheet()
    showSaveDialog.value = false
    const action = pendingAction
    pendingAction = null
    action?.()
  }

  function discardAndProceed() {
    showSaveDialog.value = false
    const action = pendingAction
    pendingAction = null
    action?.()
  }

  function cancelAction() {
    showSaveDialog.value = false
    pendingAction = null
  }

  function downloadSheet() {
    const json = exportSheet()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName.value || '未命名乐谱'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 播放状态
  const isPlaying = ref(false)
  let playTimer: ReturnType<typeof setTimeout> | null = null

  /** 当前正在播放的 Beat 索引（用于进度条动画） */
  const playingBeatIndex = ref<number | null>(null)
  /** 当前播放进度 0‑1 */
  const playingProgress = ref(0)
  /** 已播放完但仍显示进度条（延迟 1 秒 + 渐隐）的 Beat 索引列表 */
  const fadingBeatIndices = ref<number[]>([])
  const fadingTimers = new Map<number, ReturnType<typeof setTimeout>>()
  let progressRAF: number | null = null
  let progressStartTime = 0
  let progressDuration = 0

  function startProgress(index: number, durationMs: number) {
    // 将当前 Beat 加入 fading 列表（独立计时）
    if (playingBeatIndex.value !== null && playingBeatIndex.value !== index) {
      const old = playingBeatIndex.value
      if (!fadingBeatIndices.value.includes(old)) {
        fadingBeatIndices.value = [...fadingBeatIndices.value, old]
      }
      // 清除该 beat 之前可能残留的 timer
      const prev = fadingTimers.get(old)
      if (prev) clearTimeout(prev)
      // 1 秒后移出 fading 列表（CSS 渐隐在 BeatView 中由 opacity transition 处理）
      fadingTimers.set(old, setTimeout(() => {
        fadingBeatIndices.value = fadingBeatIndices.value.filter(i => i !== old)
        fadingTimers.delete(old)
      }, 100))
    }
    // 停止旧动画
    if (progressRAF !== null) {
      cancelAnimationFrame(progressRAF)
      progressRAF = null
    }
    playingBeatIndex.value = index
    playingProgress.value = 0
    progressStartTime = performance.now()
    progressDuration = durationMs

    function tick() {
      if (!isPlaying.value) return
      const elapsed = performance.now() - progressStartTime
      playingProgress.value = Math.min(1, elapsed / progressDuration)
      if (playingProgress.value < 1) {
        progressRAF = requestAnimationFrame(tick)
      }
    }
    progressRAF = requestAnimationFrame(tick)
  }

  function stopProgress() {
    if (progressRAF !== null) {
      cancelAnimationFrame(progressRAF)
      progressRAF = null
    }
    for (const t of fadingTimers.values()) clearTimeout(t)
    fadingTimers.clear()
    playingBeatIndex.value = null
    playingProgress.value = 0
    fadingBeatIndices.value = []
  }

  /** 翻页时强行清除遗留进度条（无渐隐动画） */
  function forceClearFading() {
    for (const t of fadingTimers.values()) clearTimeout(t)
    fadingTimers.clear()
    fadingBeatIndices.value = []
  }

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
    if (playFollow.value) {
      selectedBeatIndex.value = index
    }
    playBeatNotes(index)
    const beat = beats.value[index]
    if (beat) {
      const duration = (240000 / bpm.value) * beat.nvr
      startProgress(index, duration)
    }
  }

  /** 公开选拍：播放中是否重排由 playFollow 决定 */
  function selectBeat(index: number | null) {
    selectedBeatIndex.value = index
    if (isPlaying.value && index !== null && playFollow.value) {
      const beat = beats.value[index]
      if (beat) {
        playBeatNotes(index)
        const duration = (240000 / bpm.value) * beat.nvr
        startProgress(index, duration)
      }
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
    isPlaying.value = true

    let startIdx = selectedBeatIndex.value
    if (startIdx === null || startIdx >= beats.value.length - 1) {
      startIdx = 0
      if (playFollow.value) selectedBeatIndex.value = 0
    }

    // 播放当前拍并启动进度
    const beat = beats.value[startIdx]
    if (beat) {
      playBeatNotes(startIdx)
      const duration = (240000 / bpm.value) * beat.nvr
      startProgress(startIdx, duration)
    }

    if (playFollow.value) {
      scheduleNext()
    } else {
      // 不跟随：用 playingBeatIndex 调度后续 Beat
      scheduleNextFrom(startIdx)
    }
  }

  /** 不跟随模式：基于 playingBeatIndex 调度下一拍 */
  function scheduleNextFrom(idx: number) {
    if (!isPlaying.value) return
    if (idx >= beats.value.length - 1) {
      const beat = beats.value[idx]
      if (beat) {
        const delay = (240000 / bpm.value) * beat.nvr + 100
        playTimer = window.setTimeout(() => {
          if (isPlaying.value) stopPlay()
        }, delay)
      }
      return
    }
    const beat = beats.value[idx]
    if (!beat) { stopPlay(); return }
    const delay = (240000 / bpm.value) * beat.nvr
    playTimer = window.setTimeout(() => {
      if (!isPlaying.value) return
      _advanceBeat(idx + 1)
      scheduleNextFrom(idx + 1)
    }, delay)
  }

  /** 递归调度下一拍（每个 Beat 的 nvr 时值可能不同） */
  function scheduleNext() {
    if (!isPlaying.value) return
    // 跟随关闭时使用 playingBeatIndex，避免 selectedBeatIndex 不更新导致的无限循环
    const idx = playFollow.value ? selectedBeatIndex.value : playingBeatIndex.value
    if (idx === null) { stopPlay(); return }
    const beat = beats.value[idx]
    if (!beat) { stopPlay(); return }

    // 时值 = (240000 / BPM) * nvr  （毫秒）
    // 说明: 1 个全音符 = 4 个四分音符 = 4 * 60000/BPM ms
    //       nvr 是全音符的分数，所以 delay = 240000/BPM * nvr
    const delay = (240000 / bpm.value) * beat.nvr

    if (idx >= beats.value.length - 1) {
      // 最后一拍：让进度动画自然走完，延时后再清理
      playTimer = window.setTimeout(() => {
        if (isPlaying.value) stopPlay()
      }, delay + 100)
      return
    }

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
    stopProgress()
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
    markDirty()
  }

  function addBeat() {
    sheetData.value = {
      ...sheetData.value,
      beats: addEmptyBeat(sheetData.value.beats),
    }
    markDirty()
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
    recalcAllLabels()
    sheetData.value = { ...sheetData.value }
    markDirty()
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
      isDirty.value = false
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
    isDirty.value = false
    stopPlay()
  }

  /** 更新 BPM */
  function setBpm(val: number) {
    sheetData.value = { ...sheetData.value, bpm: Math.max(20, Math.min(300, val)) }
    markDirty()
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
    playFollow,
    isPlaying,
    playingBeatIndex,
    playingProgress,
    fadingBeatIndices,
    isDirty,
    showSaveDialog,
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
    forceClearFading,
    updateNvr,
    nvrHalve,
    nvrDouble,
    loadSheet,
    newSheet,
    setBpm,
    exportSheet,
    confirmSaveBefore,
    saveAndProceed,
    discardAndProceed,
    cancelAction,
  }
})
