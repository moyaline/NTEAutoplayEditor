<script setup lang="ts">
/**
 * MidiTrackSelector —— MIDI 轨道选择浮窗
 *
 * 显示 MIDI 文件解析后的轨道列表，允许用户选择/取消选择轨道，
 * 下载中间文件，以及确认导入。
 */

import { ref, computed } from 'vue'
import type { MidiProject, MidiTrack, TrackSelection } from '@/types/midi'

const props = defineProps<{
  project: MidiProject
}>()

const emit = defineEmits<{
  confirm: [selectedTracks: MidiTrack[], project: MidiProject]
  cancel: []
}>()

// 构建轨道选择列表
const selections = ref<TrackSelection[]>(
  props.project.tracks.map((track, i) => {
    const pitches = track.notes.map(n => n.midi)
    const lowestPitch = pitches.length > 0 ? Math.min(...pitches) : 0
    const highestPitch = pitches.length > 0 ? Math.max(...pitches) : 0
    const channels = new Set(track.notes.map(n => n.channel ?? 0))
    const isPercussion = channels.size === 1 && (Array.from(channels)[0] === 9 || track.name.toLowerCase().includes('percussion') || track.name.toLowerCase().includes('drum') || track.name.toLowerCase().includes('鼓') || track.name.toLowerCase().includes('打击'))

    return {
      index: i,
      name: track.name || `轨道 ${i + 1}`,
      noteCount: track.notes.length,
      selected: !isPercussion, // 打击乐轨道默认不选
      lowestPitch,
      highestPitch,
      isPercussion,
    }
  }),
)

const selectedCount = computed(() => selections.value.filter(s => s.selected).length)
const totalCount = computed(() => selections.value.length)

function toggleSelection(index: number) {
  const sel = selections.value[index]
  if (sel) sel.selected = !sel.selected
}

function selectAll() {
  selections.value.forEach(s => { s.selected = true })
}

function deselectAll() {
  selections.value.forEach(s => { s.selected = false })
}

function handleConfirm() {
  const selectedIndices = new Set(selections.value.filter(s => s.selected).map(s => s.index))
  const selectedTracks = props.project.tracks.filter((_, i) => selectedIndices.has(i))
  emit('confirm', selectedTracks, props.project)
}

function handleDownload() {
  const json = JSON.stringify(props.project, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'midi-project.json'
  a.click()
  URL.revokeObjectURL(url)
}

function pitchName(midi: number): string {
  const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = NOTES[midi % 12]
  return `${note}${octave}`
}
</script>

<template>
  <div class="midi-overlay" @click.self="emit('cancel')">
    <div class="midi-dialog">
      <!-- 标题栏 -->
      <div class="midi-header">
        <h2 class="midi-title">MIDI 轨道选择</h2>
        <button class="midi-close" title="取消" @click="emit('cancel')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- 信息栏 -->
      <div class="midi-info">
        <span class="midi-badge">BPM: {{ project.metadata.targetBpm }}</span>
        <span class="midi-badge">拍号: {{ project.metadata.timeSignature.num }}/{{ project.metadata.timeSignature.den }}</span>
        <span class="midi-badge">格式: {{ project.metadata.originalFormat }}</span>
        <span class="midi-badge">已选: {{ selectedCount }}/{{ totalCount }}</span>
      </div>

      <!-- 操作栏 -->
      <div class="midi-actions">
        <button class="midi-action-btn" @click="selectAll">全选</button>
        <button class="midi-action-btn" @click="deselectAll">取消全选</button>
        <button class="midi-action-btn midi-action-btn--download" @click="handleDownload">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          下载中间文件
        </button>
      </div>

      <!-- 轨道列表 -->
      <div class="midi-track-list">
        <div
          v-for="sel in selections"
          :key="sel.index"
          class="midi-track-row"
          :class="{ 'midi-track-row--selected': sel.selected, 'midi-track-row--percussion': sel.isPercussion }"
          @click="toggleSelection(sel.index)"
        >
          <div class="midi-track-check">
            <div class="midi-checkbox" :class="{ 'midi-checkbox--on': sel.selected }">
              <svg v-if="sel.selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
          </div>
          <div class="midi-track-info">
            <span class="midi-track-name">
              {{ sel.name }}
              <span v-if="sel.isPercussion" class="midi-track-tag">打击乐</span>
            </span>
            <span class="midi-track-stats">
              {{ sel.noteCount }} 个音符 · {{ pitchName(sel.lowestPitch) }}–{{ pitchName(sel.highestPitch) }}
            </span>
          </div>
        </div>

        <div v-if="selections.length === 0" class="midi-empty">
          没有找到有效轨道
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="midi-footer">
        <button class="midi-btn midi-btn--cancel" @click="emit('cancel')">取消</button>
        <button
          class="midi-btn midi-btn--confirm"
          :disabled="selectedCount === 0"
          @click="handleConfirm"
        >
          导入 {{ selectedCount }} 条轨道
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.midi-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.midi-dialog {
  width: 520px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.midi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
}

.midi-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-main, #1a2a3a);
  margin: 0;
}

.midi-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary, #5a6b7a);
  cursor: pointer;
  transition: background 0.1s;
}
.midi-close:hover {
  background: var(--color-border-base, #e2e8f0);
}
.midi-close svg {
  width: 16px;
  height: 16px;
}

.midi-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-page-bg, #f8fafc);
}

.midi-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary, #5a6b7a);
  padding: 2px 8px;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 4px;
}

.midi-actions {
  display: flex;
  gap: 6px;
  padding: 8px 18px;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
}

.midi-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #5a6b7a);
  background: var(--color-page-bg, #f8fafc);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.1s;
}
.midi-action-btn:hover {
  background: var(--color-border-base, #e2e8f0);
}
.midi-action-btn svg {
  width: 14px;
  height: 14px;
}
.midi-action-btn--download {
  margin-left: auto;
}

.midi-track-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px;
}

.midi-track-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}
.midi-track-row:hover {
  background: var(--color-border-base, #e2e8f0);
}
.midi-track-row--percussion {
  opacity: 0.6;
}

.midi-track-check {
  flex-shrink: 0;
}

.midi-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid var(--color-border-base, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  color: transparent;
}
.midi-checkbox--on {
  background: var(--color-primary-400, #00b4d8);
  border-color: var(--color-primary-400, #00b4d8);
  color: #fff;
}
.midi-checkbox svg {
  width: 12px;
  height: 12px;
}

.midi-track-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.midi-track-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-main, #1a2a3a);
  display: flex;
  align-items: center;
  gap: 6px;
}

.midi-track-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-warning, #e67e22);
  background: rgba(230, 126, 34, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
}

.midi-track-stats {
  font-size: 11px;
  color: var(--color-text-placeholder, #a0b0c0);
}

.midi-empty {
  text-align: center;
  padding: 24px;
  color: var(--color-text-placeholder, #a0b0c0);
  font-size: 13px;
}

.midi-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--color-border-base, #e2e8f0);
}

.midi-btn {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s, opacity 0.12s;
}

.midi-btn--cancel {
  background: var(--color-page-bg, #f8fafc);
  color: var(--color-text-secondary, #5a6b7a);
  border: 1px solid var(--color-border-base, #e2e8f0);
}
.midi-btn--cancel:hover {
  background: var(--color-border-base, #e2e8f0);
}

.midi-btn--confirm {
  background: var(--color-primary-400, #00b4d8);
  color: #fff;
}
.midi-btn--confirm:hover {
  opacity: 0.9;
}
.midi-btn--confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
