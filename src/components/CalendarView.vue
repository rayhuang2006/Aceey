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
    <div id="agent-notification-bar" v-if="notificationText && !isNotificationDismissed" @click="handleNotificationClick" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
      <div class="notification-content">
        <span class="info-icon">i</span> <span>{{ notificationText }}</span>
      </div>
      <span class="close-btn" @click.stop="isNotificationDismissed = true" style="font-size: 16px; padding: 0 8px;">×</span>
    </div>

    <div id="calendar-content">
      <div v-if="loading" id="calendar-loading" style="display: block;">載入比賽中...</div>
      <div v-if="errorMsg" id="calendar-error" style="display: block;">{{ errorMsg }}</div>

      <div id="calendar-grid-container">
        <div class="calendar-grid-header">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>
        <div class="calendar-grid">
          <div v-for="i in startOffset" :key="'empty-'+i" class="calendar-cell empty-cell"></div>
          <div v-for="day in totalDays" :key="day"
               class="calendar-cell"
               :class="{ selected: selectedDay === day }"
               @click="selectedDay = day">
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

      <!-- Details Panel for Selected Date -->
      <div v-if="selectedDay" id="calendar-details-panel">
        <h3><span class="accent-bar" style="display:inline-block;width:4px;height:16px;background:#4CAF50;margin-right:8px;vertical-align:middle;border-radius:2px;"></span>已選擇：{{ currentMonth + 1 }}月{{ selectedDay }}日</h3>
        <div id="details-contest-list">
          <div v-if="selectedDayContests.length === 0 && selectedDayTrainingTasks.length === 0" style="color: #888; font-size: 13px;">這天沒有比賽</div>
          
          <div v-if="selectedDayTrainingTasks.length > 0" class="contest-item border-platform-training" style="flex-direction: column; align-items: flex-start;">
            <div class="contest-title" style="margin-bottom: 8px;">練習計畫</div>
            <label v-for="(task, idx) in selectedDayTrainingTasks" :key="idx" class="todo-item" style="margin-left: 4px; display: block; margin-bottom: 4px;">
              <input type="checkbox" v-model="task.completed">
              <span class="todo-text">[{{ task.topic }}] {{ task.problem }} ({{ task.source }}) - {{ task.difficulty }}</span>
            </label>
          </div>

          <div v-for="c in selectedDayContests" :key="c.name"
               class="contest-item" :class="'border-' + getPlatformClass(c.platform)">
            <div class="contest-main">
              <div class="contest-title">{{ c.name }}</div>
              <div class="contest-time">{{ formatTime(c) }}</div>
            </div>
            <div class="contest-actions">
              <button v-if="isFuture(c)" class="want-to-compete-btn" @click="openRatingModal(c)">想打這場</button>
              <button class="open-link-btn" @click="openExternal(c.url)">開啟</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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

onMounted(() => {
  if (contestsCache.value.length === 0) loadContests();
});
</script>
