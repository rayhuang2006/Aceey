<template>
  <div class="app-root">
    <!-- Toolbar (old_index.html lines 12-40) -->
    <div id="toolbar">
      <div class="brand">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24" style="vertical-align: middle; margin-right: 8px;">
          <defs>
            <linearGradient id="neon" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#10B981" /><stop offset="100%" stop-color="#3B82F6" />
            </linearGradient>
            <linearGradient id="tickNeon" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#32FF7E" /><stop offset="100%" stop-color="#18BC9C" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="24" fill="#0D1117" />
          <path d="M 40 25 L 20 50 L 40 75" stroke="#30363D" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 50 25 L 80 75" stroke="url(#neon)" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 40 55 L 50 65 L 68 45" stroke="url(#tickNeon)" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Aceey
      </div>
      <div class="actions">
        <button id="run-btn" @click="handleRun"><span class="icon">▶</span> Run</button>
        <button id="clear-btn" @click="handleClear">Clear</button>
        <button id="calendar-btn" @click="toggleCalendar" :style="{ backgroundColor: calendarActive ? 'var(--bg-panel)' : 'transparent' }">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Calendar
        </button>
        <button id="settings-btn" @click="openSettings">⚙</button>
      </div>
    </div>

    <!-- Main IDE Content (old_index.html lines 42-93) -->
    <Transition name="fade" mode="out-in">
      <div id="main-content" class="ide-layout" v-if="activeView === 'ide'">
        <div class="problem-panel">
          <Sidebar />
        </div>
        <div id="resizer-horizontal" class="resizer" @mousedown="startResizeH"></div>
        <div class="workspace-panel">
          <div class="editor-container" :style="{ flex: `0 0 ${editorHeight}%` }">
            <EditorPane ref="editorPaneRef" />
          </div>
          <div class="resizer-y" @mousedown.prevent="startResizeV" :class="{ active: isDraggingY }"></div>
          <div class="testcase-container" style="flex: 1; min-height: 0;">
            <TestCasePanel />
          </div>
        </div>
      </div>

      <!-- Calendar View (old_index.html lines 95-129) -->
      <CalendarView v-else-if="activeView === 'calendar'" />

      <!-- Settings View (old_index.html lines 167-272) -->
      <SettingsView v-else-if="activeView === 'settings'" @close="activeView = 'ide'" />
    </Transition>

    <!-- Rating Modal -->
    <RatingModal />

    <!-- Plan Review Modal -->
    <PlanReviewModal />

    <!-- Status Bar (old_index.html lines 274-300) -->
    <StatusBar />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import EditorPane from './components/EditorPane.vue';
import TestCasePanel from './components/TestCasePanel.vue';
import CalendarView from './components/CalendarView.vue';
import SettingsView from './components/SettingsView.vue';
import RatingModal from './components/RatingModal.vue';
import PlanReviewModal from './components/PlanReviewModal.vue';
import StatusBar from './components/StatusBar.vue';
import { activeView, calendarActive, initApp, testCases, activeTcId } from './store';

const editorPaneRef = ref(null);
const editorHeight = ref(60);
const isDraggingY = ref(false);

onMounted(async () => {
  await initApp();
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});
onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});

// --- Button Handlers (from old main.js) ---
function handleRun() {
  if (editorPaneRef.value?.runCode) {
    editorPaneRef.value.runCode();
  }
}

function handleClear() {
  if (editorPaneRef.value?.clearEditor) {
    editorPaneRef.value.clearEditor();
  }
  testCases.forEach(tc => {
    tc.actual_output = "";
    tc.verdict = "-";
    tc.time_ms = 0;
    tc.error = null;
  });
}

function toggleCalendar() {
  if (activeView.value === 'calendar') {
    activeView.value = 'ide';
    calendarActive.value = false;
  } else {
    activeView.value = 'calendar';
    calendarActive.value = true;
  }
}

function openSettings() {
  activeView.value = 'settings';
}

// --- Resizer Logic ---
let isResizingH = false;

function startResizeH() { isResizingH = true; document.body.style.cursor = 'col-resize'; }
function startResizeV() { isDraggingY.value = true; document.body.style.cursor = 'row-resize'; }

function onMouseMove(e) {
  if (isResizingH) {
    const pct = (e.clientX / window.innerWidth) * 100;
    if (pct > 10 && pct < 90) {
      const pp = document.querySelector('.problem-panel');
      if (pp) pp.style.flex = `0 0 ${pct}%`;
    }
  }
  if (isDraggingY.value) {
    const ws = document.querySelector('.workspace-panel');
    if (!ws) return;
    const rect = ws.getBoundingClientRect();
    let newHeightPercentage = ((e.clientY - rect.top) / ws.clientHeight) * 100;
    
    if (newHeightPercentage < 20) newHeightPercentage = 20;
    if (newHeightPercentage > 80) newHeightPercentage = 80;
    
    editorHeight.value = newHeightPercentage;
  }
}

function onMouseUp() {
  isResizingH = false;
  isDraggingY.value = false;
  document.body.style.cursor = 'default';
}
</script>

<style>
.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.fade-enter-active, .fade-leave-active { 
  transition: opacity 0.15s ease; 
}
.fade-enter-from, .fade-leave-to { 
  opacity: 0; 
}
</style>
