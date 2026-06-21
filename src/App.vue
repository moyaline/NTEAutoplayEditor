<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppFooter from '@/layouts/AppFooter.vue'

const router = useRouter()
const editor = useEditorStore()
const sidebarOpen = ref(window.innerHeight > 500)
const isFullscreen = ref(!!document.fullscreenElement)

function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
}

/** 锁定横屏（静默失败） */
async function lockLandscape() {
    if (!screen.orientation?.lock) return
    try {
        await screen.orientation.lock('landscape')
    } catch { /* 浏览器不支持或拒绝 */ }
}

/** 解锁方向 */
function unlockOrientation() {
    if (!screen.orientation?.unlock) return 
    try { screen.orientation.unlock() } catch { /* 忽略 */ }
}

/** 全屏切换 */
async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen()
            await lockLandscape()
        } else {
            await document.exitFullscreen()
            unlockOrientation()
        }
    } catch (err) {
        console.error('全屏切换异常:', err)
    }
}

/** 全屏状态变化 */
function onFsChange() {
    const now = !!document.fullscreenElement
    isFullscreen.value = now
    if (now) {
        lockLandscape()
    } else {
        unlockOrientation()
    }
}

/** 方向变化时若在全屏中则重新锁定横屏 */
function onOrientationChange() {
    if (document.fullscreenElement) {
        lockLandscape()
    }
}

function handleKeydown(e: KeyboardEvent) {
    if (router.currentRoute.value.path !== '/') return
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return

    const ctrl = e.ctrlKey || e.metaKey

    if (ctrl && e.key === 'ArrowLeft') {
        e.preventDefault()
        editor.firstBeat()
    } else if (ctrl && e.key === 'ArrowRight') {
        e.preventDefault()
        editor.lastBeat()
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        editor.prevBeat()
    } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        editor.nextBeat()
    } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        editor.togglePlay()
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    document.addEventListener('fullscreenchange', onFsChange)
    if (screen.orientation) {
        screen.orientation.addEventListener('change', onOrientationChange)
    } else {
        window.addEventListener('orientationchange', onOrientationChange)
    }
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('fullscreenchange', onFsChange)
    if (screen.orientation) {
        screen.orientation.removeEventListener('change', onOrientationChange)
    } else {
        window.removeEventListener('orientationchange', onOrientationChange)
    }
})
</script>

<template>
    <div class="app-layout">
        <AppHeader @toggle-sidebar="toggleSidebar" @toggle-fullscreen="toggleFullscreen" />

        <!-- 遮罩（仅移动端可见） -->
        <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

        <main class="app-main flex overflow-hidden">
            <AppSidebar :class="{ 'sidebar--open': sidebarOpen }" />
            <section class="app-content flex-1 overflow-auto bg-(--color-page-bg)">
                <router-view />
            </section>
        </main>

        <AppFooter />

        <!-- 未保存确认对话框 -->
        <div v-if="editor.showSaveDialog" class="save-dialog-overlay" @click="editor.cancelAction()">
            <div class="save-dialog-card" @click.stop>
                <p class="save-dialog-text">当前乐谱已修改，是否保存？</p>
                <div class="save-dialog-actions">
                    <button class="save-btn save-btn--primary" @click="editor.saveAndProceed()">保存</button>
                    <button class="save-btn save-btn--secondary" @click="editor.discardAndProceed()">不保存</button>
                    <button class="save-btn save-btn--ghost" @click="editor.cancelAction()">取消</button>
                </div>
            </div>
        </div>

        <!-- 移动端竖屏提示（全屏时隐藏） -->
        <div v-show="!isFullscreen" class="rotate-hint">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="1.5">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            <p>请旋转设备至横屏获得最佳体验</p>
        </div>
    </div>
</template>

<style scoped>
.app-layout {
    display: grid;
    grid-template-areas:
        "header"
        "main"
        "footer";
    grid-template-rows: auto 1fr auto;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.app-main {
    grid-area: main;
}

/* ─── 遮罩（仅移动端） ─── */
.sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 45;
    background: rgba(0, 0, 0, 0.3);
}

/* ─── 移动端（横屏 + 小高度） ─── */
@media (orientation: landscape) and (max-height: 500px) {
    .sidebar-overlay {
        display: block;
    }

    .app-sidebar {
        position: fixed;
        top: 0;
        left: -280px;
        z-index: 50;
        height: 100vh;
        transition: left 0.25s ease;
    }

    .app-sidebar.sidebar--open {
        left: 0;
    }
}

/* ─── 桌面端侧边栏折叠 ─── */
@media (min-height: 501px) {
    .app-sidebar {
        transition: width 0.25s ease, opacity 0.2s ease;
        overflow: hidden;
    }

    .app-sidebar:not(.sidebar--open) {
        width: 0 !important;
        padding: 0;
        border: none;
        opacity: 0;
    }
}

/* ─── 竖屏旋转提示 ─── */
.rotate-hint {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 999;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--color-page-bg, #f8fafc);
    color: var(--color-text-secondary, #5a6b7a);
    font-size: 15px;
    font-weight: 500;
    text-align: center;
    padding: 32px;
}

.rotate-hint svg {
    width: 48px;
    height: 48px;
    animation: rotate-phone 2s ease-in-out infinite;
}

@keyframes rotate-phone {

    0%,
    100% {
        transform: rotate(0deg);
    }

    50% {
        transform: rotate(90deg);
    }
}

@media (orientation: portrait) and (max-width: 500px) {
    .rotate-hint {
        display: flex;
    }
}

/* ─── 未保存确认对话框 ─── */
.save-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
}

.save-dialog-card {
    min-width: 280px;
    max-width: 360px;
    background: var(--color-card-bg, #fff);
    border: 1px solid var(--color-border-base, #e2e8f0);
    border-radius: 12px;
    padding: 24px 20px 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.save-dialog-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-main, #1a2a3a);
    margin: 0 0 18px;
    text-align: center;
}

.save-dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.save-btn {
    padding: 7px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity 0.12s;
}

.save-btn:hover {
    opacity: 0.85;
}

.save-btn--primary {
    background: var(--color-primary-500, #0096b7);
    color: #fff;
    border-color: var(--color-primary-500, #0096b7);
}

.save-btn--secondary,
.save-btn--ghost {
    background: transparent;
    color: var(--color-text-secondary, #5a6b7a);
    border-color: var(--color-border-base, #e2e8f0);
}
</style>
