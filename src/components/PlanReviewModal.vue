<template>
  <div id="plan-review-overlay" v-if="calendarState.showPlanReview" @click.self="calendarState.cancelPlan()">
    <div id="plan-review-panel">
      <h3>{{ calendarState.planReviewTitle }}</h3>
      <div class="plan-review-subtitle">{{ calendarState.planReviewSubtitle }}</div>
      <div v-if="calendarState.planReviewLoading" id="plan-review-loading" style="display: block;">分析比賽並產生計畫中...</div>
      <div v-if="calendarState.planReviewHtml" id="plan-review-content" style="display: block;" v-html="calendarState.planReviewHtml"></div>
      <div class="modal-actions" v-if="calendarState.planReviewHtml || !calendarState.planReviewLoading">
        <button @click="calendarState.cancelPlan()">取消</button>
        <button @click="calendarState.regeneratePlan()">重新產生</button>
        <button v-if="calendarState.planReviewShowConfirm" class="primary-btn" @click="calendarState.confirmPlan()">確認計畫</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { calendarState } from './calendarState.js';
</script>
