<template>
  <div id="rating-modal-overlay" v-if="calendarState.showRatingModal" @click.self="calendarState.cancelRating()">
    <div id="rating-modal">
      <h3>你目前的程度大概在哪？</h3>
      <div class="rating-options">
        <label><input type="radio" name="user_level" value="新手" v-model="calendarState.lastRatingSelected"> 新手 (Rating &lt; 800)</label>
        <label><input type="radio" name="user_level" value="入門" v-model="calendarState.lastRatingSelected"> 入門 (800 - 1200)</label>
        <label><input type="radio" name="user_level" value="進階" v-model="calendarState.lastRatingSelected"> 進階 (1200 - 1600)</label>
        <label><input type="radio" name="user_level" value="高手" v-model="calendarState.lastRatingSelected"> 高手 (1600 - 2000)</label>
        <label><input type="radio" name="user_level" value="大佬" v-model="calendarState.lastRatingSelected"> 大佬 (2000+)</label>
      </div>
      <div class="modal-actions">
        <button @click="calendarState.cancelRating()">取消</button>
        <button @click="calendarState.confirmRating()">產生計畫</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { calendarState } from './calendarState.js';
</script>
