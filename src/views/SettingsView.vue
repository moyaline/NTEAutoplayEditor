<script setup lang="ts">
/**
 * SettingsView —— 设置面板
 *
 * 设置项：
 *   - 按键音开关
 *   - 按键音音量（开关关闭时不可用）
 *   - Sheet 最大行数（1–4，实际行数由可用高度决定）
 *   - 播放时跟随：关闭后用户选择 Beat 不影响播放
 */

import { useEditorStore } from '@/stores/editor'
import { setSoundEnabled } from '@/utils/notePlayer'

const emit = defineEmits<{ close: [] }>()
const editor = useEditorStore()

function onSoundToggle(val: boolean) {
  editor.soundEnabled = val
  setSoundEnabled(val)
}

const rowOptions = [1, 2, 3, 4]
</script>

<template>
  <div class="settings-view">
    <!-- 标题栏 -->
    <header class="settings-header">
      <button class="settings-back" title="关闭设置" @click="emit('close')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h2 class="settings-title">设置</h2>
    </header>

    <div class="settings-body">
      <!-- ═══ 按键音 ═══ -->
      <section class="settings-section">
        <h3 class="section-title">按键音</h3>

        <!-- 开关 -->
        <label class="settings-row">
          <span class="settings-label">启用按键音</span>
          <button
            class="toggle"
            :class="{ 'toggle--on': editor.soundEnabled }"
            @click="onSoundToggle(!editor.soundEnabled)"
          >
            <span class="toggle-knob"></span>
          </button>
        </label>

        <!-- 音量滑块 -->
        <label class="settings-row" :class="{ 'settings-row--disabled': !editor.soundEnabled }">
          <span class="settings-label">音量</span>
          <div class="slider-group">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="editor.soundVolume"
              :disabled="!editor.soundEnabled"
              class="slider"
              @input="editor.soundVolume = parseFloat(($event.target as HTMLInputElement).value)"
            />
            <span class="slider-value">{{ Math.round(editor.soundVolume * 100) }}%</span>
          </div>
        </label>
      </section>

      <!-- ═══ Sheet 展示 ═══ -->
      <section class="settings-section">
        <h3 class="section-title">乐谱视图</h3>

        <label class="settings-row">
          <span class="settings-label">最大行数</span>
          <select
            class="select"
            :value="editor.rowsPerPage"
            @change="editor.rowsPerPage = parseInt(($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="n in rowOptions"
              :key="n"
              :value="n"
            >{{ n }} 行</option>
          </select>
        </label>

        <label class="settings-row">
          <span class="settings-label">播放时跟随</span>
          <button
            class="toggle"
            :class="{ 'toggle--on': editor.playFollow }"
            @click="editor.playFollow = !editor.playFollow"
          >
            <span class="toggle-knob"></span>
          </button>
        </label>

        <label class="settings-row">
          <span class="settings-label">末尾自动创建</span>
          <button
            class="toggle"
            :class="{ 'toggle--on': editor.autoCreateBeat }"
            @click="editor.autoCreateBeat = !editor.autoCreateBeat"
          >
            <span class="toggle-knob"></span>
          </button>
        </label>

        <label class="settings-row">
          <span class="settings-label">小节时值校验</span>
          <button
            class="toggle"
            :class="{ 'toggle--on': editor.showValidityCheck }"
            @click="editor.showValidityCheck = !editor.showValidityCheck"
          >
            <span class="toggle-knob"></span>
          </button>
        </label>
      </section>

      <!-- ═══ 快捷键 ═══ -->
      <section class="settings-section">
        <h3 class="section-title">快捷键</h3>
        <div class="shortcuts-list">
          <div class="shortcut-row"><kbd>A</kbd><kbd>←</kbd><span>上一个拍</span></div>
          <div class="shortcut-row"><kbd>D</kbd><kbd>→</kbd><span>下一个拍</span></div>
          <div class="shortcut-row"><kbd>Ctrl + A</kbd><kbd>Ctrl + ←</kbd><span>跳转到第一个拍</span></div>
          <div class="shortcut-row"><kbd>Ctrl + D</kbd><kbd>Ctrl + →</kbd><span>跳转到最后一个拍</span></div>
          <div class="shortcut-row"><kbd>Space</kbd><span>播放 / 暂停</span></div>
          <div class="shortcut-row"><kbd>Ctrl + N</kbd><span>新建 Beat</span></div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-page-bg, #f8fafc);
}

/* ─── 标题栏 ─── */
.settings-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: 40px;
  border-bottom: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-card-bg, #ffffff);
  flex-shrink: 0;
}

.settings-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary, #5a6b7a);
  cursor: pointer;
  transition: background 0.1s;
}

.settings-back:hover {
  background: var(--color-border-base, #e2e8f0);
}

.settings-back svg {
  width: 16px;
  height: 16px;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-main, #1a2a3a);
}

/* ─── 内容 ─── */
.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* max-width: 800px; */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.settings-body::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* ─── 分组 ─── */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-placeholder, #a0b0c0);
  margin: 0;
}

/* ─── 行 ─── */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
  transition: opacity 0.2s;
}

.settings-row--disabled {
  opacity: 0.45;
}

.settings-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-main, #1a2a3a);
}

/* ─── 开关 ─── */
.toggle {
  position: relative;
  width: 40px;
  height: 22px;
  border: none;
  border-radius: 11px;
  background: var(--color-border-base, #e2e8f0);
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.toggle--on {
  background: var(--color-primary-400, #00b4d8);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: left 0.2s;
}

.toggle--on .toggle-knob {
  left: 20px;
}

/* ─── 音量滑块 ─── */
.slider-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider {
  width: 120px;
  height: 4px;
  appearance: none;
  background: var(--color-border-base, #e2e8f0);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary-400, #00b4d8);
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.slider:disabled {
  opacity: 0.4;
  cursor: default;
}

.slider:disabled::-webkit-slider-thumb {
  cursor: default;
}

.slider-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #5a6b7a);
  min-width: 36px;
  text-align: right;
}

/* ─── 下拉列表 ─── */
.select {
  padding: 4px 28px 4px 10px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 6px;
  background: var(--color-page-bg, #f8fafc) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%235a6b7a' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right 8px center;
  color: var(--color-text-main, #1a2a3a);
  outline: none;
  cursor: pointer;
  appearance: none;
}

.select:focus {
  border-color: var(--color-primary-300, #48cae4);
}

/* ─── 快捷键列表 ─── */
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.shortcut-row kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  color: var(--color-text-main, #1a2a3a);
  background: var(--color-page-bg, #f8fafc);
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--color-border-base, #e2e8f0);
}

.shortcut-row span {
  color: var(--color-text-secondary, #5a6b7a);
}
</style>
