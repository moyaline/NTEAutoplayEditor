/**
 * notePlayer —— 钢琴按键音播放器
 *
 * 双层引擎：
 * 1. Web Audio API + 预解码缓冲区（零延迟、带压缩器）
 * 2. Audio 元素实例池（可靠回退）
 *
 * 使用 XMLHttpRequest 加载音频数据（不被 adblock 拦截 fetch）。
 */

/** 键 ID → 文件路径 */
function noteUrl(keyId: string): string {
  return `/notes/${keyId.replace('#', 's')}.mp3`
}

const NOTES = ['C4','C#4','D4','Eb4','E4','F4','F#4','G4','G#4','A4','Bb4','B4',
               'C5','C#5','D5','Eb5','E5','F5','F#5','G5','G#5','A5','Bb5','B5',
               'C6','C#6','D6','Eb6','E6','F6','F#6','G6','G#6','A6','Bb6','B6']

// ══════════════════════════════════════════
//  引擎 A：Web Audio API（零延迟）
// ══════════════════════════════════════════

let ctx: AudioContext | null = null
let compressor: DynamicsCompressorNode | null = null
let webReady = false

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new AudioContext()
    compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 30
    compressor.ratio.value = 12
    compressor.attack.value = 0.003
    compressor.release.value = 0.25
    compressor.connect(ctx.destination)
    webReady = true
    return ctx
  } catch { return null }
}

/** 已解码的音频缓冲区缓存 */
const bufCache = new Map<string, AudioBuffer>()

/** 用 XMLHttpRequest 加载并解码一个音频文件（不被 adblock 拦截） */
function loadBufferXhr(key: string): Promise<void> {
  return new Promise((resolve) => {
    const url = noteUrl(key)
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onload = () => {
      const c = ensureCtx()
      if (!c) { resolve(); return }
      c.decodeAudioData(xhr.response)
        .then(buf => { bufCache.set(key, buf); resolve() })
        .catch(() => resolve())
    }
    xhr.onerror = () => resolve()
    xhr.send()
  })
}

// ══════════════════════════════════════════
//  引擎 B：Audio 元素池（回退）
// ══════════════════════════════════════════

const POOL_SIZE = 2
const audioPool = new Map<string, HTMLAudioElement[]>()

/** 初始化全部引擎 */
async function initAll(): Promise<void> {
  // 1. 初始化 AudioContext
  ensureCtx()

  // 2. 加载所有音频缓冲区（Web Audio 用）
  const bufLoads = NOTES.map(k => loadBufferXhr(k))
  
  // 3. 同时创建 Audio 元素池（回退用）
  for (const key of NOTES) {
    const instances: HTMLAudioElement[] = []
    for (let i = 0; i < POOL_SIZE; i++) {
      const a = new Audio(noteUrl(key))
      a.preload = 'auto'
      a.load()
      instances.push(a)
    }
    audioPool.set(key, instances)
  }

  // 等待缓冲区全部加载完毕
  await Promise.allSettled(bufLoads)
  const loaded = Array.from(bufCache.keys()).length
  console.log(`[notePlayer] 就绪：缓冲区 ${loaded}/${NOTES.length}，Audio 池 ${audioPool.size}`)
}

// 页面加载即启动
if (typeof window !== 'undefined') {
  // 延迟一点启动，不干扰首屏渲染
  setTimeout(initAll, 100)
}

// ══════════════════════════════════════════
//  开关 / 音量
// ══════════════════════════════════════════

let soundEnabled = true
let soundVolume = 0.8

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

export function setSoundVolume(volume: number): void {
  soundVolume = Math.max(0, Math.min(1, volume))
}

export function getSoundVolume(): number {
  return soundVolume
}

// ══════════════════════════════════════════
//  播放
// ══════════════════════════════════════════

/**
 * 播放指定键的钢琴音。
 * 优先 Web Audio API（零延迟 + 压缩），回退 Audio 元素池。
 */
export function playNote(keyId: string): void {
  if (!soundEnabled) return

  // ── 方案 A：Web Audio API ──
  const buf = bufCache.get(keyId)
  if (buf && ctx && webReady) {
    if (ctx.state === 'suspended') ctx.resume()
    try {
      const source = ctx.createBufferSource()
      source.buffer = buf
      const gain = ctx.createGain()
      gain.gain.value = soundVolume
      source.connect(gain)
      gain.connect(compressor ?? ctx.destination)
      source.start(0)
      return
    } catch { /* fall through */ }
  }

  // ── 方案 B：Audio 元素池 ──
  const instances = audioPool.get(keyId)
  if (!instances || instances.length === 0) {
    const a = new Audio(noteUrl(keyId))
    a.volume = soundVolume
    a.play().catch(() => {})
    return
  }
  let audio = instances.find(a => a.paused || a.ended)
  if (!audio) audio = instances[0]!
  audio.volume = soundVolume
  audio.currentTime = 0
  audio.play().catch(() => {})
}
