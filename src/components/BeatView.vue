<script setup lang="ts">
/**
 * BeatView —— 单拍缩略显示
 *
 * 3 行 × 12 列 = 36 个圆点，表示 KeyPad 中对应键是否激活。
 * ● = 激活，○ = 未激活
 *
 * 尺寸由 layouts.ts 中的 BEAT 常量控制，修改常量即可全局调试。
 */

import { computed } from 'vue'
import { BEAT, BEAT_MOBILE } from '@/utils/layout'

const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] as const

type Note = (typeof NOTES)[number]

interface OctaveRow {
  label: string
  octave: number
}

const rows: OctaveRow[] = [
  { label: '高音', octave: 6 },
  { label: '中音', octave: 5 },
  { label: '低音', octave: 4 },
]

const props = defineProps<{
  /** 该拍激活的按键 ID 数组，如 ["C5", "C#6"] */
  activeKeys?: string[]
  /** 是否选中（主选中） */
  selected?: boolean
  /** 是否在多选集中 */
  multiSelected?: boolean
  /** 小节时值不正确警告 */
  invalid?: boolean
  /** 显示编号标签 */
  label?: string
  /** 序号 #n */
  seqNum?: number
  /** 播放进度 0‑1（仅当前播放的 Beat 传入） */
  playingProgress?: number
}>()

/** 进度条宽度：有值时跟随进度，无值为 0（v-if 移除前由 Transition 驱动渐隐） */
const progressWidth = computed(() => props.playingProgress !== undefined ? props.playingProgress * 100 + '%' : '0%')

defineEmits<{
  click: [e: MouseEvent]
  contextmenu: [e: MouseEvent]
  touchstart: [e: TouchEvent]
  touchend: [e: TouchEvent]
}>()

function isActive(note: Note, octave: number): boolean {
  return props.activeKeys?.includes(`${note}${octave}`) ?? false
}
</script>

<template>
  <div
    class="beat-view"
    :class="{
      'beat-view--selected': selected,
      'beat-view--multi': multiSelected && !selected,
      'beat-view--invalid': invalid,
    }"
    @click="$emit('click', $event)"
    @contextmenu.prevent="$emit('contextmenu', $event)"
    @touchstart="$emit('touchstart', $event)"
    @touchend="$emit('touchend', $event)"
  >
    <!-- 序号 #n -->
    <span class="beat-seq">#{{ seqNum }}</span>
    <div class="beat-label">{{ label }}</div>
    <!-- 播放进度条（Transition 提供渐隐离开动画） -->
    <Transition name="progress">
      <div
        v-if="playingProgress !== undefined"
        class="beat-progress"
        :style="{ width: progressWidth }"
      ></div>
    </Transition>
    <div class="beat-grid">
      <div v-for="row in rows" :key="row.octave" class="beat-row">
        <div
          v-for="note in NOTES"
          :key="`${note}${row.octave}`"
          class="beat-dot"
          :class="{ 'beat-dot--on': isActive(note, row.octave) }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beat-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: v-bind('BEAT.LABEL_GAP + "px"');
  padding: v-bind('BEAT.PADDING_Y + "px"') v-bind('BEAT.PADDING_X + "px"');
  border: v-bind('BEAT.BORDER + "px"') solid var(--color-border-base, #e2e8f0);
  border-radius: 6px;
  background: var(--color-card-bg, #ffffff);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
  user-select: none;
  position: relative;
  overflow: hidden;

  /* 显式尺寸，与 layout.ts 常量同步 */
  width: v-bind('BEAT.WIDTH + "px"');
  height: v-bind('BEAT.HEIGHT + "px"');
}

/* ─── 播放进度条（淡蓝全背景） ─── */
.beat-progress {
  position: absolute;
  inset: 0;
  background: rgba(0, 180, 216, 0.08);
  pointer-events: none;
  border-radius: inherit;
  transition: width 0.05s linear;
}

/* ─── 渐隐离开动画 ─── */
.progress-leave-active {
  transition: opacity 0.4s ease;
}
.progress-leave-to {
  opacity: 0;
}

.beat-view:hover {
  border-color: var(--color-primary-300, #48cae4);
}

.beat-view--selected {
  border-color: var(--color-primary-400, #00b4d8);
  box-shadow: 0 0 0 2px rgba(0, 180, 216, 0.2);
}

.beat-view--multi {
  border-color: var(--color-primary-300, #48cae4);
  box-shadow: 0 0 0 2px rgba(72, 202, 228, 0.2);
}

/* ─── 小节时值警告（橙色 label） ─── */
.beat-view--invalid .beat-label {
  color: var(--color-warning, #e67e22) !important;
  font-weight: 700;
}

.dark .beat-view--invalid .beat-label {
  color: var(--color-warning, #e67e22) !important;
}

/* ─── 序号 #n（左上角小字灰色） ─── */
.beat-seq {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 9px;
  font-weight: 500;
  color: var(--color-text-placeholder, #a0b0c0);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* ─── 编号 ─── */
.beat-label {
  font-size: v-bind('BEAT.LABEL_FONT_SIZE + "px"');
  font-weight: 600;
  color: var(--color-text-placeholder, #a0b0c0);
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.beat-view--selected .beat-label {
  color: var(--color-primary-500, #0096b7);
}

/* ─── 圆点网格 ─── */
.beat-grid {
  display: flex;
  flex-direction: column;
  gap: v-bind('BEAT.ROW_GAP + "px"');
}

.beat-row {
  display: flex;
  gap: v-bind('BEAT.DOT_GAP + "px"');
}

/* ─── 单个圆点 ─── */
.beat-dot {
  width: v-bind('BEAT.DOT_SIZE + "px"');
  height: v-bind('BEAT.DOT_SIZE + "px"');
  border-radius: 50%;
  background: var(--color-border-base, #e2e8f0);
  transition: background 0.1s;
}

.beat-dot--on {
  background: var(--color-primary-400, #00b4d8);
  box-shadow: 0 0 3px rgba(0, 180, 216, 0.4);
}

/* ─── 暗色模式 ─── */
.dark .beat-dot {
  background: #2a2a2a;
}

.dark .beat-dot--on {
  background: #00b4d8;
  box-shadow: 0 0 6px rgba(0, 180, 216, 0.5);
}

/* ─── 移动端（使用 BEAT_MOBILE 常量） ─── */
@media (orientation: landscape) and (max-height: 500px) {
  .beat-view {
    padding: v-bind('BEAT_MOBILE.PADDING_Y + "px"') v-bind('BEAT_MOBILE.PADDING_X + "px"');
    border-width: v-bind('BEAT_MOBILE.BORDER + "px"');
  }
  .beat-seq {
    font-size: 8px;
    top: 1px;
    left: 2px;
  }
  .beat-label {
    font-size: v-bind('BEAT_MOBILE.LABEL_FONT_SIZE + "px"');
  }
  .beat-grid {
    gap: v-bind('BEAT_MOBILE.ROW_GAP + "px"');
  }
  .beat-row {
    gap: v-bind('BEAT_MOBILE.DOT_GAP + "px"');
  }
  .beat-dot {
    width: v-bind('BEAT_MOBILE.DOT_SIZE + "px"');
    height: v-bind('BEAT_MOBILE.DOT_SIZE + "px"');
  }
}
</style>
