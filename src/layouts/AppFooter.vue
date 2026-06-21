<script setup lang="ts">
/**
 * AppFooter —— 播放器风格控制栏
 *
 * 左: 状态 + BPM
 * 中: 播放控制（⏮ ⏪ ▶/⏸ ⏩ ⏭）
 * 右: 时值编辑（− [num/den] +） | 引擎版本
 */

import { ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

// ─── nvr 编辑 ────────────────────────────
const numInput = ref('1')
const denInput = ref('2')
const numFocus = ref(false)
const denFocus = ref(false)

function syncNvr() {
  numInput.value = String(editor.currentNvr.num)
  denInput.value = String(editor.currentNvr.den)
}
// 选中 Beat 变化或当前 nvr 变化时同步
watch(() => editor.selectedBeatIndex, syncNvr, { immediate: true })
watch(() => editor.currentNvr, syncNvr, { deep: true })

function commitNum() {
  const num = Math.max(1, parseInt(numInput.value) || 1)
  const den = Math.max(1, Math.min(32, parseInt(denInput.value) || 2))
  editor.updateNvr(num, den)
  syncNvr()
}

function commitDen() {
  const num = Math.max(1, parseInt(numInput.value) || 1)
  const den = Math.max(1, Math.min(32, parseInt(denInput.value) || 2))
  editor.updateNvr(num, den)
  syncNvr()
}

function halve() { editor.nvrHalve(); syncNvr() }
function dbl()   { editor.nvrDouble(); syncNvr() }
</script>

<template>
  <footer class="app-footer">
    <!-- 左侧留空占位，保持中心对称 -->
    <div class="footer-left"></div>

    <!-- ═══ 播放控制（强制居中） ═══ -->
    <div class="footer-center">
      <button class="ctrl" title="跳转首拍 (Ctrl+←)" @click="editor.firstBeat()">
        <svg class="ctrl-icon ctrl-icon--flip" viewBox="0 0 1024 1024" fill="currentColor"><path d="M170.666667 742.4v29.866667c0 32 32 51.2 57.6 36.266666l420.266666-262.4c25.6-17.066667 25.6-55.466667 0-72.533333L228.266667 215.466667c-25.6-17.066667-57.6 4.266667-57.6 36.266666v490.666667M812.8 859.733333c-23.466667 0-42.666667-19.2-42.666667-42.666666V206.933333c0-23.466667 19.2-42.666667 42.666667-42.666666s42.666667 19.2 42.666667 42.666666v608c0 25.6-17.066667 44.8-42.666667 44.8z"/></svg>
      </button>
      <button class="ctrl" title="上一拍 (←)" @click="editor.prevBeat()">
        <svg class="ctrl-icon ctrl-icon--flip" viewBox="0 0 1024 1024" fill="currentColor"><path d="M170.666667 742.4v29.866667c0 32 32 51.2 57.6 36.266666l420.266666-262.4c25.6-17.066667 25.6-55.466667 0-72.533333L228.266667 215.466667c-25.6-17.066667-57.6 4.266667-57.6 36.266666v490.666667"/></svg>
      </button>
      <button
        class="ctrl ctrl--play"
        :title="editor.isPlaying ? '暂停 (Space)' : '播放 (Space)'"
        @click="editor.togglePlay()"
      >
        <svg v-if="editor.isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button class="ctrl" title="下一拍 (→)" @click="editor.nextBeat()">
        <svg class="ctrl-icon" viewBox="0 0 1024 1024" fill="currentColor"><path d="M170.666667 742.4v29.866667c0 32 32 51.2 57.6 36.266666l420.266666-262.4c25.6-17.066667 25.6-55.466667 0-72.533333L228.266667 215.466667c-25.6-17.066667-57.6 4.266667-57.6 36.266666v490.666667"/></svg>
      </button>
      <button class="ctrl" title="跳转尾拍 (Ctrl+→)" @click="editor.lastBeat()">
        <svg class="ctrl-icon" viewBox="0 0 1024 1024" fill="currentColor"><path d="M170.666667 742.4v29.866667c0 32 32 51.2 57.6 36.266666l420.266666-262.4c25.6-17.066667 25.6-55.466667 0-72.533333L228.266667 215.466667c-25.6-17.066667-57.6 4.266667-57.6 36.266666v490.666667M812.8 859.733333c-23.466667 0-42.666667-19.2-42.666667-42.666666V206.933333c0-23.466667 19.2-42.666667 42.666667-42.666666s42.666667 19.2 42.666667 42.666666v608c0 25.6-17.066667 44.8-42.666667 44.8z"/></svg>
      </button>
    </div>

    <!-- ═══ 右侧：时值编辑 ═══ -->
    <div class="footer-right">
      <div class="nvr-box">
        <button class="nvr-btn" title="减半" @click="halve">−</button>
        <div class="nvr-frac">
          <input
            class="nvr-inp"
            :class="{ focus: numFocus }"
            type="text" inputmode="numeric" maxlength="4"
            v-model="numInput"
            @focus="numFocus = true"
            @blur="numFocus = false; commitNum()"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <span class="nvr-slash">/</span>
          <input
            class="nvr-inp"
            :class="{ focus: denFocus }"
            type="text" inputmode="numeric" maxlength="4"
            v-model="denInput"
            @focus="denFocus = true"
            @blur="denFocus = false; commitDen()"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
        </div>
        <button class="nvr-btn" title="加倍" @click="dbl">+</button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ─── 容器 ─── */
.app-footer {
  grid-area: footer;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 72px;
  padding: 0 16px;
  border-top: 1px solid var(--color-border-base, #e2e8f0);
  background: var(--color-card-bg, #ffffff);
  user-select: none;
}



/* ─── 播放控制 ─── */
.footer-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary, #5a6b7a);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, transform 0.1s;
}
.ctrl:hover {
  background: var(--color-border-base, #e2e8f0);
  color: var(--color-text-main, #1a2a3a);
}
.ctrl:active {
  transform: scale(0.92);
}
.ctrl svg,
.ctrl-icon {
  width: 20px;
  height: 20px;
}

.ctrl-icon--flip {
  transform: scaleX(-1);
}

.ctrl--play {
  width: 40px;
  height: 38px;
  border-radius: 10px;
  background: var(--color-primary-50, #e8f7fa);
  color: var(--color-primary-500, #0096b7);
}
.ctrl--play:hover {
  background: var(--color-primary-100, #d0eff8);
}

.footer-center {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ─── 右侧 ─── */
.footer-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* 时值编辑 */
.nvr-box {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 8px;
  background: var(--color-page-bg, #f8fafc);
  border: 1px solid var(--color-border-base, #e2e8f0);
}

.nvr-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 30px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--color-text-secondary, #5a6b7a);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  line-height: 1;
}
.nvr-btn:hover {
  background: var(--color-border-base, #e2e8f0);
  color: var(--color-text-main, #1a2a3a);
}

.nvr-frac {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nvr-inp {
  width: 36px;
  padding: 2px 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-main, #1a2a3a);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  outline: none;
  transition: border-color 0.15s;
}
.nvr-inp.focus {
  border-bottom-color: var(--color-primary-400, #00b4d8);
}

.nvr-slash {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-placeholder, #a0b0c0);
}

/* ─── 移动端 ─── */
@media (max-width: 767px) {
  .app-footer {
    height: 56px;
    padding: 0 8px;
  }
  .ctrl {
    width: 30px;
    height: 30px;
  }
  .ctrl svg,
  .ctrl-icon {
    width: 16px;
    height: 16px;
  }
  .ctrl--play {
    width: 34px;
    height: 32px;
  }
  .footer-center {
    gap: 3px;
  }
  .nvr-box {
    padding: 2px 4px;
  }
  .nvr-btn {
    width: 24px;
    height: 26px;
    font-size: 15px;
  }
  .nvr-inp {
    width: 28px;
    font-size: 12px;
  }
  .nvr-slash {
    font-size: 13px;
  }
}
</style>
