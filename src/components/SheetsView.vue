<script setup lang="ts">
/**
 * SheetsView —— 乐谱预览面板
 *
 * CSS Grid 固定列布局，左对齐。
 * 每行 N 个槽位（= beatsPerRow），未使用的槽位以空占位符填充。
 * 追加框占据最后一个 Beat 之后的第一个槽位。
 * rowsPerPage 由父组件根据可用空间动态计算传入。
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import BeatView from './BeatView.vue'
import BeatContextMenu from './BeatContextMenu.vue'
import type { BeatData } from '@/utils/sheetParser'
import { BEAT, SHEETS } from '@/utils/layout'

const props = withDefaults(
  defineProps<{
    beats: BeatData[]
    selectedIndex?: number
    selectedIndices?: Set<number>
    isSelectMode?: boolean
    hasClipboard?: boolean
    rowsPerPage?: number
    playingBeatIndex?: number | null
    playingProgress?: number
    fadingBeatIndices?: number[]
  }>(),
  { rowsPerPage: 2 },
)

const emit = defineEmits<{
  select: [index: number, ctrl: boolean, shift: boolean]
  addBeat: []
  'startSelection': [index: number]
  'selectTo': [index: number]
  'contextCopy': [index: number]
  'contextCut': [index: number]
  'contextDelete': [index: number]
  'contextDeselect': [index: number]
  'contextSelect': [index: number]
  'pasteBefore': [index: number]
  'pasteAfter': [index: number]
}>()

// ─── 容器宽度感知 ──────────────────────────
const bodyRef = ref<HTMLElement | null>(null)
const bodyWidth = ref(0)

let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      bodyWidth.value = entry.contentRect.width
    }
  })
  if (bodyRef.value) ro.observe(bodyRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
})

// ─── 分页计算 ──────────────────────────────

type Cell =
  | { type: 'beat'; beat: BeatData; globalIndex: number }
  | { type: 'add' }
  | { type: 'placeholder' }

/** 每行槽位数 */
const beatsPerRow = computed(() => {
  const available = bodyWidth.value
  if (available <= 0) return 1
  const slotWidth = BEAT.WIDTH + SHEETS.BEAT_GAP
  const count = Math.floor((available + SHEETS.BEAT_GAP) / slotWidth)
  return Math.max(1, count)
})

/** 每页总槽位 */
const slotsPerPage = computed(() => beatsPerRow.value * props.rowsPerPage)

/** 总页数（追加按钮始终占用一个槽位，所以 +1） */
const totalPages = computed(() =>
  Math.max(1, Math.ceil((props.beats.length + 1) / slotsPerPage.value)),
)

const currentPage = ref(0)

/** 当前页的槽位列表 */
const cells = computed<Cell[]>(() => {
  const start = currentPage.value * slotsPerPage.value
  const end = start + slotsPerPage.value
  const pageBeats = props.beats.slice(start, end)
  const totalSlots = slotsPerPage.value
  const result: Cell[] = []

  for (let i = 0; i < totalSlots; i++) {
    if (i < pageBeats.length) {
      result.push({ type: 'beat', beat: pageBeats[i]!, globalIndex: start + i })
    } else if (i === pageBeats.length) {
      result.push({ type: 'add' })
    } else {
      result.push({ type: 'placeholder' })
    }
  }

  return result
})

/** Sheets 区域固定高度 */
const sheetsHeight = computed(() => {
  const rowH = BEAT.HEIGHT
  const gap = SHEETS.ROW_GAP
  const padding = 6
  return props.rowsPerPage * rowH + (props.rowsPerPage - 1) * gap + padding
})

function prevPage() {
  if (currentPage.value > 0) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) currentPage.value++
}

function goToBeat(index: number): boolean {
  const page = Math.floor(index / slotsPerPage.value)
  const newPage = Math.min(page, totalPages.value - 1)
  const changed = newPage !== currentPage.value
  currentPage.value = newPage
  return changed
}

// ─── 多选 & 右键菜单 ────────────────────────────
const contextMenuBeat = ref<number | null>(null)
const contextMenuPos = ref({ x: 0, y: 0 })
const showContextMenu = ref(false)
const isMobile = window.innerWidth <= 800 || window.innerHeight <= 600
/** 长按触发菜单后屏蔽随后的 click 事件，避免打断选中状态 */
let wasLongPress = false

function handleBeatClick(e: MouseEvent, index: number) {
  // 长按弹出的菜单被关闭后，随后的 click 应忽略
  if (wasLongPress) {
    wasLongPress = false
    return
  }
  if (props.isSelectMode) {
    // 选择模式下点击相当于粘滞 Ctrl: 切换多选
    emit('select', index, true, false)
    return
  }
  emit('select', index, e.ctrlKey || e.metaKey, e.shiftKey)
}

function handleContextMenu(e: MouseEvent, index: number) {
  // 右键选中该 beat 但不打断多选
  emit('contextSelect', index)
  contextMenuBeat.value = index
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

// 移动端长按检测
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let touchBeatIndex = -1

function handleTouchStart(index: number) {
  touchBeatIndex = index
  wasLongPress = false
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    wasLongPress = true
    contextMenuBeat.value = index
    // 居中显示在触摸位置上方
    contextMenuPos.value = { x: window.innerWidth / 2 - 70, y: window.innerHeight / 3 }
    showContextMenu.value = true
  }, 500)
}

function handleTouchEnd() {
  if (longPressTimer) {
    // 短按：清除定时器，让后续 click 正常处理
    clearTimeout(longPressTimer)
    longPressTimer = null
    // wasLongPress 仍为 false，click 会正常触发
  }
  // 长按已触发：wasLongPress 为 true，后续 click 将被屏蔽
}

function closeContextMenu() {
  showContextMenu.value = false
  contextMenuBeat.value = null
}

