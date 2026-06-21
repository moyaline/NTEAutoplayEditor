<script setup lang="ts">
/**
 * EditorView —— 编辑器主视图
 *
 * 布局：自上而下
 *   1. Sheets（乐谱预览）
 *   2. 弹性留空
 *   3. KeyPad（音键面板，水平居中于底部）
 */

import { ref, watch } from 'vue'
import KeyPad from '@/components/KeyPad.vue'
import SheetsView from '@/components/SheetsView.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()
const sheetsRef = ref<InstanceType<typeof SheetsView> | null>(null)

// 选中 Beat 变化时自动翻到对应页
watch(() => editor.selectedBeatIndex, (idx) => {
  if (idx !== null) {
    sheetsRef.value?.goToBeat(idx)
  }
})
</script>

<template>
  <div class="editor-view">
    <!-- Sheets 乐谱预览区 -->
    <div class="editor-sheets">
      <SheetsView
        ref="sheetsRef"
        :beats="editor.beats"
        :selected-index="editor.selectedBeatIndex ?? undefined"
        :rows-per-page="editor.rowsPerPage"
        @select="editor.selectBeat"
        @add-beat="editor.addBeat"
      />
    </div>

    <!-- 中间弹性留空 -->
    <div class="editor-space"></div>

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

/* ─── Sheets ─── */
.editor-sheets {
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-card-bg, #ffffff);
  padding: 4px 12px;
}

/* ─── 弹性留空 ─── */
.editor-space {
  flex: 1;
  min-height: 0;
}

/* ─── KeyPad（底部居中） ─── */
.editor-keypad {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-card-bg, #ffffff);
}
</style>

