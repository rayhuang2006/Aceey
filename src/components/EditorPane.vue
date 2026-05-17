<template>
  <div id="editor-panel">
    <div class="panel-header">Solution.cpp</div>
    <div v-if="isAnalyzing" class="analyzing-banner">🧠 Agent is analyzing the code...</div>
    <div id="monaco-container" ref="monacoContainer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { invoke } from '@tauri-apps/api/core';
import { testCases, activeTcId, appSettings, updateTokenMonitorUI, updateStoreValue } from '../store';

// Must be set before any monaco.editor.create() call
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  }
};

const DEFAULT_CPP = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    

    return 0;
}`;

const monacoContainer = ref(null);
let editor = null;

// Debug Agent State (from old main.js lines 646-668)
let currentDecorations = [];
let activeWidgets = [];
let debugIssueQueue = [];
let currentDebugIndex = 0;
let isGeneralHintExpanded = false;
let currentGeneralIssue = null;

const isAnalyzing = ref(false);

onMounted(() => {
  if (!monacoContainer.value) return;
  editor = monaco.editor.create(monacoContainer.value, {
    value: DEFAULT_CPP,
    language: 'cpp',
    theme: 'vs-dark',
    fontSize: 14,
    minimap: { enabled: false },
    wordWrap: 'off',
    lineNumbers: 'on',
    glyphMargin: true,
    automaticLayout: true
  });

  // Ctrl+Enter shortcut
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    runCode();
  });
});

onUnmounted(() => {
  if (editor) editor.dispose();
});

// --- Tab helpers (from old main.js lines 353-381) ---
function saveCurrentTab() {
  const tc = testCases.find(t => t.id === activeTcId.value);
  if (tc) {
    // Inputs are synced via v-model in TestCasePanel
  }
}

function loadCurrentTab() {
  // Reactive — TestCasePanel auto-renders from store
}

// --- Run Logic (from old main.js lines 419-482) ---
async function runCode() {
  if (!editor) return;

  const sourceCode = editor.getValue();
  const payloadTestCases = testCases.map(tc => ({
    input: tc.input,
    expected_output: tc.expected_output
  }));

  // Reset UI
  testCases.forEach(tc => { tc.actual_output = "Running..."; tc.verdict = "-"; tc.time_ms = 0; tc.error = null; });

  try {
    const results = await invoke('compile_and_run', {
      sourceCode: sourceCode,
      testCases: payloadTestCases,
      timeLimitMs: 2000
    });

    if (results.length === 1 && results[0].verdict === 'CE') {
      testCases.forEach(tc => {
        tc.verdict = 'CE';
        tc.error = results[0].error_message;
        tc.actual_output = "";
      });
    } else {
      results.forEach((res, index) => {
        if (testCases[index]) {
          testCases[index].verdict = res.verdict;
          testCases[index].actual_output = res.actual_output;
          testCases[index].time_ms = res.time_ms;
          testCases[index].error = res.error_message;
        }
      });
    }

    // Debug Agent Hook
    const failedCase = testCases.find(tc => tc.verdict === 'CE' || tc.verdict === 'RE' || tc.verdict === 'WA' || tc.verdict === 'TLE');
    if (failedCase) {
      await agentWorkflowPipeline(failedCase.verdict, failedCase);
    }
  } catch (e) {
    alert("Failed to invoke backend: " + e);
  }
}

// --- Agent Workflow Pipeline (from old main.js lines 487-525) ---
async function agentWorkflowPipeline(verdict, failedCase) {
  let normalizedVerdict = verdict.toLowerCase();
  if (normalizedVerdict.includes('compile error') || normalizedVerdict === 'ce') normalizedVerdict = 'ce';
  else if (normalizedVerdict.includes('runtime error') || normalizedVerdict === 're') normalizedVerdict = 're';
  else if (normalizedVerdict.includes('wrong answer') || normalizedVerdict === 'wa') normalizedVerdict = 'wa';
  else if (normalizedVerdict.includes('time limit') || normalizedVerdict === 'tle') normalizedVerdict = 'tle';

  const triggerKey = 'autoTrigger' + normalizedVerdict.toUpperCase();
  if (!appSettings[triggerKey]) {
    console.log(`${normalizedVerdict.toUpperCase()} trigger disabled in settings`);
    return;
  }

  // Prepare context
  let freshApiKey = appSettings.groqApiKey;
  if (!freshApiKey) {
    console.error("Groq API Key is empty!");
    return;
  }

  const context = {
    sourceCode: editor.getValue(),
    problemDescription: document.getElementById('problem-text')?.innerText || '',
    errorType: failedCase.verdict,
    compilerOutput: failedCase.error || '',
    testInput: failedCase.input || '',
    expectedOutput: failedCase.expected_output || '',
    actualOutput: failedCase.actual_output || '',
    groqApiKey: freshApiKey
  };

  try {
    isAnalyzing.value = true;
    const rawResponse = await invoke('analyze_error', {
      sourceCode: context.sourceCode,
      problemDescription: context.problemDescription,
      errorType: context.errorType,
      compilerOutput: context.compilerOutput,
      testInput: context.testInput,
      expectedOutput: context.expectedOutput,
      actualOutput: context.actualOutput,
      groqApiKey: context.groqApiKey
    });

    const allIssues = parseDebugResponse(rawResponse);
    applyDebugDecorationsWithParsed(allIssues);
  } catch (e) {
    console.error("Debug Agent failed:", e);
  } finally {
    isAnalyzing.value = false;
  }

  await updateTokenMonitorUI();
}

// --- Debug Response Parser (from old main.js lines 675-708) ---
function parseDebugResponse(raw) {
  if (!editor) return [];
  const model = editor.getModel();
  return raw.split('\n')
    .filter(line => line.startsWith('LINE|'))
    .map(line => {
      const parts = line.split('|').map(s => s.trim());
      return {
        lineNumber: parseInt(parts[1]),
        description: parts[2] || '',
        suggestion: parts[3] || '',
        errorTag: parts[4] || ''
      };
    })
    .filter(item => {
      if (isNaN(item.lineNumber)) return false;
      if (item.lineNumber === 0) return true;
      if (item.lineNumber > model.getLineCount()) return false;
      const lineContent = model.getLineContent(item.lineNumber).trim();
      if (lineContent === "") return false;
      if (lineContent.startsWith('#include')) return false;
      if (lineContent.includes('using namespace std;')) return false;
      if (lineContent.includes('ios::sync_with_stdio(false);')) return false;
      if (lineContent.includes('cin.tie(nullptr);')) return false;
      if (lineContent.includes('return 0;')) return false;
      return true;
    });
}

function clearDebugMode() {
  const editorDom = document.querySelector('.monaco-editor');
  if (editorDom) editorDom.classList.remove('debug-mode-active');
  if (editor) currentDecorations = editor.deltaDecorations(currentDecorations, []);
  activeWidgets.forEach(w => { if (w.dispose) w.dispose(); });
  activeWidgets = [];
  const bar = document.getElementById('debug-general-hint-bar');
  if (bar) bar.remove();
  debugIssueQueue = [];
  currentDebugIndex = 0;
  isGeneralHintExpanded = false;
  currentGeneralIssue = null;
}

function activateDebugMode() {
  const editorDom = document.querySelector('.monaco-editor');
  if (editorDom) editorDom.classList.add('debug-mode-active');
}

function applyDebugDecorationsWithParsed(allIssues) {
  if (allIssues.length === 0) return;
  debugIssueQueue = allIssues.filter(i => i.lineNumber > 0);
  currentGeneralIssue = allIssues.find(i => i.lineNumber === 0);
  currentDebugIndex = 0;
  if (debugIssueQueue.length > 0 || currentGeneralIssue) {
    activateDebugMode();
    if (debugIssueQueue.length > 0) showDebugIssue(0);
    if (currentGeneralIssue) showGeneralDebugHint(currentGeneralIssue);
  }
}

function showDebugIssue(index) {
  activeWidgets.forEach(w => { if (w.dispose) w.dispose(); });
  activeWidgets = [];
  if (editor) currentDecorations = editor.deltaDecorations(currentDecorations, []);
  const issue = debugIssueQueue[index];
  if (!issue || !editor) return;
  currentDecorations = editor.deltaDecorations([], [{
    range: new monaco.Range(issue.lineNumber, 1, issue.lineNumber, 1),
    options: {
      isWholeLine: true,
      className: 'debug-error-line',
      inlineClassName: 'debug-error-inline',
      glyphMarginClassName: 'debug-error-glyph',
      overviewRuler: { color: '#f44336', position: monaco.editor.OverviewRulerLane.Full }
    }
  }]);
  addDebugWidget(issue.lineNumber, issue.description, issue.suggestion, index);
}

function addDebugWidget(lineNumber, description, suggestion, index) {
  const total = debugIssueQueue.length;
  const widgetNode = document.createElement('div');
  widgetNode.className = 'debug-widget';
  widgetNode.innerHTML = `
    <div class="debug-widget-content">
      <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Issue ${index + 1} of ${total}</div>
      <div class="debug-widget-desc">${description}</div>
      <div class="debug-widget-suggestion">${suggestion}</div>
      <button class="debug-widget-dismiss">${index + 1 < total ? 'Next Issue' : 'OK, Fixed'}</button>
    </div>
  `;
  widgetNode.querySelector('.debug-widget-dismiss').addEventListener('click', () => nextDebugIssue());
  const widget = {
    domNode: widgetNode,
    getId: () => 'debug-widget-' + index,
    getDomNode: () => widgetNode,
    getPosition: () => ({ position: { lineNumber, column: 1 }, preference: [monaco.editor.ContentWidgetPositionPreference.BELOW] })
  };
  editor.addContentWidget(widget);
  activeWidgets.push({ dispose: () => editor.removeContentWidget(widget) });
  editor.revealLineInCenter(lineNumber);
}

function nextDebugIssue() {
  currentDebugIndex++;
  if (currentDebugIndex < debugIssueQueue.length) {
    showDebugIssue(currentDebugIndex);
  } else {
    clearDebugMode();
  }
}

function showGeneralDebugHint(issue) {
  let bar = document.getElementById('debug-general-hint-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'debug-general-hint-bar';
    bar.className = 'general-hint-bar collapsed';
    bar.addEventListener('click', () => {
      isGeneralHintExpanded = !isGeneralHintExpanded;
      if (currentGeneralIssue) showGeneralDebugHint(currentGeneralIssue);
    });
    const ep = document.getElementById('editor-panel');
    if (ep) ep.appendChild(bar);
  }
  if (isGeneralHintExpanded) {
    bar.className = 'general-hint-bar expanded';
    bar.innerHTML = `<div>▼ 整體建議</div><div class="general-hint-content"><div style="color: #ff8a80; font-weight: bold; margin-bottom: 4px;">${issue.description}</div><div>${issue.suggestion}</div></div>`;
  } else {
    bar.className = 'general-hint-bar collapsed';
    bar.innerHTML = `▶ 有整體建議 (點擊展開)`;
  }
}

function clearEditor() {
  if (editor) editor.setValue(DEFAULT_CPP);
  clearDebugMode();
}

defineExpose({ runCode, clearEditor });
</script>

<style scoped>
.analyzing-banner {
  background-color: #d97706; /* orange */
  color: white;
  padding: 8px 12px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  animation: pulse 1.5s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>