defineExpose({ goToBeat })
</script>

<template>
  <div class="sheets">
    <button
      class="sheets-nav"
      :disabled="currentPage <= 0"
      title="上一页"
      @click="prevPage"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div ref="bodyRef" class="sheets-body">
      <div class="sheets-grid">
        <template v-for="(cell, cIdx) in cells" :key="cell.type === 'beat' ? 'b-' + cell.globalIndex : cell.type === 'add' ? 'add' : 'p-' + cIdx">
          <!-- Beat -->
          <BeatView
            v-if="cell.type === 'beat'"
            :active-keys="cell.beat.keys"
            :selected="cell.globalIndex === selectedIndex"
            :multi-selected="selectedIndices?.has(cell.globalIndex) && cell.globalIndex !== selectedIndex"
            :label="cell.beat.label"
            :seq-num="cell.globalIndex + 1"
            :playing-progress="cell.globalIndex === playingBeatIndex ? playingProgress : fadingBeatIndices?.includes(cell.globalIndex) ? 1 : undefined"
            @click="(e: MouseEvent) => handleBeatClick(e, cell.globalIndex)"
            @contextmenu="(e: MouseEvent) => handleContextMenu(e, cell.globalIndex)"
            @touchstart="handleTouchStart(cell.globalIndex)"
            @touchend="handleTouchEnd"
          />
                <button
            v-else-if="cell.type === 'add'"
            class="sheets-add-beat"
            title="添加 Beat"
            @click="emit('addBeat')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <div v-else class="sheets-slot"></div>
        </template>
      </div>
    </div>

    <button
      class="sheets-nav"
      :disabled="currentPage >= totalPages - 1"
      title="下一页"
      @click="nextPage"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>

    <!-- 右键菜单 -->
    <BeatContextMenu
      v-if="showContextMenu && contextMenuBeat !== null"
      :x="contextMenuPos.x"
      :y="contextMenuPos.y"
      :is-mobile="isMobile"
      :is-select-mode="!!props.isSelectMode"
      :has-selection="(props.selectedIndices?.size ?? 0) > 0 || props.selectedIndex !== undefined"
      :selection-count="(props.selectedIndices?.size ?? 0) + (props.selectedIndex !== undefined && !props.selectedIndices?.has(props.selectedIndex) ? 1 : 0)"
      :has-clipboard="!!props.hasClipboard"
      @close="closeContextMenu"
      @start-select="emit('startSelection', contextMenuBeat!); closeContextMenu()"
      @select-to="emit('selectTo', contextMenuBeat!); closeContextMenu()"
      @deselect="emit('contextDeselect', contextMenuBeat!); closeContextMenu()"
      @copy="emit('contextCopy', contextMenuBeat!); closeContextMenu()"
      @cut="emit('contextCut', contextMenuBeat!); closeContextMenu()"
      @delete-beat="emit('contextDelete', contextMenuBeat!); closeContextMenu()"
      @paste-before="emit('pasteBefore', contextMenuBeat!); closeContextMenu()"
      @paste-after="emit('pasteAfter', contextMenuBeat!); closeContextMenu()"
    />
  </div>
</template>

<style scoped>
.sheets {
  display: flex;
  align-items: stretch;
  gap: 4px;
  padding: 3px 0;
  user-select: none;
  min-height: 56px;
}

/* ─── 翻页按钮（垂直居中） ─── */
.sheets-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  flex-shrink: 0;
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 4px;
  background: var(--color-card-bg, #ffffff);
  color: var(--color-text-secondary, #5a6b7a);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, opacity 0.2s;
  outline: none;
}

.sheets-nav:hover:not(:disabled) {
  background: var(--color-border-base, #e2e8f0);
  color: var(--color-text-main, #1a2a3a);
}

.sheets-nav:disabled {
  opacity: 0.25;
  cursor: default;
}

.sheets-nav svg {
  width: 14px;
  height: 14px;
}

/* ─── Beat 容器（CSS Grid，固定列，左对齐） ─── */
.sheets-body {
  flex: 1;
  overflow: hidden;
}

.sheets-grid {
  display: grid;
  grid-template-columns: repeat(v-bind('beatsPerRow'), v-bind('BEAT.WIDTH + "px"'));
  gap: v-bind('SHEETS.ROW_GAP + "px"') v-bind('SHEETS.BEAT_GAP + "px"');
  justify-content: space-evenly;
  align-content: start;
  padding: 3px 0;
  height: v-bind('sheetsHeight + "px"');
  overflow: hidden;
}

/* ─── 空占位符（与 BeatView 等大，不可见） ─── */
.sheets-slot {
  width: v-bind('BEAT.WIDTH + "px"');
  height: v-bind('BEAT.HEIGHT + "px"');
  border: v-bind('BEAT.BORDER + "px"') solid transparent;
  border-radius: 6px;
  pointer-events: none;
}

/* ─── 追加框（与 BeatView 等大） ─── */
.sheets-add-beat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: v-bind('BEAT.WIDTH + "px"');
  height: v-bind('BEAT.HEIGHT + "px"');
  padding: v-bind('BEAT.PADDING_Y + "px"') v-bind('BEAT.PADDING_X + "px"');
  border: v-bind('BEAT.BORDER + "px"') dashed var(--color-border-base, #e2e8f0);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-placeholder, #a0b0c0);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  outline: none;
  font: inherit;
}

.sheets-add-beat:hover {
  background: var(--color-primary-50, #e8f7fa);
  border-color: var(--color-primary-300, #48cae4);
  color: var(--color-primary-500, #0096b7);
}

.sheets-add-beat:active {
  transform: scale(0.96);
}

.sheets-add-beat svg {
  width: 16px;
  height: 16px;
}
</style>
