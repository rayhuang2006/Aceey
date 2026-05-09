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
        <span v-if="tc.verdict !== '-'" :style="{ color: verdictColor(tc.verdict), fontSize: '10px' }">●</span>
        Case {{ index + 1 }}
        <button class="tc-tab-close" @click.stop="removeTestCase(tc.id)">&times;</button>
      </div>
    </div>
    <div id="tc-content">
      <div class="tc-boxes" v-if="activeTC">
        <div class="tc-box">
          <label>Input</label>
          <textarea v-model="activeTC.input"></textarea>
        </div>
        <div class="tc-box">
          <label>Expected Output</label>
          <textarea v-model="activeTC.expected_output"></textarea>
        </div>
        <div class="tc-box">
          <label>Actual Output <span id="tc-time" v-if="activeTC.time_ms > 0">({{ activeTC.time_ms }}ms)</span></label>
          <textarea :value="activeTC.actual_output" readonly></textarea>
        </div>
        <div class="tc-box verdict-box">
          <label>Verdict</label>
          <div id="tc-verdict" :class="'verdict-' + activeTC.verdict">{{ activeTC.verdict }}</div>
          <pre id="tc-error" v-if="activeTC.error" style="display:block;">{{ activeTC.error }}</pre>
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
