/**
 * install-hooks.js
 *
 * 将 .githooks 注册为 Git hooks 目录。
 * 运行: node scripts/install-hooks.js
 */

import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const hooksDir = resolve(ROOT, '.githooks')

try {
  execSync(`git config core.hooksPath "${hooksDir}"`, { cwd: ROOT, stdio: 'inherit' })
  console.log(`✔ Git hooks 目录已设为: ${hooksDir}`)
} catch (e) {
  console.error('✖ 设置 hooksPath 失败:', e.message)
  process.exit(1)
}
