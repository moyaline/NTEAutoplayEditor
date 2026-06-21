/**
 * storage.ts — 浏览器 localStorage 持久化工具
 */

const PREFIX = 'nte_editor_'

export function load<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 配额超限等静默失败
  }
}
