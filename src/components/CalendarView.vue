<template>
  <div id="calendar-view">
    <div class="calendar-header">
      <div class="calendar-nav">
        <button id="calendar-prev-btn" @click="prevMonth">‹ 上月</button>
        <h2>{{ currentYear }}年 {{ currentMonth + 1 }}月</h2>
        <button id="calendar-next-btn" @click="nextMonth">下月 ›</button>
      </div>
      <button id="calendar-refresh-btn" @click="loadContests">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> 重新整理
      </button>
    </div>

    <!-- Agent Notification Bar -->
    <div id="agent-notification-bar" v-if="notificationText && !isNotificationDismissed" @click="handleNotificationClick" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div class="notification-content">
        <span class="info-icon">i</span> <span>{{ notificationText }}</span>
      </div>
      <span class="close-btn" @click.stop="isNotificationDismissed = true" style="font-size: 16px; padding: 0 8px;">×</span>
    </div>

    <div v-if="loading" id="calendar-loading" style="display: block; margin-bottom: 10px;">載入比賽中...</div>
    <div v-if="errorMsg" id="calendar-error" style="display: block; margin-bottom: 10px;">{{ errorMsg }}</div>

    <div id="calendar-content">
      <div id="calendar-grid-container">
        <div class="calendar-grid-header">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>
        <div class="calendar-grid">
          <div v-for="i in startOffset" :key="'empty-'+i" class="calendar-cell empty-cell"></div>
          <div v-for="day in totalDays" :key="day"
               class="calendar-cell"
               :class="{ selected: selectedDay === day }"
               @click="selectDay(day, $event)">
            <div class="cell-date" :class="{ today: isToday(day) }">{{ day }}</div>
            <div class="cell-bars-compact">
              <div v-for="c in getContestsForDay(day).slice(0, 3)" :key="c.name"
                   class="platform-bar" :class="getPlatformClass(c.platform)">
                {{ getPlatformAbbr(c.platform) }}
              </div>
              <div class="more-bars" v-if="getContestsForDay(day).length > 3">+{{ getContestsForDay(day).length - 3 }} more</div>
              
              <div class="cell-dots-container" v-if="getTrainingTasksForDay(day).length > 0">
                <div class="training-dot" v-for="(t, idx) in getTrainingTasksForDay(day)" :key="idx"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Popover -->
    <div v-if="selectedDay" class="calendar-popover" :style="popoverStyle">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px; color: #fff;">{{ currentMonth + 1 }}月{{ selectedDay }}日</h3>
        <button @click.stop="selectedDay = null" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px; line-height: 1;">×</button>
      </div>

      <!-- Training Tasks Section -->
      <div v-if="selectedDayTrainingTasks.length > 0" style="margin-bottom: 12px; border-bottom: 1px solid #444; padding-bottom: 8px;">
        <div style="font-weight: bold; color: var(--accent-purple, #b388ff); font-size: 14px; margin-bottom: 8px;">◆ 練習任務</div>
        <label v-for="(task, idx) in selectedDayTrainingTasks" :key="idx" class="todo-item" style="margin-left: 4px; display: flex; align-items: flex-start; margin-bottom: 6px; cursor: pointer;">
          <input type="checkbox" v-model="task.completed" style="margin-top: 3px; margin-right: 6px;">
          <span class="todo-text" style="font-size: 13px; line-height: 1.4;">[{{ task.topic }}] {{ task.problem }} ({{ task.source }}) - {{ task.difficulty }}</span>
        </label>
      </div>

      <!-- Contests Section -->
      <div v-if="selectedDayContests.length === 0 && selectedDayTrainingTasks.length === 0" style="color: #888; text-align: center; padding: 10px 0;">這天沒有比賽或任務</div>
      <div v-if="selectedDayContests.length > 0">
        <div style="font-weight: bold; color: #fff; font-size: 14px; margin-bottom: 8px;">◆ 競賽時程</div>
        <div v-for="c in selectedDayContests" :key="c.name" style="padding: 12px 0; border-bottom: 1px solid #333;">
          <div class="contest-title" style="font-weight: 500; margin-bottom: 4px;">{{ c.name }}</div>
          <div class="contest-time" style="color: #aaa; font-size: 13px; margin-bottom: 8px;">{{ formatTime(c) }}</div>
          <div style="display: flex; gap: 8px;">
            <button v-if="isFuture(c)" class="want-to-compete-btn" @click="openRatingModal(c)">想打這場</button>
            <button class="open-link-btn" @click="openExternal(c.url)">開啟</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { appSettings, openExternal } from '../store';
import { calendarState } from './calendarState.js';

const loading = ref(false);
const errorMsg = ref('');
const notificationText = ref('');
const isNotificationDismissed = ref(false);

const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());
const selectedDay = ref(null);
const popoverStyle = ref({});

const contestsCache = ref([]);
const trainingPlans = ref([]);

const startOffset = computed(() => new Date(currentYear.value, currentMonth.value, 1).getDay());
const totalDays = computed(() => new Date(currentYear.value, currentMonth.value + 1, 0).getDate());

function parseDate(s) {
  if (!s) return new Date();
  if (s instanceof Date) return s;
  if (s.includes('Z') || s.includes('+') || (s.includes('T') && s.split('-').length > 3)) return new Date(s);
  if (s.includes(' ') && !s.includes('T')) return new Date(s.replace(' ', 'T') + 'Z');
  return new Date(s.includes('T') ? (s.endsWith('Z') ? s : s + 'Z') : s);
}

