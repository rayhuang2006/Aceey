import { reactive } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export const calendarState = reactive({
  showRatingModal: false,
  showPlanReview: false,
  activeContest: null,
  lastRatingSelected: "入門",
  planReviewTitle: '',
  planReviewSubtitle: '',
  planReviewLoading: false,
  planReviewHtml: '',
  planReviewShowConfirm: false,
  activePendingPlan: null,
  _trainingPlans: null,
  _renderCalendarGrid: null,
  _passiveAgentCheck: null,
  _appSettings: null,

  openRatingModal(contest, trainingPlans, appSettings, renderFn, passiveFn) {
    this.activeContest = contest;
    this._trainingPlans = trainingPlans;
    this._appSettings = appSettings;
    this._renderCalendarGrid = renderFn;
    this._passiveAgentCheck = passiveFn;
    this.showRatingModal = true;
  },

  cancelRating() {
    this.showRatingModal = false;
    this.activeContest = null;
  },

  async confirmRating() {
    this.showRatingModal = false;
    this.showPlanReview = true;
    this.planReviewLoading = true;
    this.planReviewHtml = '';
    this.planReviewShowConfirm = false;
    await this.generateTrainingPlan();
  },

  async generateTrainingPlan() {
    const contest = this.activeContest;
    if (!contest) return;
    
    const now = new Date();
    const startDt = contest.startDt ? new Date(contest.startDt) : new Date(contest.start_time);
    
    const diffTime = startDt.getTime() - now.getTime();
    let daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntil < 1) daysUntil = 1;

    const contestDateLabel = startDt.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', weekday: 'short' });
    this.planReviewTitle = `備賽計畫：${contest.name}`;
    this.planReviewSubtitle = `比賽日期：${contestDateLabel}   你的程度：${this.lastRatingSelected}`;

    try {
      const response = await invoke('generate_training_plan', {
        contestName: contest.name, contestPlatform: contest.platform,
        contestDate: contest.start_time, daysUntil,
        userLevel: this.lastRatingSelected,
        groqApiKey: this._appSettings?.groqApiKey || ""
      });
      this.parseReviewPlan(response, startDt, daysUntil);
    } catch (e) {
      console.error("生成計畫失敗:", e);
      this.planReviewHtml = '<div style="color: #ff5252;">產生計畫失敗，請檢查 API Key 是否正確。</div>';
      this.planReviewShowConfirm = false;
    } finally {
      this.planReviewLoading = false;
    }
  },

  parseReviewPlan(rawResponse, contestDt, daysUntil) {
    const lines = rawResponse.split('\n');
    let groupedByDay = {};
    let dateMapping = {};

    lines.forEach(line => {
      if (!line.includes('|')) return;
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 5) return;
      const dayStr = parts[0].toUpperCase();
      let dayNum = 1;
      const match = dayStr.match(/\d+/);
      if (match) dayNum = parseInt(match[0]);
      if (!groupedByDay[dayNum]) {
        groupedByDay[dayNum] = [];
        const targetDate = new Date(contestDt);
        targetDate.setDate(targetDate.getDate() - daysUntil + (dayNum - 1));
        dateMapping[dayNum] = {
          iso: targetDate.toLocaleDateString('en-CA'),
          label: targetDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', weekday: 'short' })
        };
      }
      groupedByDay[dayNum].push({
        date: dateMapping[dayNum].iso, problem: parts[1], source: parts[2],
        topic: parts[3], difficulty: parts[4], completed: false
      });
    });

    let reviewHtml = '';
    let flatTasksList = [];
    const sortedDays = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);
    sortedDays.forEach(day => {
      reviewHtml += `<div class="plan-day-header">Day ${day} — ${dateMapping[day].label}</div>`;
      groupedByDay[day].forEach(task => {
        flatTasksList.push(task);
        reviewHtml += `<div style="font-size: 13px; margin-bottom: 4px; color: #ccc;">□ [${task.topic}] ${task.problem} (${task.source}) - ${task.difficulty}</div>`;
      });
    });

    this.activePendingPlan = { contestName: this.activeContest.name, tasks: flatTasksList };
    this.planReviewHtml = reviewHtml;
    this.planReviewShowConfirm = true;
  },

  cancelPlan() {
    this.showPlanReview = false;
    this.activePendingPlan = null;
  },

  async regeneratePlan() {
    this.planReviewLoading = true;
    this.planReviewHtml = '';
    this.planReviewShowConfirm = false;
    await this.generateTrainingPlan();
  },

  confirmPlan() {
    if (this.activePendingPlan && this._trainingPlans) {
      this._trainingPlans.push(this.activePendingPlan);
      if (this._renderCalendarGrid) this._renderCalendarGrid();
      if (this._passiveAgentCheck) this._passiveAgentCheck();
    }
    this.showPlanReview = false;
    this.activePendingPlan = null;
  }
});
