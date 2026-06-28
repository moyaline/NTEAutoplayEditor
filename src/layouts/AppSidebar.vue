<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cumulativeToLabel } from '@/utils/sheetParser'

const editor = useEditorStore()
const fileInput = ref<HTMLInputElement | null>(null)

function handleNew() {
  editor.confirmSaveBefore(() => editor.newSheet())
}

function handleOpen() {
  editor.confirmSaveBefore(() => fileInput.value?.click())
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 从文件名提取乐谱名（去掉扩展名）
  editor.fileName = file.name.replace(/\.[^.]+$/, '')

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    try {
      editor.loadSheet(text)
    } catch {
      alert('无法解析乐谱文件，请检查 JSON 格式')
    }
  }
  reader.readAsText(file)

  // 重置 input，允许重复选择同一文件
  input.value = ''
}

function handleSave() {
  const json = editor.exportSheet()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${editor.fileName || '未命名乐谱'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const totalBeats = computed(() => editor.beats.length)

const totalNotes = computed(() =>
  editor.beats.reduce((sum, b) => sum + b.keys.length, 0)
)

const avgNotes = computed(() =>
  totalBeats.value > 0 ? (totalNotes.value / totalBeats.value).toFixed(1) : '0'
)

const totalDuration = computed(() => {
  const len = editor.beats.length
  if (len === 0) return '0'
  const last = editor.beats[len - 1]
  if (!last) return '0'
  return cumulativeToLabel(last.cumulative + last.nvr)
})

// ─── BPM 编辑（延迟到 blur 才提交，避免输入时被钳制） ──
const bpmInput = ref(String(editor.bpm))
watch(() => editor.bpm, (v) => { bpmInput.value = String(v) })

function commitBpm() {
  const val = Math.max(20, Math.min(300, parseInt(bpmInput.value) || 120))
  editor.setBpm(val)
  bpmInput.value = String(val)
}

// ─── 拍号编辑 ──
const tsNumInput = ref(String(editor.tsNum))
const tsDenInput = ref(String(editor.tsDen))

function syncTs() {
  tsNumInput.value = String(editor.tsNum)
  tsDenInput.value = String(editor.tsDen)
}
watch(() => editor.tsNum, syncTs, { immediate: true })
watch(() => editor.tsDen, syncTs, { immediate: true })

function commitTsNum() {
  const num = Math.max(1, parseInt(tsNumInput.value) || 4)
  const den = Math.max(1, Math.min(32, parseInt(tsDenInput.value) || 4))
  editor.setTimeSignature(num, den)
  syncTs()
}

function commitTsDen() {
  const num = Math.max(1, parseInt(tsNumInput.value) || 4)
  const den = Math.max(1, Math.min(32, parseInt(tsDenInput.value) || 4))
  editor.setTimeSignature(num, den)
  syncTs()
}
</script>

<template>
  <aside class="app-sidebar flex flex-col border-r border-(--color-border-base) bg-(--color-card-bg)">
    <!-- 文件操作（横排） -->
    <div class="flex flex-col gap-3 p-4">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-(--color-text-secondary)">文件操作</h2>
      <div class="flex items-center gap-2">
        <button
          class="sidebar-file-btn"
          title="新建乐谱"
          @click="handleNew"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新建</span>
        </button>
        <button
          class="sidebar-file-btn"
          title="打开乐谱"
          @click="handleOpen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>打开</span>
        </button>
        <button
          class="sidebar-file-btn sidebar-file-btn--primary"
          title="保存乐谱"
          @click="handleSave"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17,21 17,13 7,13 7,21" />
            <polyline points="7,3 7,8 15,8" />
          </svg>
          <span>保存</span>
        </button>
      </div>
    </div>

    <div class="mx-3 border-t border-(--color-border-base)"></div>

    <!-- 参数配置 -->
    <div class="flex flex-col gap-3 p-4">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-(--color-text-secondary)">参数配置</h2>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm text-(--color-text-secondary)">文件名</label>
        <input
          class="sidebar-input"
          type="text"
          :value="editor.fileName"
          @input="editor.fileName = ($event.target as HTMLInputElement).value"
          placeholder="未命名乐谱"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm text-(--color-text-secondary)">歌曲 BPM</label>
        <input
          class="sidebar-input sidebar-input--mono"
          type="number"
          min="20" max="300"
          v-model="bpmInput"
          @blur="commitBpm"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm text-(--color-text-secondary)">拍号</label>
        <div class="flex items-center gap-1">
          <input
            class="sidebar-input sidebar-input--mono sidebar-input--narrow"
            type="number" min="1" max="32"
            v-model="tsNumInput"
            @blur="commitTsNum"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <span class="text-sm text-(--color-text-placeholder) font-medium">/</span>
          <input
            class="sidebar-input sidebar-input--mono sidebar-input--narrow"
            type="number" min="1" max="32"
            v-model="tsDenInput"
            @blur="commitTsDen"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
        </div>
      </div>
    </div>

    <div class="mx-3 border-t border-(--color-border-base)"></div>

    <!-- 统计信息 -->
    <div class="flex flex-col gap-3 p-4">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-(--color-text-secondary)">统计信息</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{{ totalBeats }}</span>
          <span class="stat-label">总拍数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalNotes }}</span>
          <span class="stat-label">总音符数</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ avgNotes }}</span>
          <span class="stat-label">均每拍音符</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalDuration }}</span>
          <span class="stat-label">总时值（全音符）</span>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件选择器 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="handleFileChange"
    />
  </aside>
</template>

<style scoped>
.app-sidebar {
  grid-area: sidebar;
  width: 270px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.app-sidebar::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.sidebar-input {
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--color-text-main, #1a2a3a);
  background: var(--color-page-bg, #f8fafc);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 7px;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}

.sidebar-input:focus {
  border-color: var(--color-primary-400, #00b4d8);
}

.sidebar-input::placeholder {
  color: var(--color-text-placeholder, #a0b0c0);
}

.sidebar-input::-webkit-inner-spin-button,
.sidebar-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.sidebar-input[type="number"] {
  -moz-appearance: textfield;
}

.sidebar-input--narrow {
  width: 60px;
  text-align: center;
}

/* ─── 统计 ─── */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 8px;
  background: var(--color-page-bg, #f8fafc);
  border: 1px solid var(--color-border-base, #e2e8f0);
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-main, #1a2a3a);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-placeholder, #a0b0c0);
  text-align: center;
  line-height: 1.2;
}

/* ─── 侧边栏文件操作按钮 ─── */
.sidebar-file-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #5a6b7a);
  background: var(--color-page-bg, #f8fafc);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.sidebar-file-btn:hover {
  background: var(--color-border-base, #e2e8f0);
  border-color: var(--color-text-placeholder, #a0b0c0);
}
.sidebar-file-btn--primary {
  color: #fff;
  background: var(--color-primary, #00b4d8);
  border-color: var(--color-primary, #00b4d8);
}
.sidebar-file-btn--primary:hover {
  opacity: 0.9;
  background: var(--color-primary, #00b4d8);
  border-color: var(--color-primary, #00b4d8);
}
</style>

<style scoped>
.app-sidebar {
  grid-area: sidebar;
  width: 220px;
}
</style>
