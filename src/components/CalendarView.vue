<template>
  <div id="calendar-view">
    <div class="calendar-header">
      <div class="calendar-nav">
        <button id="calendar-prev-btn" @click="prevMonth">&lt; 上月</button>
        <h2>{{ monthTitle }}</h2>
        <button id="calendar-next-btn" @click="nextMonth">下月 &gt;</button>
      </div>
      <button id="calendar-refresh-btn" @click="loadContests">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> 重新整理
      </button>
    </div>

    <!-- Agent Notification Bar -->
    <div id="agent-notification-bar" v-if="notificationText" @click="handleNotificationClick" style="cursor: pointer;">
      <div class="notification-content">
        <span class="info-icon">i</span> <span>{{ notificationText }}</span>
      </div>
    </div>

    <div id="calendar-content">
      <div v-if="loading" id="calendar-loading" style="display: block;">載入比賽中...</div>
      <div v-if="errorMsg" id="calendar-error" style="display: block;">{{ errorMsg }}</div>

      <div id="calendar-grid-container">
        <div class="calendar-grid-header">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>
        <div id="calendar-grid-body" class="calendar-grid" ref="gridBody"></div>
      </div>

      <!-- Details Panel for Selected Date -->
      <div id="calendar-details-panel" v-if="selectedDate">
        <h3><span class="accent-bar" style="display:inline-block;width:4px;height:16px;background:#4CAF50;margin-right:8px;vertical-align:middle;border-radius:2px;"></span>已選擇： {{ selectedDate.label }}</h3>
        <div id="details-contest-list" ref="detailsList"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { appSettings, openExternal } from '../store';
import { calendarState } from './calendarState.js';

const gridBody = ref(null);
const detailsList = ref(null);
const loading = ref(false);
const errorMsg = ref('');
const monthTitle = ref('');
const selectedDate = ref(null);
const notificationText = ref('');

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let contestsCache = null;
let trainingPlans = [];

function parseDate(s) {
  if (!s) return new Date();
  if (s instanceof Date) return s;
  if (s.includes('Z') || s.includes('+') || (s.includes('T') && s.split('-').length > 3)) return new Date(s);
  if (s.includes(' ') && !s.includes('T')) return new Date(s.replace(' ', 'T') + 'Z');
  return new Date(s.includes('T') ? (s.endsWith('Z') ? s : s + 'Z') : s);
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function getPlatformClass(p) {
  if (p.includes('codeforces')) return 'platform-codeforces';
  if (p.includes('leetcode')) return 'platform-leetcode';
  if (p.includes('atcoder')) return 'platform-atcoder';
  if (p.includes('codechef')) return 'platform-codechef';
  return '';
}

function getPlatformAbbr(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('codeforces')) return 'CF';
  if (p.includes('atcoder')) return 'AT';
  if (p.includes('leetcode')) return 'LC';
  if (p.includes('codechef')) return 'CC';
  return p.substring(0, 2).toUpperCase();
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendarGrid();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendarGrid();
}

async function loadContests() {
  loading.value = true;
  errorMsg.value = '';
  if (gridBody.value) gridBody.value.innerHTML = '';
  try {
    const rawResult = await invoke('fetch_contests', {
      clistUsername: appSettings.clistUsername || "",
      clistApiKey: appSettings.clistApiKey || ""
    });

    // Guard: Rust already returns a parsed Vec, but if it somehow returns null/empty, bail early
    if (rawResult === null || rawResult === undefined) {
      throw new Error('API 回傳為空，請確認 Clist API Key 是否設定正確。');
    }

    // If the backend returned a raw JSON string instead of a parsed array, parse it
    const contests = Array.isArray(rawResult) ? rawResult : JSON.parse(rawResult);
    contestsCache = contests;
    passiveAgentCheck();
    loading.value = false;
    selectedDate.value = null;
    renderCalendarGrid();
  } catch (e) {
    console.error("fetch_contests failed:", e);
    // Show a friendly, non-alarming message instead of the raw error
    const isKeyMissing = !appSettings.clistUsername || !appSettings.clistApiKey;
    errorMsg.value = isKeyMissing
      ? '尚未設定 Clist API Key。請前往 ⚙ 設定 → Credentials 填入帳號與 API Key。'
      : '無法取得賽事資料，請確認設定中的 API Key 與網路連線。';
    loading.value = false;
  }
}

