/**
 * bump-version.js
 *
 * Git commit-msg hook: 从提交信息中提取版本号并自动更新项目版本。
 *
 * 若提交信息匹配 v<major>.<minor>.<patch>（例如 "v1.2.3 新增功能"），
 * 则自动更新 package.json 和 AppHeader.vue 中的版本号，并暂存改动。
 * 若不匹配，静默跳过（适用于小修复提交）。
 *
 * 用法（由 Git hook 调用）：
 *   node scripts/bump-version.js <commit-msg-file>
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── 读取提交信息 ──────────────────────────
const msgFile = process.argv[2]
if (!msgFile) {
  process.exit(0)
}

const msg = readFileSync(msgFile, 'utf-8').trim()

// ─── 匹配版本号 v<major>.<minor>.<patch> ──
const match = msg.match(/\bv(\d+\.\d+\.\d+)\b/)
if (!match) {
  // 没有版本号，正常提交
  process.exit(0)
}

const newVersion = match[1]

// ─── 1. 更新 package.json ─────────────────
const pkgPath = resolve(ROOT, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
if (pkg.version !== newVersion) {
  pkg.version = newVersion
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`  ✔ package.json → v${newVersion}`)
}

// ─── 2. 更新 AppHeader.vue 中的显示版本 ───
const headerPath = resolve(ROOT, 'src/layouts/AppHeader.vue')
let headerContent = readFileSync(headerPath, 'utf-8')

// 替换所有形如 v<数字>.<数字>.<数字> 的版本字符串
const headerRegex = /v\d+\.\d+\.\d+/
if (headerRegex.test(headerContent)) {
  headerContent = headerContent.replace(headerRegex, `v${newVersion}`)
  writeFileSync(headerPath, headerContent, 'utf-8')
  console.log(`  ✔ AppHeader.vue → v${newVersion}`)
}

// ─── 3. 暂存改动 ──────────────────────────
try {
  execSync(`git add "${pkgPath}" "${headerPath}"`, { cwd: ROOT, stdio: 'ignore' })
  console.log('  ✔ 已暂存版本更新')
} catch {
  console.error('  ⚠ 暂存失败，请手动 git add')
}

process.exit(0)
