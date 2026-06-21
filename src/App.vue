<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppFooter from '@/layouts/AppFooter.vue'

const router = useRouter()
const editor = useEditorStore()
const sidebarOpen = ref(window.innerWidth >= 768)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
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

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="app-layout">
    <AppHeader
      @toggle-sidebar="toggleSidebar"
      @toggle-fullscreen="toggleFullscreen"
    />

    <!-- 遮罩（仅移动端可见） -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    ></div>

    <main class="app-main flex overflow-hidden">
      <AppSidebar :class="{ 'sidebar--open': sidebarOpen }" />
      <section class="app-content flex-1 overflow-auto bg-(--color-page-bg)">
        <router-view />
      </section>
    </main>

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

/* ─── 遮罩（仅移动端） ─── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(0, 0, 0, 0.3);
}

@media (max-width: 767px) {
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
@media (min-width: 768px) {
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
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(90deg); }
}

@media (max-width: 767px) and (orientation: portrait) {
  .rotate-hint {
    display: flex;
  }
}
</style>