function renderCalendarGrid() {
  const list = contestsCache || [];
  const gb = gridBody.value;
  if (!gb) return;
  gb.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  monthTitle.value = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty-cell';
    gb.appendChild(emptyCell);
  }

  const monthContests = {};
  list.forEach(c => {
    const dt = parseDate(c.start_time);
    if (dt.getFullYear() === currentYear && dt.getMonth() === currentMonth) {
      const day = dt.getDate();
      if (!monthContests[day]) monthContests[day] = [];
      monthContests[day].push({ ...c, startDt: dt });
    }
  });

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === currentYear && now.getMonth() === currentMonth;
  const todayDate = now.getDate();

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    let dayClass = 'cell-date';
    if (isCurrentMonth && day === todayDate) dayClass += ' today';

    const dtStr = new Date(currentYear, currentMonth, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
    const localIsoDate = new Date(currentYear, currentMonth, day).toLocaleDateString('en-CA');
    const dayContests = monthContests[day] || [];

    const dayTrainingTasks = [];
    trainingPlans.forEach(plan => {
      plan.tasks.forEach(task => {
        if (task.date === localIsoDate) dayTrainingTasks.push(task);
      });
    });

    let contestsHtml = '';
    if (dayContests.length > 0 || dayTrainingTasks.length > 0) {
      let barsHtml = '';
      let dotsHtml = '';
      const maxBars = 3;
      let rendered = 0;
      for (let i = 0; i < dayContests.length && rendered < maxBars; i++) {
        barsHtml += `<div class="platform-bar ${getPlatformClass(dayContests[i].platform)}">${getPlatformAbbr(dayContests[i].platform)}</div>`;
        rendered++;
      }
      if (dayContests.length > maxBars) barsHtml += `<div class="more-bars">+${dayContests.length - maxBars} more</div>`;
      if (dayTrainingTasks.length > 0) {
        dotsHtml = '<div class="cell-dots-container">';
        for (let i = 0; i < dayTrainingTasks.length; i++) dotsHtml += `<div class="training-dot"></div>`;
        dotsHtml += '</div>';
      }
      contestsHtml = `<div class="cell-bars-compact">${barsHtml}${dotsHtml}</div>`;
    }

    cell.innerHTML = `<div class="${dayClass}">${day}</div><div class="cell-contests">${contestsHtml}</div>`;
    cell.addEventListener('click', () => {
      gb.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      showDetailsPanel(dtStr, dayContests, dayTrainingTasks);
    });
    gb.appendChild(cell);
  }

  const totalCells = startOffset + totalDays;
  const remain = totalCells % 7;
  if (remain !== 0) {
    for (let i = 0; i < (7 - remain); i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-cell empty-cell';
      gb.appendChild(emptyCell);
    }
  }
}

function showDetailsPanel(dateStr, dayContests, dayTrainingTasks) {
  selectedDate.value = { label: dateStr };
  nextTick(() => {
    const dl = detailsList.value;
    if (!dl) return;
    dl.innerHTML = '';

    if (dayContests.length === 0 && (!dayTrainingTasks || dayTrainingTasks.length === 0)) {
      dl.innerHTML = '<div style="color: #888; font-size: 13px;">這天沒有比賽</div>';
      return;
    }

    const now = new Date();

    // Training tasks
    if (dayTrainingTasks && dayTrainingTasks.length > 0) {
      const trainingDiv = document.createElement('div');
      trainingDiv.className = 'contest-item border-platform-training';
      trainingDiv.style.flexDirection = 'column';
      trainingDiv.style.alignItems = 'flex-start';
      let html = '<div class="contest-title" style="margin-bottom: 8px;">練習計畫</div>';
      dayTrainingTasks.forEach((task, idx) => {
        const checked = task.completed ? 'checked' : '';
        html += `<label class="todo-item" style="margin-left: 4px; display: block; margin-bottom: 4px;"><input type="checkbox" data-task-idx="${idx}" ${checked}><span class="todo-text">[${task.topic}] ${task.problem} (${task.source}) - ${task.difficulty}</span></label>`;
      });
      trainingDiv.innerHTML = html;
      trainingDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => { dayTrainingTasks[cb.dataset.taskIdx].completed = e.target.checked; });
      });
      dl.appendChild(trainingDiv);
    }

    // Contests
    dayContests.forEach(c => {
      const itemDiv = document.createElement('div');
      const pc = getPlatformClass(c.platform);
      itemDiv.className = `contest-item border-${pc || 'platform-unknown'}`;
      const startDt = c.startDt || parseDate(c.start_time);
      const startStr = startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const endDt = parseDate(c.end_time);
      const endStr = endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const timeLabel = `${startStr} — ${endStr} (${formatDuration(c.duration_minutes)})`;
      const isFuture = startDt > now;
      const wantBtn = isFuture ? `<button class="want-to-compete-btn">想打這場</button>` : '';
      itemDiv.innerHTML = `<div class="contest-main"><div class="contest-title">${c.name}</div><div class="contest-time">${timeLabel}</div></div><div class="contest-actions">${wantBtn}<button class="open-link-btn" data-url="${c.url}">開啟</button></div>`;
      itemDiv.querySelector('.open-link-btn').addEventListener('click', () => openExternal(c.url));
      if (isFuture) {
        const btn = itemDiv.querySelector('.want-to-compete-btn');
        if (btn) btn.addEventListener('click', () => { calendarState.openRatingModal(c, trainingPlans, appSettings, renderCalendarGrid, passiveAgentCheck); });
      }
      dl.appendChild(itemDiv);
    });
  });
}

function passiveAgentCheck() {
  if (!contestsCache) return;
  const now = new Date();
  let count = 0;
  contestsCache.forEach(c => {
    const startDt = parseDate(c.start_time);
    if (startDt > now) {
      const daysUntil = Math.ceil((startDt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 3 && !trainingPlans.some(p => p.contestName === c.name)) count++;
    }
  });
  notificationText.value = count > 0 ? `3天內有 ${count} 場比賽尚未規劃，要安排練習嗎？` : '';
}

function handleNotificationClick() {
  // Navigate to the first unplanned contest
  const now = new Date();
  const first = contestsCache?.find(c => {
    const sDt = parseDate(c.start_time);
    const dU = Math.ceil((sDt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return sDt > now && dU <= 3 && !trainingPlans.some(p => p.contestName === c.name);
  });
  if (first) {
    const targetDt = parseDate(first.start_time);
    currentYear = targetDt.getFullYear();
    currentMonth = targetDt.getMonth();
    renderCalendarGrid();
  }
}

onMounted(() => {
  renderCalendarGrid();
  if (!contestsCache) loadContests();
});
</script>