const isToday = (day) => {
  const now = new Date();
  return now.getFullYear() === currentYear.value && now.getMonth() === currentMonth.value && now.getDate() === day;
};

const getContestsForDay = (day) => {
  if (!contestsCache.value) return [];
  return contestsCache.value.filter(c => {
    const dt = parseDate(c.start_time);
    return dt.getDate() === day && dt.getMonth() === currentMonth.value && dt.getFullYear() === currentYear.value;
  });
};

const getTrainingTasksForDay = (day) => {
  if (!trainingPlans.value) return [];
  const localIsoDate = new Date(currentYear.value, currentMonth.value, day).toLocaleDateString('en-CA');
  const tasks = [];
  trainingPlans.value.forEach(plan => {
    plan.tasks.forEach(task => {
      if (task.date === localIsoDate) tasks.push(task);
    });
  });
  return tasks;
};

const selectedDayContests = computed(() => {
  if (!selectedDay.value) return [];
  return (contestsCache.value || []).filter(c => {
    const dt = parseDate(c.start_time);
    return dt.getDate() === selectedDay.value && dt.getMonth() === currentMonth.value && dt.getFullYear() === currentYear.value;
  });
});

const selectedDayTrainingTasks = computed(() => {
  if (!selectedDay.value) return [];
  return getTrainingTasksForDay(selectedDay.value);
});

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatTime(c) {
  const startDt = parseDate(c.start_time);
  const startStr = startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const endDt = parseDate(c.end_time);
  const endStr = endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${startStr} — ${endStr} (${formatDuration(c.duration_minutes)})`;
}

function isFuture(c) {
  const dt = parseDate(c.start_time);
  return dt > new Date();
}

function getPlatformClass(p) {
  if (!p) return '';
  p = p.toLowerCase();
  if (p.includes('codeforces')) return 'platform-codeforces';
  if (p.includes('leetcode')) return 'platform-leetcode';
  if (p.includes('atcoder')) return 'platform-atcoder';
  if (p.includes('codechef')) return 'platform-codechef';
  return '';
}

function getPlatformAbbr(platform) {
  if (!platform) return '';
  const p = platform.toLowerCase();
  if (p.includes('codeforces')) return 'CF';
  if (p.includes('atcoder')) return 'AT';
  if (p.includes('leetcode')) return 'LC';
  if (p.includes('codechef')) return 'CC';
  return p.substring(0, 2).toUpperCase();
}

function prevMonth() {
  currentMonth.value--;
  if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value--; }
  selectedDay.value = null;
}

function nextMonth() {
  currentMonth.value++;
  if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++; }
  selectedDay.value = null;
}

async function loadContests() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const rawResult = await invoke('fetch_contests', {
      clistUsername: appSettings.clistUsername || "",
      clistApiKey: appSettings.clistApiKey || ""
    });

    if (rawResult === null || rawResult === undefined) {
      throw new Error('API 回傳為空，請確認 Clist API Key 是否設定正確。');
    }

    const contests = Array.isArray(rawResult) ? rawResult : JSON.parse(rawResult);
    contestsCache.value = contests;
    passiveAgentCheck();
    loading.value = false;
    selectedDay.value = null;
  } catch (e) {
    console.error("fetch_contests failed:", e);
    const isKeyMissing = !appSettings.clistUsername || !appSettings.clistApiKey;
    errorMsg.value = isKeyMissing
      ? '尚未設定 Clist API Key。請前往 ⚙ 設定 → Credentials 填入帳號與 API Key。'
      : '無法取得賽事資料，請確認設定中的 API Key 與網路連線。';
    loading.value = false;
  }
}

function openRatingModal(c) {
  calendarState.openRatingModal(c, trainingPlans.value, appSettings, () => {}, passiveAgentCheck);
}

function passiveAgentCheck() {
  const now = new Date();
  let count = 0;
  contestsCache.value.forEach(c => {
    const startDt = parseDate(c.start_time);
    if (startDt > now) {
      const daysUntil = Math.ceil((startDt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 3 && !trainingPlans.value.some(p => p.contestName === c.name)) count++;
    }
  });
  notificationText.value = count > 0 ? `3天內有 ${count} 場比賽尚未規劃，要安排練習嗎？` : '';
}

function handleNotificationClick() {
  const now = new Date();
  const first = contestsCache.value.find(c => {
    const sDt = parseDate(c.start_time);
    const dU = Math.ceil((sDt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return sDt > now && dU <= 3 && !trainingPlans.value.some(p => p.contestName === c.name);
  });
  if (first) {
    const targetDt = parseDate(first.start_time);
    currentYear.value = targetDt.getFullYear();
    currentMonth.value = targetDt.getMonth();
    selectedDay.value = targetDt.getDate();
  }
}

function selectDay(day, event) {
  selectedDay.value = day;
  const cell = event.currentTarget;
  const rect = cell.getBoundingClientRect();

  // 預設放在格子右邊，如果右邊空間不夠 (超過視窗寬度)，就改放左邊
  let leftPos = rect.right + 8;
  if (leftPos + 320 > window.innerWidth) {
    leftPos = rect.left - 320 - 8;
  }

  popoverStyle.value = {
    top: `${rect.top}px`,
    left: `${leftPos}px`
  };
}

function handleClickOutside(e) {
  if (!e.target.closest('.calendar-popover') && !e.target.closest('.calendar-cell')) {
    selectedDay.value = null;
  }
}

onMounted(() => {
  if (contestsCache.value.length === 0) loadContests();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
