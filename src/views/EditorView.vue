<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import KeyPad from '@/components/KeyPad.vue'
import SheetsView from '@/components/SheetsView.vue'
import { useEditorStore } from '@/stores/editor'
import { BEAT, SHEETS } from '@/utils/layout'

const editor = useEditorStore()
const sheetsRef = ref<InstanceType<typeof SheetsView> | null>(null)
const sheetsContainerRef = ref<HTMLElement | null>(null)

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
    sheetsRef.value?.goToBeat(idx)
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
        :rows-per-page="dynamicRows"
        @select="editor.selectBeat"
        @add-beat="editor.addBeat"
      />
    </div>

    <!-- KeyPad 音键面板（底部居中） -->
    <div class="editor-keypad">
      <KeyPad
        :active-keys="editor.activeKeys"
        :sound-enabled="editor.soundEnabled"
        :sound-volume="editor.soundVolume"
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

