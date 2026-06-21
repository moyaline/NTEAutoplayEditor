<script setup lang="ts">
/**
 * BeatView —— 单拍缩略显示
 *
 * 3 行 × 12 列 = 36 个圆点，表示 KeyPad 中对应键是否激活。
 * ● = 激活，○ = 未激活
 *
 * 尺寸由 layouts.ts 中的 BEAT 常量控制，修改常量即可全局调试。
 */

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
  /** 是否选中 */
  selected?: boolean
  /** 显示编号标签 */
  label?: string
}>()

defineEmits<{
  click: []
}>()

function isActive(note: Note, octave: number): boolean {
  return props.activeKeys?.includes(`${note}${octave}`) ?? false
}
</script>

<template>
  <div
    class="beat-view"
    :class="{ 'beat-view--selected': selected }"
    @click="$emit('click')"
  >
    <div class="beat-label">{{ label }}</div>
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

  /* 显式尺寸，与 layout.ts 常量同步 */
  width: v-bind('BEAT.WIDTH + "px"');
  height: v-bind('BEAT.HEIGHT + "px"');
}

.beat-view:hover {
  border-color: var(--color-primary-300, #48cae4);
}

.beat-view--selected {
  border-color: var(--color-primary-400, #00b4d8);
  box-shadow: 0 0 0 2px rgba(0, 180, 216, 0.2);
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
  background: #3a4a5a;
}

.dark .beat-dot--on {
  background: #48cae4;
}

/* ─── 移动端（使用 BEAT_MOBILE 常量） ─── */
@media (orientation: landscape) and (max-height: 500px) {
  .beat-view {
    padding: v-bind('BEAT_MOBILE.PADDING_Y + "px"') v-bind('BEAT_MOBILE.PADDING_X + "px"');
    border-width: v-bind('BEAT_MOBILE.BORDER + "px"');
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
