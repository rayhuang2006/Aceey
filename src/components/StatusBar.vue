<template>
  <div id="status-bar">
    <div class="status-bar-left">
      <div class="status-item">Aceey IDE</div>
    </div>
    <div class="status-bar-right">
      <div v-if="isAgentAnalyzing" class="status-analyzing">
        <span class="pulse-dot"></span> Analyzing...
      </div>
      <div id="quota-monitor-trigger" class="status-item">
        [Groq] {{ quotaData.totalTokens }} / {{ appSettings.tokenBudget }} Tokens
        <div id="quota-hover-panel">
          <div class="quota-panel-header">API Quota Monitor</div>
          <div class="quota-panel-body">
            <div class="quota-model-row">
              <div class="quota-model-info">
                <span class="quota-model-name">Groq Llama 3 70B</span>
                <span class="quota-model-stats">{{ formatK(quotaData.totalTokens) }} / {{ formatK(appSettings.tokenBudget) }}</span>
              </div>
              <div class="quota-progress-bar-bg">
                <div class="quota-progress-bar-fill" :style="progressStyle"></div>
              </div>
              <div class="quota-cost-row">Est. Cost: <span id="quota-cost-text" :style="{ color: costColor }">${{ quotaData.estimatedCost }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { quotaData, appSettings, isAgentAnalyzing } from '../store';

function formatK(num) {
  return num >= 1000 ? (num / 1000).toFixed(0) + 'k' : num.toString();
}

const progressStyle = computed(() => {
  const pct = quotaData.percentage;
  let color = '#4CAF50';
  if (pct >= 100) color = '#F44336';
  else if (pct > 80) color = '#FF9800';
  return { width: pct + '%', backgroundColor: color };
});

const costColor = computed(() => {
  if (quotaData.percentage >= 100) return '#F44336';
  if (quotaData.percentage > 80) return '#FF9800';
  return '#4CAF50';
});
</script>
