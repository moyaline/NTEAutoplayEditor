<script setup lang="ts">
/**
 * KeyPad —— 自动演奏音键面板
 *
 * 36 个键 (C4–B6)，三行排列（高音/中音/低音），每行 12 个键。
 * 盘子样式：大圆黑边描边 + 内嵌小圆 + 中央音名。
 */
import { watch } from 'vue'
import { playNote, setSoundVolume } from '@/utils/notePlayer'

const props = defineProps<{
  activeKeys?: string[]
  soundEnabled?: boolean
  soundVolume?: number
}>()

const emit = defineEmits<{
  keyClick: [keyId: string]
}>()

// 音量变化时同步到播放器
watch(() => props.soundVolume, (v) => {
  if (v !== undefined) setSoundVolume(v)
}, { immediate: true })

function handleKeyClick(keyId: string) {
  if (props.soundEnabled !== false) {
    playNote(keyId)
  }
  emit('keyClick', keyId)
}

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

function keyId(note: Note, octave: number): string {
  return `${note}${octave}`
}
</script>

<template>
  <div class="keypad">
    <div
      v-for="row in rows"
      :key="row.octave"
      class="keypad-row"
    >
      <div class="keypad-tag">
        <span>{{ row.label }}</span>
      </div>
      <div class="keypad-keys">
        <div
          v-for="note in NOTES"
          :key="keyId(note, row.octave)"
          class="keypad-key"
          :class="{ 'keypad-key--active': activeKeys?.includes(keyId(note, row.octave)) }"
          @click="handleKeyClick(keyId(note, row.octave))"
        >
          <div class="keypad-key-plate">
            <div class="keypad-key-plate-inner">
              <span class="keypad-key-note">{{ note }}</span>
              <span class="keypad-key-octave">{{ row.octave }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Container ─── */
.keypad {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 20px 25px;
  user-select: none;
}

/* ─── Row ─── */
.keypad-row {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* ─── Register Tag ─── */
.keypad-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 52px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary, #5a6b7a);
  letter-spacing: 0.5px;
}

.keypad-tag-icon {
  width: 16px;
  height: 16px;
  opacity: 0.6;
}

/* ─── Keys Grid ─── */
.keypad-keys {
  display: flex;
  gap: 18px;
}

/* ─── Individual Key ─── */
.keypad-key {
  cursor: pointer;
  transition: transform 0.1s ease;
}

.keypad-key:hover {
  transform: scale(1.08);
}

.keypad-key:active {
  transform: scale(0.95);
}

/* ─── Plate: 大圆套小圆 ─── */
.keypad-key-plate {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 2.5px solid #2a3a4a;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.keypad-key-plate-inner {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.15s;
}

.keypad-key-note {
  font-size: 14px;
  font-weight: 700;
  color: #1a2a3a;
  line-height: 1;
}

.keypad-key-octave {
  font-size: 9px;
  font-weight: 500;
  color: var(--color-text-placeholder, #a0b0c0);
  line-height: 1;
  margin-top: 1px;
}

/* ─── Active / Highlighted State ─── */
.keypad-key--active .keypad-key-plate {
  border-color: var(--color-primary-400, #00b4d8);
  box-shadow: inset 0 0 0 2.5px var(--color-primary-400, #00b4d8),
              0 0 0 2.5px rgba(0, 180, 216, 0.2);
}

/* ─── Dark Mode ─── */
.dark .keypad-key-plate {
  background: #142834;
  border-color: #4a5a6a;
}

.dark .keypad-key-plate-inner {
  background: #0b1a26;
}

.dark .keypad-key-note {
  color: #e8f0f8;
}

.dark .keypad-key--active .keypad-key-plate {
  border-color: var(--color-primary-300, #48cae4);
  box-shadow: inset 0 0 0 2px var(--color-primary-300, #48cae4),
              0 0 0 2px rgba(72, 202, 228, 0.25);
}

/* ─── 移动端缩放 ─── */
@media (orientation: landscape) and (max-height: 500px) {
  .keypad {
    gap: 8px;
    padding: 12px 14px;
  }
  .keypad-row {
    gap: 10px;
  }
  .keypad-tag {
    width: 36px;
    font-size: 11px;
  }
  .keypad-keys {
    gap: 10px;
  }
  .keypad-key-plate {
    width: 32px;
    height: 32px;
    border-width: 2px;
  }
  .keypad-key-plate-inner {
    width: 25px;
    height: 25px;
  }
  .keypad-key-note {
    font-size: 10px;
  }
  .keypad-key-octave {
    font-size: 7px;
  }
}
</style>
