<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const emit = defineEmits<{
  'toggle-sidebar': []
  'toggle-fullscreen': []
  'toggle-settings': []
}>()

const editor = useEditorStore()
</script>

<template>
  <header
    class="app-header flex h-14 items-center justify-between border-b border-(--color-border-base) bg-(--color-card-bg) px-5"
  >
    <!-- Left: Sidebar toggle + Logo -->
    <div class="flex items-center gap-2">
      <button
        class="sidebar-btn header-icon-btn"
        title="切换侧边栏"
        @click="emit('toggle-sidebar')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <h1 class="text-sm font-semibold text-(--color-text-main)">NTE Autoplay Editor</h1>
    </div>

    <!-- Center: Quick Actions -->
    <div class="flex items-center gap-2">
      <!-- 追加 Beat -->
      <button
        class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-(--color-text-secondary) hover:bg-(--color-border-base) transition-all"
        title="在当前 beat 后追加一个新 beat"
        :disabled="editor.selectedBeatIndex === null"
        @click="editor.addBeatAfter()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span class="btn-text">添加拍</span>
      </button>

      <span class="h-5 w-px bg-(--color-border-base)"></span>

      <!-- 撤销 -->
      <button
        class="header-icon-btn"
        title="撤销"
        :disabled="editor.undoStack.length === 0"
        @click="editor.undo()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1,4 1,10 7,10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <!-- 重做 -->
      <button
        class="header-icon-btn"
        title="重做"
        :disabled="editor.redoStack.length === 0"
        @click="editor.redo()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23,4 23,10 17,10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>

    <!-- Right: Fullscreen / Settings -->
    <div class="flex items-center gap-2">
      <button
        class="header-icon-btn"
        title="切换全屏"
        @click="emit('toggle-fullscreen')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
      <button
        class="inline-flex items-center rounded-md p-2 text-(--color-text-secondary) hover:bg-(--color-border-base) transition-all"
        title="设置"
        @click="emit('toggle-settings')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <span class="h-5 w-px bg-(--color-border-base)"></span>
      <div class="about-trigger">
        <span class="text-xs text-(--color-text-secondary) cursor-pointer">v0.1.2</span>

        <!-- About 浮窗 -->
        <div class="about-popup">
          <div class="about-card">
            <p class="about-line">
              Made by
              <a href="https://github.com/moyaline/NTEAutoplayEditor" target="_blank" rel="noopener" class="about-link" title="moyaline">
                <svg viewBox="0 0 1024 1024" class="about-icon" xmlns="http://www.w3.org/2000/svg"><path d="M512 85.333333C276.266667 85.333333 85.333333 276.266667 85.333333 512a426.410667 426.410667 0 0 0 291.754667 404.821333c21.333333 3.712 29.312-9.088 29.312-20.309333 0-10.112-0.554667-43.690667-0.554667-79.445333-107.178667 19.754667-134.912-26.112-143.445333-50.133334-4.821333-12.288-25.6-50.133333-43.733333-60.288-14.933333-7.978667-36.266667-27.733333-0.554667-28.245333 33.621333-0.554667 57.6 30.933333 65.621333 43.733333 38.4 64.512 99.754667 46.378667 124.245334 35.2 3.754667-27.733333 14.933333-46.378667 27.221333-57.045333-94.933333-10.666667-194.133333-47.488-194.133333-210.688 0-46.421333 16.512-84.778667 43.733333-114.688-4.266667-10.666667-19.2-54.4 4.266667-113.066667 0 0 35.712-11.178667 117.333333 43.776a395.946667 395.946667 0 0 1 106.666667-14.421333c36.266667 0 72.533333 4.778667 106.666666 14.378667 81.578667-55.466667 117.333333-43.690667 117.333334-43.690667 23.466667 58.666667 8.533333 102.4 4.266666 113.066667 27.178667 29.866667 43.733333 67.712 43.733334 114.645333 0 163.754667-99.712 200.021333-194.645334 210.688 15.445333 13.312 28.8 38.912 28.8 78.933333 0 57.045333-0.554667 102.912-0.554666 117.333334 0 11.178667 8.021333 24.490667 29.354666 20.224A427.349333 427.349333 0 0 0 938.666667 512c0-235.733333-190.933333-426.666667-426.666667-426.666667z" fill="currentColor"/></svg>
                moyaline
              </a>
              &amp;
              <a href="https://deepseek.com" target="_blank" rel="noopener" class="about-link" title="deepseek">
                <svg viewBox="0 0 1391 1024" class="about-icon" xmlns="http://www.w3.org/2000/svg"><path d="M1299.71873948 109.08164852c-12.94676356-6.47485468-18.53640721 5.86654827-26.09973268 12.13814317-2.57756953 2.02376031-4.77807747 4.65435413-6.9785854 7.08168819-18.91788751 20.63528526-41.02017805 34.19182812-69.92725219 32.57311445-42.23384508-2.42733405-78.29772513 11.12773591-110.16384908 44.10589701-6.77679853-40.66668282-29.28560862-64.94444203-63.55255448-80.5232723-17.95608583-8.09209545-36.06388005-16.1856638-48.63358202-33.78825438-8.74900746-12.5431898-11.12773591-26.50330641-15.52727889-40.26016326-2.7823022-8.29535522-5.56460442-16.79249731-14.92044537-18.20942412-10.19244639-1.61871367-14.16337637 7.08168818-18.15934561 14.36516325-15.93232553 29.74073376-22.12880269 62.51710799-21.49692993 95.69705596 1.36684831 74.65672404 32.27117059 134.13819156 93.62469003 176.42358804 6.9800583 4.8546681 8.77551959 9.71080912 6.57501167 16.7910244-4.17271686 14.56695011-9.18056624 28.7303265-13.55506996 43.29727663-2.78377509 9.30723537-6.95501906 11.32952278-16.74241882 7.28347506-33.66158524-14.36516325-62.745407-35.60875491-88.46513227-61.30196805-43.62425973-43.09548975-83.0772755-90.64060097-132.26613965-127.86659668a581.67054343 581.67054343 0 0 0-35.07703915-24.481019c-50.20074429-49.77065841 6.57501167-90.63912807 19.72650787-95.49526908 13.73181759-5.05792788 4.77955037-22.4572587-39.65480261-22.25547183s-85.07599655 15.3770434-136.87041529 35.60875492c-7.58541892 3.03416756-15.55379103 5.25971475-23.69596497 7.08168819-47.03990759-9.10544849-95.84876434-11.12773591-146.85960188-5.26118764-96.02551195 10.92594905-172.73103555 57.25739323-229.12678414 136.36373875-67.72674425 95.09022244-83.68558192 203.13015422-64.13582166 315.82149433 20.48504978 118.76262107 79.88992666 217.09027084 171.13736116 293.9710692 94.6350973 79.71317902 203.61031862 118.76262107 327.93607115 111.27735912 75.51542292-4.45256725 159.57953934-14.77020989 254.41642352-96.71040901 23.92426399 12.13961607 49.03715574 16.99575708 90.66564022 20.63675815 32.09295007 3.03416756 62.97223311-1.61871367 86.87145787-6.67664152 37.45429471-8.09209545 34.84874013-43.49906349 21.3187094-49.97244528-109.7838417-52.19946535-85.68283009-30.95587367-107.58333375-48.15194474 55.78891504-67.37324899 139.85303146-137.3770918 172.73103558-364.17669887 2.60408167-18.00616433 0.40357375-29.33568711 0-43.90263723-0.20325977-8.90218873 1.76894914-12.34287584 11.75960868-13.3532831 27.49014733-3.23742733 54.19671351-10.92594905 78.70277175-24.68280587 71.11440706-39.65480265 99.81822142-104.80250446 106.59649285-182.89844271 1.01188015-11.9363563-0.20178686-24.27775924-12.56970195-30.54935415M679.88691083 811.94067418c-106.36966673-85.37941333-157.98733782-113.5014334-179.30604723-112.28776638-19.92829476 1.21366703-16.33737217 24.48101902-11.96286845 39.65480263 4.5777635 14.97199677 10.57098089 25.2896394 18.94145388 38.44113563 5.76786417 8.70040186 9.76383341 21.64863831-5.78995764 31.35944742-34.26841876 21.64863831-93.82647692-7.28347506-96.60730623-8.69892897-69.3454579-41.67856295-127.33635378-96.710409-168.17978423-171.97249367-39.45154288-72.43117687-62.33888747-150.1220685-66.13306982-233.07267484-1.01188015-20.02992464 4.77955037-27.11161282 24.27923215-30.75408683a235.19659216 235.19659216 0 0 1 77.91771776-2.0222874c108.59668681 16.18713669 201.05631542 65.75453531 278.54394725 144.25552022 44.23256614 44.71125762 77.69089163 98.12439001 112.18613649 150.32385536 36.64567431 55.43394691 76.0986901 108.24024576 126.2994344 151.53604948 17.72778682 15.17378365 31.86465106 26.7065662 45.41972101 35.20370828-40.84343042 4.65435413-108.99878765 5.66476139-155.60860934-31.96628093m51.00936468-334.83953884c0-8.90218873 6.9815312-15.98387693 15.75557788-15.98387693q2.98408908 0.05155138 5.36134465 1.01188016a15.85720779 15.85720779 0 0 1 10.16740716 14.97199677 15.78061715 15.78061715 0 0 1-15.73053865 15.98387692 15.60386953 15.60386953 0 0 1-15.55379104-15.98387692m158.39238445 82.95060636c-10.1423679 4.24930749-20.30830215 7.89178146-30.09570189 8.29535522-15.12370514 0.81009328-31.66286419-5.46150162-40.61513143-13.15002333-13.96011661-11.93782919-23.92573689-18.61447073-28.09845373-39.45301577-1.79546129-8.90218873-0.81009328-22.65904557 0.78505404-30.54935414 3.59092258-16.99575708-0.40504665-27.92023321-12.13961607-37.8343021-9.55910075-8.09356835-21.72522894-10.31911553-35.07703915-10.31911553-4.98281013 0-9.55910075-2.22407429-12.94823646-4.04604772a13.27669246 13.27669246 0 0 1-5.76639126-18.61299785c1.39041466-2.8323807 8.16868608-9.71228202 9.76236049-10.92594903 18.13136058-10.52090241 39.04649623-7.08021529 58.36795747 0.81009328 17.93104659 7.48526194 31.46107731 21.24359167 51.01083759 40.66668278 19.92829476 23.46913885 23.51921733 29.94399353 34.84874012 47.54511124 8.97877936 13.75685685 17.14746545 27.92023321 22.71206985 44.1044241 3.41270206 10.11732865-0.98684091 18.41121097-12.74644957 23.46913885" fill="#4D6BFE"/></svg>
                deepseek
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>

  </header>
