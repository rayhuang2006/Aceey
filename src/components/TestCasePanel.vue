<template>
  <div id="testcase-panel">
    <div class="panel-header">
      Test Cases
      <div class="testcase-actions">
        <button id="add-tc-btn" @click="addTestCase">+ Add Test Case</button>
      </div>
    </div>
    <div id="tc-tabs">
      <div v-for="(tc, index) in testCases" :key="tc.id"
        class="tc-tab" :class="{ active: tc.id === activeTcId }"
        @click="switchTab(tc.id)">
        <span :class="'text-' + tc.verdict.toLowerCase()">Case {{ index + 1 }} {{ tc.verdict === '-' ? '' : tc.verdict }}</span>
        <button class="tc-tab-close" @click.stop="removeTestCase(tc.id)">&times;</button>
      </div>
    </div>

    <div v-if="activeTC && activeTC.verdict !== '-'" class="summary-bar" :class="'summary-' + activeTC.verdict">
      <span v-if="activeTC.verdict === 'AC'">✓ Accepted</span>
      <span v-else-if="activeTC.verdict === 'CE'">✗ Compile Error</span>
      <span v-else-if="activeTC.verdict === 'WA'">✗ Wrong Answer</span>
      <span v-else-if="activeTC.verdict === 'RE'">✗ Runtime Error</span>
      <span v-else-if="activeTC.verdict === 'TLE'">✗ Time Limit Exceeded</span>
      <span v-else>✗ {{ activeTC.verdict }}</span>
      <span v-if="activeTC.time_ms > 0" class="summary-time"> · {{ activeTC.time_ms }}ms</span>
    </div>

    <div id="tc-content">
      <div class="tc-boxes" v-if="activeTC">
        <!-- Left Column -->
        <div class="tc-col">
          <div class="tc-box" style="height: 100%;">
            <label>Input</label>
            <textarea v-model="activeTC.input"></textarea>
          </div>
        </div>
        <!-- Right Column -->
        <div class="tc-col">
          <div class="tc-box" style="flex: 1;">
            <label>Expected Output</label>
            <textarea v-model="activeTC.expected_output"></textarea>
          </div>
          <div class="tc-box" style="flex: 1;">
            <label>Actual Output</label>
            <textarea :value="activeTC.actual_output" readonly></textarea>
          </div>
          <div v-if="activeTC.error" class="error-block">
            {{ activeTC.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { testCases, activeTcId } from '../store';

const activeTC = computed(() => testCases.find(t => t.id === activeTcId.value));

function verdictColor(v) {
  if (v === 'AC') return 'var(--ac-color)';
  if (v === 'WA' || v === 'RE') return 'var(--wa-color)';
  return 'var(--ce-color)';
}

function switchTab(id) {
  activeTcId.value = id;
}

function addTestCase() {
  const newId = testCases.length > 0 ? Math.max(...testCases.map(t => t.id)) + 1 : 1;
  testCases.push({ id: newId, input: "", expected_output: "", actual_output: "", verdict: "-", time_ms: 0, error: null });
  activeTcId.value = newId;
}

function removeTestCase(id) {
  if (testCases.length <= 1) return;
  const idx = testCases.findIndex(t => t.id === id);
  testCases.splice(idx, 1);
  if (activeTcId.value === id) {
    activeTcId.value = testCases[Math.max(0, idx - 1)].id;
  }
}
</script>
