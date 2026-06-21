<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppFooter from '@/layouts/AppFooter.vue'

const router = useRouter()
const editor = useEditorStore()
const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function handleKeydown(e: KeyboardEvent) {
  // 只在编辑器页面生效
  if (router.currentRoute.value.path !== '/') return
  // 输入框中不触发
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

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <AppHeader />

    <!-- 移动端侧边栏遮罩 -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    ></div>

    <!-- 移动端侧边栏切换按钮 -->
    <button class="sidebar-toggle" title="切换侧边栏" @click="toggleSidebar">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <!-- Main: Sidebar + Content -->
    <main class="app-main flex overflow-hidden">
      <AppSidebar :class="{ 'sidebar--open': sidebarOpen }" />
      <section class="app-content flex-1 overflow-auto bg-(--color-page-bg)">
        <router-view />
      </section>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- 移动端竖屏提示 -->
    <div class="rotate-hint">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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

/* ─── 移动端侧边栏 ─── */
.sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 80px;
  left: 8px;
  z-index: 40;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border-base, #e2e8f0);
  border-radius: 8px;
  background: var(--color-card-bg, #ffffff);
  color: var(--color-text-secondary, #5a6b7a);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 0;
}
.sidebar-toggle svg {
  width: 18px;
  height: 18px;
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(0, 0, 0, 0.3);
}

@media (max-width: 767px) {
  .sidebar-toggle {
    display: flex;
  }

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
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(90deg); }
}

@media (max-width: 767px) and (orientation: portrait) {
  .rotate-hint {
    display: flex;
  }
}
</style>