</template>


<style scoped>
.app-header {
  grid-area: header;
  -webkit-app-region: drag;
}
.app-header button,
.app-header h1 {
  -webkit-app-region: no-drag;
}

/* ─── 顶栏图标按钮 ─── */
.header-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary, #5a6b7a);
  cursor: pointer;
  transition: background 0.12s;
}
.header-icon-btn:hover {
  background: var(--color-border-base, #e2e8f0);
}
.header-icon-btn svg {
  width: 18px;
  height: 18px;
}

/* ─── About 浮窗 ─── */
.about-trigger {
  position: relative;
  display: inline-flex;
}

.about-trigger .about-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s, transform 0.15s;
  transform: translateY(-4px);
}

/* 悬停桥：从 popup 向上延伸到 trigger，防止鼠标移动时悬停断开 */
.about-trigger .about-popup::before {
  content: '';
  position: absolute;
  top: -16px;
  left: 0;
  right: 0;
  height: 16px;
}

.about-trigger:hover .about-popup,
.about-popup:hover {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.about-card {
  min-width: 200px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--color-card-bg, #ffffff);
  border: 1px solid var(--color-border-base, #e2e8f0);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
}

.about-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary, #5a6b7a);
  margin: 0;
}

.about-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-main, #1a2a3a);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.1s;
}

.about-link:hover {
  color: var(--color-primary-500, #0096b7);
}

.about-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Dark mode popup */
.dark .about-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

/* ─── 移动端 ─── */
@media (orientation: landscape) and (max-height: 500px) {
  .app-header {
    height: 48px;
    padding: 0 10px;
  }
  .app-header h1 {
    font-size: 12px;
  }
  .app-header .btn-text {
    display: none;
  }
}
</style>
