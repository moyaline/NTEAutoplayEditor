/**
 * editor store —— 编辑器全局状态
 *
 * 管理乐谱数据、选中 Beat、文件操作。
 * AppHeader 和 EditorView 共享此 store。
 */

import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { createEmptySheet, addEmptyBeat, parseSheet, cumulativeToLabel, reduceFraction, keyIdToNote, beatLabel, measureForCumulative, validateMeasures } from '@/utils/sheetParser'
import type { BeatData } from '@/utils/sheetParser'
import type { SheetData } from '@/utils/sheetParser'
import { playNote } from '@/utils/notePlayer'
import { load, save } from '@/utils/storage'
import { parseMidiFile } from '@/utils/midiParser'
import { midiTracksToSheet } from '@/utils/midiToSheet'
import type { MidiProject, MidiTrack } from '@/types/midi'

interface UndoEntry {
  sheetData: SheetData
  selectedBeatIndex: number | null
}

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

  const autoCreateBeat = ref(load('autoCreateBeat', false))
  const showValidityCheck = ref(load('showValidityCheck', true))
  const darkMode = ref(load('darkMode', false))

  // ─── MIDI 导入状态 ──
  const midiProject = ref<MidiProject | null>(null)
  const showMidiSelector = ref(false)

  // ─── 持久化 ──
  watch(soundEnabled, v => save('soundEnabled', v))
  watch(soundVolume, v => save('soundVolume', v))
  watch(rowsPerPage, v => save('rowsPerPage', v))
  watch(playFollow, v => save('playFollow', v))
  watch(autoCreateBeat, v => save('autoCreateBeat', v))
  watch(showValidityCheck, v => save('showValidityCheck', v))
  watch(darkMode, v => { save('darkMode', v); applyDarkMode(v) })

  // ─── 深色模式初始应用 ──
  function applyDarkMode(v: boolean) {
    document.documentElement.classList.toggle('dark', v)
  }
  // 初始化
  if (typeof document !== 'undefined') applyDarkMode(darkMode.value)

  // ─── 撤销/重做 ──
  const undoStack = ref<UndoEntry[]>([])
  const redoStack = ref<UndoEntry[]>([])
  const MAX_UNDO = 200

  function cloneSheet(): SheetData {
    return JSON.parse(JSON.stringify(sheetData.value))
  }

  function pushSnapshot() {
    undoStack.value.push({
      sheetData: cloneSheet(),
      selectedBeatIndex: selectedBeatIndex.value,
    })
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    if (undoStack.value.length === 0) return
    // 保存当前状态到 redo
    redoStack.value.push({
      sheetData: cloneSheet(),
      selectedBeatIndex: selectedBeatIndex.value,
    })
    const entry = undoStack.value.pop()!
    sheetData.value = entry.sheetData
    selectedBeatIndex.value = entry.selectedBeatIndex
    clearMultiSelection()
    stopPlay()
    markDirty()
  }

  function redo() {
    if (redoStack.value.length === 0) return
    // 保存当前状态到 undo
    undoStack.value.push({
      sheetData: cloneSheet(),
      selectedBeatIndex: selectedBeatIndex.value,
    })
    const entry = redoStack.value.pop()!
    sheetData.value = entry.sheetData
    selectedBeatIndex.value = entry.selectedBeatIndex
    clearMultiSelection()
    stopPlay()
    markDirty()
  }

  // ─── 多选 & 剪贴板 ──
  const selectedIndices = ref<Set<number>>(new Set())
  const selectionStartIndex = ref<number | null>(null)
  const isSelectMode = ref(false)
  const clipboard = ref<BeatData[]>([])
  /** Shift/ Ctrl 按下时记录的锚点（固定不变直到按键释放） */
  const shiftAnchor = ref<number | null>(null)
  const ctrlAnchor = ref<number | null>(null)

  function setShiftAnchor(idx: number | null) { shiftAnchor.value = idx }
  function setCtrlAnchor(idx: number | null) { ctrlAnchor.value = idx }

  function toggleMultiSelect(index: number) {
    const newSet = new Set(selectedIndices.value)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    selectedIndices.value = newSet
  }

  function rangeSelectTo(index: number) {
    if (selectionStartIndex.value === null) return
    const start = Math.min(selectionStartIndex.value, index)
    const end = Math.max(selectionStartIndex.value, index)
    const newSet = new Set<number>()
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i < beats.value.length) newSet.add(i)
    }
    selectedIndices.value = newSet
  }

  function selectAllBeats() {
    const newSet = new Set<number>()
    for (let i = 0; i < beats.value.length; i++) newSet.add(i)
    selectedIndices.value = newSet
  }

  function clearMultiSelection() {
    selectedIndices.value = new Set()
    selectionStartIndex.value = null
    isSelectMode.value = false
    // 保持 selectedBeatIndex 不变，用以保留最后点选的 beat
  }

  /** 获取要操作的 beat 索引列表（优先多选，否则用主选中） */
  function effectiveSelection(): number[] {
    if (selectedIndices.value.size > 0) {
      return Array.from(selectedIndices.value).sort((a, b) => a - b)
    }
    if (selectedBeatIndex.value !== null) {
      return [selectedBeatIndex.value]
    }
    return []
  }

  function copyBeats() {
    const indices = effectiveSelection()
    if (indices.length === 0) return
    clipboard.value = indices.map(i => ({
      ...beats.value[i]!,
      keys: [...beats.value[i]!.keys],
      rawNotes: [...beats.value[i]!.rawNotes],
    }))
  }

  function cutBeats() {
    const indices = effectiveSelection()
    if (indices.length === 0) return
    pushSnapshot()
    copyBeats()
    const sorted = Array.from(indices).sort((a, b) => b - a)
    const newBeats = [...beats.value]
    for (const idx of sorted) newBeats.splice(idx, 1)
    sheetData.value = { ...sheetData.value, beats: newBeats }
    clearMultiSelection()
    if (selectedBeatIndex.value !== null && selectedBeatIndex.value >= newBeats.length) {
      selectedBeatIndex.value = newBeats.length > 0 ? newBeats.length - 1 : null
    }
    recalcAllLabels()
    markDirty()
  }

  function pasteBeatsAfter(targetIndex: number) {
    if (clipboard.value.length === 0) return
    pushSnapshot()
    const newBeats = [...beats.value]
    const pasted: BeatData[] = clipboard.value.map(b => ({
      ...b,
      keys: [...b.keys],
      rawNotes: [...b.rawNotes],
    }))
    newBeats.splice(targetIndex + 1, 0, ...pasted)
    sheetData.value = { ...sheetData.value, beats: newBeats }
    clearMultiSelection()
    recalcAllLabels()
    markDirty()
  }

  function pasteBeatsBefore(targetIndex: number) {
    if (clipboard.value.length === 0) return
    pushSnapshot()
    const newBeats = [...beats.value]
    const pasted: BeatData[] = clipboard.value.map(b => ({
      ...b,
      keys: [...b.keys],
      rawNotes: [...b.rawNotes],
    }))
    newBeats.splice(targetIndex, 0, ...pasted)
    sheetData.value = { ...sheetData.value, beats: newBeats }
    clearMultiSelection()
    recalcAllLabels()
    markDirty()
  }

  function isSelected(index: number): boolean {
    return selectedIndices.value.has(index)
  }

  function startSelectionFrom(index: number) {
    isSelectMode.value = true
    selectionStartIndex.value = index
    selectedIndices.value = new Set([index])
    // 更新主选中以清除旧高亮
    selectedBeatIndex.value = index
  }

  /** 删除所有选中的 Beat（含主选中） */
  function deleteSelectedBeats() {
    // 收集要删除的索引
    const toDelete = new Set(selectedIndices.value)
    // 如果没有任何多选但有主选中，删除主选中
    if (toDelete.size === 0 && selectedBeatIndex.value !== null) {
      toDelete.add(selectedBeatIndex.value)
    }
    if (toDelete.size === 0) return
    pushSnapshot()
    const sorted = Array.from(toDelete).sort((a, b) => b - a)
    const newBeats = [...beats.value]
    for (const idx of sorted) {
      if (idx >= 0 && idx < newBeats.length) newBeats.splice(idx, 1)
    }
    sheetData.value = { ...sheetData.value, beats: newBeats }
    clearMultiSelection()
    if (selectedBeatIndex.value !== null && selectedBeatIndex.value >= newBeats.length) {
      selectedBeatIndex.value = newBeats.length > 0 ? newBeats.length - 1 : null
    }
    recalcAllLabels()
    markDirty()
  }

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
  const tsNum = computed(() => sheetData.value.timeSignature?.num ?? 4)
  const tsDen = computed(() => sheetData.value.timeSignature?.den ?? 4)

  const invalidBeatIndices = computed(() =>
    showValidityCheck.value
      ? validateMeasures(beats.value, tsNum.value, tsDen.value)
      : new Set<number>(),
  )

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
    if (selectedBeatIndex.value >= beats.value.length - 1) {
      if (autoCreateBeat.value) {
        const idx = beats.value.length
        addBeat()
        selectedBeatIndex.value = idx
      }
      return
    }
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
    pushSnapshot()
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
    pushSnapshot()
    const { num: tn, den: td } = sheetData.value.timeSignature ?? { num: 4, den: 4 }
    sheetData.value = {
      ...sheetData.value,
      beats: addEmptyBeat(sheetData.value.beats, tn, td),
    }
    // 自动选中新增的 beat
    selectedBeatIndex.value = beats.value.length - 1
    markDirty()
  }

  /** 在当前选中 beat 后追加一个新 beat */
  function addBeatAfter() {
    if (selectedBeatIndex.value === null) return
    const idx = selectedBeatIndex.value
    const prevBeat = beats.value[idx]
    if (!prevBeat) return
    pushSnapshot()
    const { num: tn, den: td } = sheetData.value.timeSignature ?? { num: 4, den: 4 }
    const newArr = [...beats.value]
    const newNum = 1
    const newDen = 8
    const newNvr = newNum / newDen
    const newBeat: BeatData = {
      keys: [],
      rawNotes: [],
      nvr: newNvr,
      num: newNum,
      den: newDen,
      cumulative: prevBeat.cumulative + prevBeat.nvr,
      label: beatLabel(newNum, newDen, measureForCumulative(prevBeat.cumulative + prevBeat.nvr, tn, td)),
    }
    newArr.splice(idx + 1, 0, newBeat)
    sheetData.value = { ...sheetData.value, beats: newArr }
    selectedBeatIndex.value = idx + 1
    recalcAllLabels()
    markDirty()
  }

  /** 更新当前 Beat 的 nvr */
  function updateNvr(num: number, den: number) {
    if (selectedBeatIndex.value === null) return
    pushSnapshot()
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

  /** nvr 减半（分母 ×2，分母上限 64 时改为分子 ÷2） */
  function nvrHalve() {
    const { num, den } = currentNvr.value
    if (den * 2 <= 64) {
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
    const { num: tn, den: td } = sheetData.value.timeSignature ?? { num: 4, den: 4 }
    for (let i = 0; i < beats.value.length; i++) {
      const beat = beats.value[i]!
      beat.cumulative = cum
      const measure = measureForCumulative(cum, tn, td)
      beat.label = beatLabel(beat.num, beat.den, measure)
      cum += beat.nvr
    }
  }

  // ─── 文件操作 ─────────────────────────

  function loadSheet(jsonStr: string) {
    try {
      const parsed = JSON.parse(jsonStr)
      const sheet = parseSheet(parsed)
      undoStack.value = []
      redoStack.value = []
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
    undoStack.value = []
    redoStack.value = []
    sheetData.value = createEmptySheet()
    selectedBeatIndex.value = 0
    isNewFile.value = true
    fileName.value = '未命名乐谱'
    isDirty.value = false
    stopPlay()
  }

  /** 更新 BPM */
  function setBpm(val: number) {
    pushSnapshot()
    sheetData.value = { ...sheetData.value, bpm: Math.max(20, Math.min(300, val)) }
    markDirty()
  }

  /** 更新拍号（不约分，拍号有音乐意义） */
  function setTimeSignature(num: number, den: number) {
    pushSnapshot()
    sheetData.value = {
      ...sheetData.value,
      timeSignature: { num: Math.max(1, Math.min(32, num)), den: Math.max(1, Math.min(64, den)) },
    }
    recalcAllLabels()
    markDirty()
  }

  /** 加载 MIDI 文件并显示轨道选择器 */
  function loadMidiFile(data: ArrayBuffer | Uint8Array, name: string) {
    try {
      const project = parseMidiFile(data)
      midiProject.value = project
      fileName.value = name
      showMidiSelector.value = true
    } catch (e) {
      console.error('MIDI 解析失败:', e)
      alert('无法解析 MIDI 文件')
    }
  }

  /** 从选中的 MIDI 轨道导入乐谱 */
  function importMidiTracks(tracks: MidiTrack[], project: MidiProject) {
    try {
      const sheet = midiTracksToSheet(tracks, project.metadata)
      sheetData.value = sheet
      selectedBeatIndex.value = 0
      isNewFile.value = false
      isDirty.value = false
      showMidiSelector.value = false
      midiProject.value = null
      stopPlay()
      clearMultiSelection()
    } catch (e) {
      console.error('MIDI 转换失败:', e)
      alert('MIDI 转换为乐谱失败')
    }
  }

  /** 清除 MIDI 导入状态 */
  function cancelMidiImport() {
    showMidiSelector.value = false
    midiProject.value = null
  }

  /** 导出乐谱为 JSON 字符串 */
  function exportSheet(): string {
    const beatLines = sheetData.value.beats.map(b => {
      const notes = b.rawNotes.length > 0
        ? b.rawNotes
        : b.keys.map(k => keyIdToNote(k))
      return `    {"note": ${JSON.stringify(notes)}, "nvr": {"num": ${b.num}, "den": ${b.den}}}`
    })
    const ts = sheetData.value.timeSignature ?? { num: 4, den: 4 }
    return `{\n  "bpm": ${sheetData.value.bpm},\n  "timeSignature": {"num": ${ts.num}, "den": ${ts.den}},\n  "sheet": [\n${beatLines.join(',\n')}\n  ]\n}`
  }

  return {
    sheetData,
    selectedBeatIndex,
    selectedIndices,
    selectionStartIndex,
    isSelectMode,
    clipboard,
    fileName,
    isNewFile,
    beats,
    bpm,
    tsNum,
    tsDen,
    activeKeys,
    currentNvr,
    soundEnabled,
    soundVolume,
    rowsPerPage,
    playFollow,
    autoCreateBeat,
    showValidityCheck,
    darkMode,
    invalidBeatIndices,
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
    addBeatAfter,
    forceClearFading,
    updateNvr,
    nvrHalve,
    nvrDouble,
    loadSheet,
    newSheet,
    setBpm,
    setTimeSignature,
    exportSheet,
    loadMidiFile,
    importMidiTracks,
    cancelMidiImport,
    midiProject,
    showMidiSelector,
    confirmSaveBefore,
    saveAndProceed,
    discardAndProceed,
    cancelAction,
    toggleMultiSelect,
    rangeSelectTo,
    selectAllBeats,
    clearMultiSelection,
    copyBeats,
    cutBeats,
    pasteBeatsAfter,
    pasteBeatsBefore,
    isSelected,
    startSelectionFrom,
    deleteSelectedBeats,
    undo,
    redo,
    undoStack,
    redoStack,
    shiftAnchor,
    ctrlAnchor,
    setShiftAnchor,
    setCtrlAnchor,
  }
})
