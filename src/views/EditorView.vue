<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import KeyPad from '@/components/KeyPad.vue'
import SheetsView from '@/components/SheetsView.vue'
import { useEditorStore } from '@/stores/editor'
import { BEAT, SHEETS } from '@/utils/layout'

const editor = useEditorStore()
const sheetsRef = ref<InstanceType<typeof SheetsView> | null>(null)
const sheetsContainerRef = ref<HTMLElement | null>(null)

/** 处理 Beat 点击（支持 Ctrl/Shift 多选） */
function handleSelectBeat(index: number, ctrl: boolean, shift: boolean) {
  if (ctrl) {
    // Ctrl+click: 切换该 beat 的多选状态
    const wasSelected = editor.selectedIndices.has(index)
    if (wasSelected && editor.selectedIndices.size <= 1) {
      // 最后一块选中的 beat 不允许取消，保证始终至少一个被选中
      return
    }
    editor.toggleMultiSelect(index)
    // 更新主选中：若取消的正是当前主选中，切到其他选中的 beat
    if (wasSelected && editor.selectedBeatIndex === index) {
      const remaining = Array.from(editor.selectedIndices)
      editor.selectedBeatIndex = remaining.length > 0 ? remaining[0]! : null
    } else if (!wasSelected) {
      editor.selectedBeatIndex = index
    }
  } else if (shift) {
    // Shift+click: 以 shiftAnchor 为固定起始作范围选择（anchors 只由 keydown 更新）
    const startIdx = editor.shiftAnchor ?? editor.selectedBeatIndex ?? index
    editor.selectionStartIndex = startIdx
    editor.rangeSelectTo(index)
  } else {
    // 普通点击: 清除多选，选中单个
    editor.clearMultiSelection()
    editor.selectBeat(index)
  }
}

// 监测 Sheets 容器实际高度，动态计算可显示行数
const dynamicRows = ref(editor.rowsPerPage)
let ro: ResizeObserver | null = null

function recalcRows() {
  if (!sheetsContainerRef.value) return
  const h = sheetsContainerRef.value.clientHeight
  const rowH = BEAT.HEIGHT + SHEETS.ROW_GAP
  const padding = 4 + 12 + 4 + 2 // sheets padding + border
  const available = h - padding
  const maxPossible = Math.max(1, Math.floor(available / rowH))
  dynamicRows.value = Math.min(editor.rowsPerPage, maxPossible)
}

onMounted(() => {
  recalcRows()
  ro = new ResizeObserver(recalcRows)
  if (sheetsContainerRef.value) ro.observe(sheetsContainerRef.value)
})

onUnmounted(() => {
  ro?.disconnect()
})

// 用户设置变化时重新计算
watch(() => editor.rowsPerPage, recalcRows)

// 选中 Beat 变化时自动翻到对应页
watch(() => editor.selectedBeatIndex, (idx) => {
  if (idx !== null) {
    const flipped = sheetsRef.value?.goToBeat(idx)
    if (flipped) editor.forceClearFading()
  }
})

// 播放开始时翻到选中 Beat 所在页
watch(() => editor.isPlaying, (playing) => {
  if (playing && editor.selectedBeatIndex !== null) {
    sheetsRef.value?.goToBeat(editor.selectedBeatIndex!)
  }
})
</script>

<template>
  <div class="editor-view">
    <!-- Sheets 乐谱预览区（弹性填充，KeyPad 完整显示的前提下尽可能多占空间） -->
    <div ref="sheetsContainerRef" class="editor-sheets">
      <SheetsView
        ref="sheetsRef"
        :beats="editor.beats"
        :selected-index="editor.selectedBeatIndex ?? undefined"
        :selected-indices="editor.selectedIndices"
        :is-select-mode="editor.isSelectMode"
        :has-clipboard="editor.clipboard.length > 0"
        :rows-per-page="dynamicRows"
        :playing-beat-index="editor.playingBeatIndex"
        :playing-progress="editor.playingProgress"
        :fading-beat-indices="editor.fadingBeatIndices"
        @select="handleSelectBeat"
        @add-beat="editor.addBeat"
        @start-selection="(i: number) => editor.startSelectionFrom(i)"
        @select-to="(i: number) => { editor.rangeSelectTo(i); editor.isSelectMode = false }"
        @context-select="(i: number) => { editor.selectedBeatIndex = i }"
        @context-deselect="(i: number) => { editor.clearMultiSelection(); editor.selectedBeatIndex = i }"
        @context-copy="() => editor.copyBeats()"
        @context-cut="() => editor.cutBeats()"
        @context-delete="() => editor.deleteSelectedBeats()"
        @paste-before="(i: number) => editor.pasteBeatsBefore(i)"
        @paste-after="(i: number) => editor.pasteBeatsAfter(i)"
      />
    </div>

    <!-- KeyPad 音键面板（底部居中） -->
    <div class="editor-keypad">
      <KeyPad
        :active-keys="editor.activeKeys"
        :sound-enabled="editor.soundEnabled"
        :sound-volume="editor.soundVolume"
        :disabled="editor.selectedIndices.size > 1"
        @key-click="editor.toggleNoteKey"
      />
    </div>
  </div>
</template>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ─── Sheets（弹性撑满，但 KeyPad 保持可见） ─── */
.editor-sheets {
  flex: 1;
  min-height: 0;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-card-bg, #ffffff);
  padding: 4px 12px;
  overflow: hidden;
}

/* ─── KeyPad（底部固定） ─── */
.editor-keypad {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-card-bg, #ffffff);
}
</style>

