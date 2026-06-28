<script setup lang="ts">
/**
 * BeatContextMenu —— Beat 右键菜单（移动端长按）
 *
 * 菜单项：
 * - 开始选择 / 选择到此处
 * - 取消选择
 * - 复制
 * - 剪切
 * - 在前粘贴
 * - 在后粘贴
 * - 删除（红色，最后）
 */

import { computed } from 'vue'

const props = defineProps<{
  x: number
  y: number
  isMobile: boolean
  isSelectMode: boolean
  hasSelection: boolean
  selectionCount: number
  hasClipboard: boolean
}>()

const emit = defineEmits<{
  close: []
  startSelect: []
  selectTo: []
  deselect: []
  copy: []
  cut: []
  pasteBefore: []
  pasteAfter: []
  deleteBeat: []
}>()

const menuLabel = computed(() => props.isSelectMode ? '选择到此处' : '开始选择')
</script>

<template>
  <template v-if="!isMobile">
    <div class="ctx-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')">
      <div class="ctx-dropdown" :style="{ left: x + 'px', top: y + 'px' }" @click.stop>
        <button class="ctx-item" @click="isSelectMode ? emit('selectTo') : emit('startSelect')">
          {{ menuLabel }}
        </button>
        <button v-if="hasSelection && selectionCount > 1" class="ctx-item" @click="emit('deselect')">
          取消选择
        </button>
        <div class="ctx-divider"></div>
        <button class="ctx-item" :disabled="!hasSelection" @click="emit('copy')">复制</button>
        <button class="ctx-item" :disabled="!hasSelection" @click="emit('cut')">剪切</button>
        <div class="ctx-divider"></div>
        <button class="ctx-item" :disabled="!hasClipboard" @click="emit('pasteBefore')">在前粘贴</button>
        <button class="ctx-item" :disabled="!hasClipboard" @click="emit('pasteAfter')">在后粘贴</button>
        <div class="ctx-divider"></div>
        <button class="ctx-item ctx-item--danger" @click="emit('deleteBeat')">删除</button>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="ctx-overlay" @click="emit('close')">
      <div class="ctx-card" @click.stop>
        <header class="ctx-card-header">
          <h3 class="ctx-card-title">操作</h3>
          <button class="ctx-card-close" title="关闭" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>
        <div class="ctx-card-body">
          <button class="ctx-item ctx-item--full" @click="isSelectMode ? emit('selectTo') : emit('startSelect')">
            {{ menuLabel }}
          </button>
          <button v-if="hasSelection && selectionCount > 1" class="ctx-item ctx-item--full" @click="emit('deselect')">
            取消选择
          </button>
          <div class="ctx-divider"></div>
          <button class="ctx-item ctx-item--full" :disabled="!hasSelection" @click="emit('copy')">复制</button>
          <button class="ctx-item ctx-item--full" :disabled="!hasSelection" @click="emit('cut')">剪切</button>
          <div class="ctx-divider"></div>
          <button class="ctx-item ctx-item--full" :disabled="!hasClipboard" @click="emit('pasteBefore')">在前粘贴</button>
          <button class="ctx-item ctx-item--full" :disabled="!hasClipboard" @click="emit('pasteAfter')">在后粘贴</button>
          <div class="ctx-divider"></div>
          <button class="ctx-item ctx-item--full ctx-item--danger" @click="emit('deleteBeat')">删除</button>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
/* ═══ 共享按钮样式 ═══ */
.ctx-item {
  display: block;
  width: 100%;
  padding: 7px 14px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--color-text-main, #1a2a3a);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}

.ctx-item:hover:not(:disabled) {
  background: var(--color-primary-50, #e8f7fa);
  color: var(--color-primary-600, #007a96);
}

.ctx-item:disabled {
  opacity: 0.35;
  cursor: default;
}

.ctx-item--full {
  text-align: center;
  padding: 10px 14px;
  font-size: 14px;
}

.ctx-item--danger {
  color: #e53e3e;
}

.ctx-item--danger:hover:not(:disabled) {
  background: #fff5f5 !important;
  color: #c53030 !important;
}

.ctx-divider {
  height: 1px;
  margin: 3px 8px;
  background: var(--color-border-base, #e2e8f0);
}

/* ═══ 桌面端下拉菜单 ═══ */
.ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: transparent;
}

.ctx-dropdown {
  position: fixed;
  z-index: 301;
  min-width: 140px;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.dark .ctx-dropdown {
  border-color: #2a2a2a;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
}

.dark .ctx-item:hover:not(:disabled) {
  background: #2a2a2a;
}

.dark .ctx-item--danger:hover:not(:disabled) {
  background: #3a1a1a !important;
  color: #fc8181 !important;
}

/* ═══ 移动端弹出卡片 ═══ */
.ctx-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
}

.ctx-card {
  width: 85vw;
  max-width: 320px;
  max-height: 75vh;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ctx-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
  flex-shrink: 0;
}

.ctx-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-main, #1a2a3a);
  margin: 0;
}

.ctx-card-close {
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

.ctx-card-close:hover {
  background: var(--color-border-base, #e2e8f0);
}

.ctx-card-close svg {
  width: 16px;
  height: 16px;
}

.ctx-card-body {
  padding: 8px 12px 12px;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

.dark .ctx-card {
  border-color: #2a2a2a;
}

.dark .ctx-card-header {
  border-color: #2a2a2a;
}
</style>
