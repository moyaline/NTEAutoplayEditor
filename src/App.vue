<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import AppHeader from '@/layouts/AppHeader.vue'
import AppSidebar from '@/layouts/AppSidebar.vue'
import AppFooter from '@/layouts/AppFooter.vue'

const router = useRouter()
const editor = useEditorStore()

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

    <!-- Main: Sidebar + Content -->
    <main class="app-main flex overflow-hidden">
      <AppSidebar />
      <section class="app-content flex-1 overflow-auto bg-(--color-page-bg)">
        <router-view />
      </section>
    </main>

    <!-- Footer -->
    <AppFooter />
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
</style>
