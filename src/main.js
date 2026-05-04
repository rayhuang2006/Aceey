// Core logic starts here

const DEFAULT_CPP = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    

    return 0;
}`;

let editor;
let testCases = [
    { id: 1, input: "1 2\n", expected_output: "3\n", actual_output: "", verdict: "-", time_ms: 0, error: null }
];
let activeTcId = 1;

// --- Settings Store Logic ---
let appSettings = {
    clistUsername: "",
    clistApiKey: "",
    groqApiKey: "",
    autoTriggerCE: true,
    autoTriggerRE: true,
    autoTriggerWA: true,
    autoTriggerTLE: true
};
let settingsStore = null;

async function initSettingsStore() {
    try {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
        const storeModule = window.__TAURI__?.store || window.__TAURI_PLUGIN_STORE__;
        if (storeModule) {
            settingsStore = await (storeModule.load ? storeModule.load('settings.json') : new storeModule.Store('settings.json'));
        } else {
            console.warn("Tauri Store plugin not found in window.__TAURI__");
            return;
        }
        
        // Load defaults or stored values
        appSettings.clistUsername = await settingsStore.get('clistUsername') ?? "";
        appSettings.clistApiKey = await settingsStore.get('clistApiKey') ?? "";
        appSettings.groqApiKey = await settingsStore.get('groqApiKey') ?? "";
        appSettings.autoTriggerCE = await settingsStore.get('autoTriggerCE') ?? true;
        appSettings.autoTriggerRE = await settingsStore.get('autoTriggerRE') ?? true;
        appSettings.autoTriggerWA = await settingsStore.get('autoTriggerWA') ?? true;
        appSettings.autoTriggerTLE = await settingsStore.get('autoTriggerTLE') ?? true;

        // --- Developer QoL: .env Fallback ---
        if (!appSettings.clistUsername || !appSettings.clistApiKey || !appSettings.groqApiKey) {
            try {
                const envVars = await invoke('get_env_vars');
                let foundEnv = false;
                if (envVars.CLIST_USERNAME && !appSettings.clistUsername) {
                    appSettings.clistUsername = envVars.CLIST_USERNAME;
                    await settingsStore.set('clistUsername', appSettings.clistUsername);
                    foundEnv = true;
                }
                if (envVars.CLIST_API_KEY && !appSettings.clistApiKey) {
                    appSettings.clistApiKey = envVars.CLIST_API_KEY;
                    await settingsStore.set('clistApiKey', appSettings.clistApiKey);
                    foundEnv = true;
                }
                if (envVars.GROQ_API_KEY && !appSettings.groqApiKey) {
                    appSettings.groqApiKey = envVars.GROQ_API_KEY;
                    await settingsStore.set('groqApiKey', appSettings.groqApiKey);
                    foundEnv = true;
                }
                if (foundEnv) {
                    await settingsStore.save();
                    console.log("⚙️ 偵測到 .env，已自動填入並儲存設定");
                }
            } catch (envError) {
                console.warn("Failed to load .env fallback:", envError);
            }
        }
        // ------------------------------------

        // Apply to UI
        document.getElementById('setting-clist-username').value = appSettings.clistUsername;
        document.getElementById('setting-clist-api-key').value = appSettings.clistApiKey;
        document.getElementById('setting-groq-api-key').value = appSettings.groqApiKey;
        document.getElementById('setting-trigger-ce').checked = appSettings.autoTriggerCE;
        document.getElementById('setting-trigger-re').checked = appSettings.autoTriggerRE;
        document.getElementById('setting-trigger-wa').checked = appSettings.autoTriggerWA;
        document.getElementById('setting-trigger-tle').checked = appSettings.autoTriggerTLE;
    } catch (e) {
        console.warn("Could not load settings store:", e);
    }
}

// Ensure it runs
initSettingsStore();

async function renderAgentMemory() {
    try {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
        if (!invoke) return;
        const memory = await invoke('get_agent_memory');
        const container = document.getElementById('agent-memory-container');
        if (!memory || memory.length === 0) {
            container.innerHTML = '<span style="color: #8b949e; font-size: 13px;">No memory records found.</span>';
        } else {
            container.innerHTML = memory.map(tag => 
                `<span>${tag}</span>`
            ).join('');
        }
    } catch (e) {
        console.error("Failed to load agent memory:", e);
    }
}

document.getElementById('clear-memory-btn').addEventListener('click', async () => {
    try {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
        await invoke('clear_agent_memory');
        console.log("Agent memory cleared.");
        await renderAgentMemory();
        alert("Agent memory has been cleared!");
    } catch (e) {
        console.error("Failed to clear memory:", e);
    }
});

// Setup Settings UI Handlers
document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-view').style.display = 'flex';
    renderAgentMemory();
});

document.getElementById('settings-close-btn').addEventListener('click', () => {
    document.getElementById('settings-view').style.display = 'none';
});

// Settings Navigation Tabs
document.querySelectorAll('.settings-nav li').forEach(item => {
    item.addEventListener('click', (e) => {
        document.querySelectorAll('.settings-nav li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.settings-section').forEach(sec => sec.style.display = 'none');
        const sectionId = item.getAttribute('data-section');
        document.getElementById(sectionId).style.display = 'block';
        document.getElementById('settings-current-section-text').textContent = item.textContent;
    });
});

// Auto-Save Bindings
async function updateStoreValue(key, value) {
    appSettings[key] = value;
    if (settingsStore) {
        await settingsStore.set(key, value);
        await settingsStore.save();
    }
}

['setting-clist-username', 'setting-clist-api-key', 'setting-groq-api-key'].forEach(id => {
    const el = document.getElementById(id);
    const key = id.replace('setting-', '').replace(/-([a-z])/g, g => g[1].toUpperCase());
    el.addEventListener('change', (e) => updateStoreValue(key, e.target.value));
});

['setting-trigger-ce', 'setting-trigger-re', 'setting-trigger-wa', 'setting-trigger-tle'].forEach(id => {
    const el = document.getElementById(id);
    const type = id.split('-').pop().toUpperCase(); // "ce" -> "CE"
    const key = 'autoTrigger' + type;
    el.addEventListener('change', (e) => updateStoreValue(key, e.target.checked));
});
// ----------------------------

// Initialize Monaco when loaded
let DebugZoneWidget;

require(['vs/editor/editor.main'], function (monacoInstance) {
    // Use the passed instance or the global one
    const monaco = monacoInstance || window.monaco;
    
    editor = monaco.editor.create(document.getElementById('monaco-container'), {
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

    // Setup shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runCode();
    });

    // ZoneWidget Class for Debug Hints
    try {
        const BaseZoneWidget = monaco.editor.ZoneWidget;
        if (BaseZoneWidget) {
            DebugZoneWidget = class extends BaseZoneWidget {
                constructor(editor, index, total, description, suggestion) {
                    super(editor, {
                        showFrame: false,
                        showArrow: true,
                        frameColor: '#f44336',
                        keepEditorSelection: true
                    });
                    this.data = { index, total, description, suggestion };
                }
                _fillContainer(container) {
                    container.style.backgroundColor = 'transparent';
                    const wrapper = document.createElement('div');
                    wrapper.className = 'debug-zone-wrapper';
                    wrapper.innerHTML = `
                        <div class="debug-widget-content" style="margin: 0; width: 100%; max-width: none;">
                            <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Issue ${this.data.index + 1} of ${this.data.total}</div>
                            <div class="debug-widget-desc">${this.data.description}</div>
                            <div class="debug-widget-suggestion">${this.data.suggestion}</div>
                            <button class="debug-widget-dismiss" onclick="nextDebugIssue()">${this.data.index + 1 < this.data.total ? 'Next Issue' : 'OK, Fixed'}</button>
                        </div>
                    `;
                    container.appendChild(wrapper);
                }
            };
        }
    } catch (e) {
        console.error("Failed to initialize DebugZoneWidget:", e);
    }
});

// UI Elements
const tcTabs = document.getElementById('tc-tabs');
const tcInput = document.getElementById('tc-input');
const tcExpected = document.getElementById('tc-expected');
const tcActual = document.getElementById('tc-actual');
const tcVerdict = document.getElementById('tc-verdict');
const tcError = document.getElementById('tc-error');
const tcTime = document.getElementById('tc-time');

function renderTabs() {
    tcTabs.innerHTML = '';
    testCases.forEach((tc, index) => {
        const tab = document.createElement('div');
        tab.className = `tc-tab ${tc.id === activeTcId ? 'active' : ''}`;
        
        let verdictIndicator = '';
        if (tc.verdict !== '-') {
            const color = tc.verdict === 'AC' ? 'var(--ac-color)' : (tc.verdict === 'WA' || tc.verdict === 'RE' ? 'var(--wa-color)' : 'var(--ce-color)');
            verdictIndicator = `<span style="color: ${color}; font-size: 10px;">●</span> `;
        }
        
        tab.innerHTML = `
            ${verdictIndicator} Case ${index + 1}
            <button class="tc-tab-close" data-id="${tc.id}">&times;</button>
        `;
        tab.onclick = (e) => {
            if(e.target.classList.contains('tc-tab-close')) return;
            switchTab(tc.id);
        };
        
        const closeBtn = tab.querySelector('.tc-tab-close');
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            removeTestCase(tc.id);
        };
        
        tcTabs.appendChild(tab);
    });
}

function switchTab(id) {
    saveCurrentTab();
    activeTcId = id;
    renderTabs();
    loadCurrentTab();
}

function saveCurrentTab() {
    const tc = testCases.find(t => t.id === activeTcId);
    if (tc) {
        tc.input = tcInput.value;
        tc.expected_output = tcExpected.value;
    }
}

function loadCurrentTab() {
    const tc = testCases.find(t => t.id === activeTcId);
    if (tc) {
        tcInput.value = tc.input;
        tcExpected.value = tc.expected_output;
        tcActual.value = tc.actual_output || "";
        
        tcVerdict.textContent = tc.verdict;
        tcVerdict.className = `verdict-${tc.verdict}`;
        
        if (tc.time_ms > 0) tcTime.textContent = `(${tc.time_ms}ms)`;
        else tcTime.textContent = '';
        
        if (tc.error) {
            tcError.textContent = tc.error;
            tcError.style.display = 'block';
        } else {
            tcError.style.display = 'none';
        }
    }
}

window.openExternal = function(url) {
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (invoke) {
        invoke('plugin:shell|open', { path: url });
    } else {
        window.open(url, '_blank');
    }
};

function addTestCase() {
    saveCurrentTab();
    const newId = testCases.length > 0 ? Math.max(...testCases.map(t => t.id)) + 1 : 1;
    testCases.push({ id: newId, input: "", expected_output: "", actual_output: "", verdict: "-", time_ms: 0, error: null });
    activeTcId = newId;
    renderTabs();
    loadCurrentTab();
}

function removeTestCase(id) {
    if (testCases.length <= 1) return; // keep at least one
    const idx = testCases.findIndex(t => t.id === id);
    testCases.splice(idx, 1);
    
    if (activeTcId === id) {
        activeTcId = testCases[Math.max(0, idx - 1)].id;
    }
    renderTabs();
    loadCurrentTab();
}

// Input bindings
tcInput.addEventListener('input', saveCurrentTab);
tcExpected.addEventListener('input', saveCurrentTab);
document.getElementById('add-tc-btn').addEventListener('click', addTestCase);

// Run Logic
async function runCode() {
    if (!editor) return;
    saveCurrentTab();
    
    // Clear any existing debug UI before new run
    if (typeof clearDebugMode === 'function') clearDebugMode();
    
    const sourceCode = editor.getValue();
    const payloadTestCases = testCases.map(tc => ({
        input: tc.input,
        expected_output: tc.expected_output
    }));

    // Reset UI
    testCases.forEach(tc => { tc.actual_output = "Running..."; tc.verdict = "-"; tc.time_ms = 0; tc.error = null; });
    loadCurrentTab();
    renderTabs();

    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoke) {
        console.warn("Tauri API not found! Not running locally.");
        alert("Compile & Run requires the Tauri backend. Currently running in a browser environment.");
        return;
    }

    try {
        const results = await invoke('compile_and_run', { 
            sourceCode: sourceCode, 
            testCases: payloadTestCases,
            timeLimitMs: 2000
        });

        if (results.length === 1 && results[0].verdict === 'CE') {
            // Compilation Error
            testCases.forEach(tc => {
                tc.verdict = 'CE';
                tc.error = results[0].error_message;
                tc.actual_output = "";
            });
        } else {
            // Success per testcase
            results.forEach((res, index) => {
                testCases[index].verdict = res.verdict;
                testCases[index].actual_output = res.actual_output;
                testCases[index].time_ms = res.time_ms;
                testCases[index].error = res.error_message;
            });
        }
        
        loadCurrentTab();
        renderTabs();

        // Debug Agent Hook (Refactored Pipeline)
        const failedCase = testCases.find(tc =>tc.verdict === 'CE' || tc.verdict === 'RE' || tc.verdict === 'WA' || tc.verdict === 'TLE');
        if (failedCase) {
            await agentWorkflowPipeline(failedCase.verdict, failedCase);
        }
        
    } catch (e) {
        alert("Failed to invoke backend: " + e);
        loadCurrentTab();
        renderTabs();
    }
}

document.getElementById('run-btn').addEventListener('click', runCode);

// --- Agent Workflow Pipeline ---
async function agentWorkflowPipeline(verdict, failedCase) {
    if (!await checkTriggerPolicy(verdict)) return;
    
    const context = await prepareContext(failedCase);
    if (!context) return;
    
    tcVerdict.textContent += " (AI Analyzing...)";
    
    const agentResponse = await callAgentBrain(context);
    if (agentResponse) {
        await executeAction(agentResponse);
    } else {
        loadCurrentTab(); // recover from error
    }
}

async function checkTriggerPolicy(verdict) {
    const triggerKey = 'autoTrigger' + verdict;
    let shouldTrigger = true;
    if (settingsStore) {
        shouldTrigger = await settingsStore.get(triggerKey) ?? true;
    } else {
        shouldTrigger = appSettings[triggerKey];
    }
    return shouldTrigger;
}

async function prepareContext(failedCase) {
    let freshApiKey = appSettings.groqApiKey;
    if (settingsStore) {
        freshApiKey = await settingsStore.get('groqApiKey') || freshApiKey;
    }
    if (!freshApiKey) {
        console.error("Groq API Key is empty! Please set it in Settings.");
        tcVerdict.textContent = tcVerdict.textContent.replace(" (AI Analyzing...)", " (API Key Missing)");
        return null;
    }
    
    return {
        sourceCode: editor.getValue(),
        problemDescription: document.getElementById('problem-text').innerText || '',
        errorType: failedCase.verdict,
        compilerOutput: failedCase.error || '',
        testInput: failedCase.input || '',
        expectedOutput: failedCase.expected_output || '',
        actualOutput: failedCase.actual_output || '',
        groqApiKey: freshApiKey
    };
}

async function callAgentBrain(context) {
    try {
        const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
        return await invoke('analyze_error', {
            sourceCode: context.sourceCode,
            problemDescription: context.problemDescription,
            errorType: context.errorType,
            compilerOutput: context.compilerOutput,
            testInput: context.testInput,
            expectedOutput: context.expectedOutput,
            actualOutput: context.actualOutput,
            groqApiKey: context.groqApiKey
        });
    } catch(e) {
        console.error("Debug Agent failed:", e);
        return null;
    }
}

async function executeAction(rawResponse) {
    console.log("DEBUG AGENT RAW RESPONSE:", rawResponse);
    const allIssues = parseDebugResponse(rawResponse);
    console.log("DEBUG AGENT PARSED:", allIssues);
    
    applyDebugDecorationsWithParsed(allIssues);
}
// -------------------------------

// --- Debug Agent Functions ---
let currentDecorations = [];
let activeWidgets = [];
let debugIssueQueue = [];
let currentDebugIndex = 0;
let isGeneralHintExpanded = false;
let currentGeneralIssue = null;

window.clearDebugMode = function() {
    const editorDom = document.querySelector('.monaco-editor');
    if (editorDom) editorDom.classList.remove('debug-mode-active');
    currentDecorations = editor.deltaDecorations(currentDecorations, []);
    activeWidgets.forEach(w => {
        if (w.dispose) w.dispose();
        else if (w.parentNode) w.parentNode.removeChild(w);
    });
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
            if (item.lineNumber === 0) return true; // General logic error
            
            // Check if within range
            if (item.lineNumber > model.getLineCount()) return false;
            
            const lineContent = model.getLineContent(item.lineNumber).trim();
            
            // Filter out empty lines or boilerplate
            if (lineContent === "") return false;
            if (lineContent.startsWith('#include')) return false;
            if (lineContent.includes('using namespace std;')) return false;
            if (lineContent.includes('ios::sync_with_stdio(false);')) return false;
            if (lineContent.includes('cin.tie(nullptr);')) return false;
            if (lineContent.includes('return 0;')) return false;
            
            return true;
        });
}

function applyDebugDecorationsWithParsed(allIssues) {
    if (allIssues.length === 0) return;
    
    debugIssueQueue = allIssues.filter(i => i.lineNumber > 0);
    currentGeneralIssue = allIssues.find(i => i.lineNumber === 0);
    currentDebugIndex = 0;
    
    if (debugIssueQueue.length > 0 || currentGeneralIssue) {
        activateDebugMode();
        if (debugIssueQueue.length > 0) {
            showDebugIssue(0);
        }
        if (currentGeneralIssue) {
            showGeneralDebugHint(currentGeneralIssue);
        }
    }
    
    loadCurrentTab();
}

function showDebugIssue(index) {
    // Clear previous widget/highlight
    activeWidgets.forEach(w => {
        if (w.dispose) w.dispose();
        else if (w.parentNode) w.parentNode.removeChild(w);
    });
    activeWidgets = [];
    currentDecorations = editor.deltaDecorations(currentDecorations, []);
    
    const issue = debugIssueQueue[index];
    if (!issue) return;
    
    // Highlight error line
    currentDecorations = editor.deltaDecorations([], [{
        range: new monaco.Range(issue.lineNumber, 1, issue.lineNumber, 1),
        options: {
            isWholeLine: true,
            className: 'debug-error-line',
            inlineClassName: 'debug-error-inline',
            glyphMarginClassName: 'debug-error-glyph',
            overviewRuler: {
                color: '#f44336',
                position: monaco.editor.OverviewRulerLane.Full
            }
        }
    }]);
    
    addDebugWidget(issue.lineNumber, issue.description, issue.suggestion, index);
}

window.nextDebugIssue = function() {
    currentDebugIndex++;
    if (currentDebugIndex < debugIssueQueue.length) {
        showDebugIssue(currentDebugIndex);
    } else {
        // Last issue dismissed. If no general hint, clear. 
        // If general hint exists, just remove line decorations but keep dimming?
        // User said: "After the last 'OK', clear debug mode entirely"
        clearDebugMode();
    }
}

function addDebugWidget(lineNumber, description, suggestion, index) {
    const total = debugIssueQueue.length;
    
    if (DebugZoneWidget) {
        const zoneWidget = new DebugZoneWidget(editor, index, total, description, suggestion);
        zoneWidget.show({ lineNumber: lineNumber, column: 1 }, 6);
        activeWidgets.push(zoneWidget);
        
        setTimeout(() => {
            if (editor) editor.revealLineInCenter(lineNumber);
        }, 50);
    } else {
        // Fallback to ContentWidget if ZoneWidget is not available
        const widgetNode = document.createElement('div');
        widgetNode.className = 'debug-widget';
        widgetNode.innerHTML = `
            <div class="debug-widget-content">
                <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Issue ${index + 1} of ${total} (Fallback)</div>
                <div class="debug-widget-desc">${description}</div>
                <div class="debug-widget-suggestion">${suggestion}</div>
                <button class="debug-widget-dismiss" onclick="nextDebugIssue()">${index + 1 < total ? 'Next Issue' : 'OK, Fixed'}</button>
            </div>
        `;
        
        const widget = {
            domNode: widgetNode,
            getId: () => 'debug-widget-' + index,
            getDomNode: () => widgetNode,
            getPosition: () => ({
                position: { lineNumber: lineNumber, column: 1 },
                preference: [monaco.editor.ContentWidgetPositionPreference.BELOW]
            })
        };
        
        editor.addContentWidget(widget);
        activeWidgets.push({
            dispose: () => editor.removeContentWidget(widget)
        });
        
        editor.revealLineInCenter(lineNumber);
    }
}

function showGeneralDebugHint(issue) {
    let bar = document.getElementById('debug-general-hint-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'debug-general-hint-bar';
        bar.className = 'general-hint-bar collapsed';
        bar.onclick = toggleGeneralHint;
        const editorPanel = document.getElementById('editor-panel');
        editorPanel.appendChild(bar);
    }
    
    if (isGeneralHintExpanded) {
        bar.className = 'general-hint-bar expanded';
        bar.innerHTML = `
            <div>▼ 整體建議</div>
            <div class="general-hint-content">
                <div style="color: #ff8a80; font-weight: bold; margin-bottom: 4px;">${issue.description}</div>
                <div>${issue.suggestion}</div>
            </div>
        `;
    } else {
        bar.className = 'general-hint-bar collapsed';
        bar.innerHTML = `▶ 有整體建議 (點擊展開)`;
    }
}

window.toggleGeneralHint = function() {
    isGeneralHintExpanded = !isGeneralHintExpanded;
    if (currentGeneralIssue) {
        showGeneralDebugHint(currentGeneralIssue);
    }
}
// --- End Debug Agent ---


// Layout Resizing
const resizerH = document.getElementById('resizer-horizontal');
const topPanels = document.getElementById('top-panels');
const problemPanel = document.getElementById('problem-panel');

let isResizingH = false;
resizerH.addEventListener('mousedown', (e) => {
    isResizingH = true;
    document.body.style.cursor = 'col-resize';
});

const resizerV = document.getElementById('resizer-vertical');
const mainContent = document.getElementById('main-content');
const tcPanel = document.getElementById('testcase-panel');

let isResizingV = false;
resizerV.addEventListener('mousedown', (e) => {
    isResizingV = true;
    document.body.style.cursor = 'row-resize';
});

document.addEventListener('mousemove', (e) => {
    if (isResizingH) {
        const pct = (e.clientX / window.innerWidth) * 100;
        if (pct > 10 && pct < 90) {
            problemPanel.style.width = pct + '%';
            document.getElementById('editor-panel').style.width = (100 - pct) + '%';
        }
    }
    if (isResizingV) {
        const offset = e.clientY - 40; // toolbar
        const pct = (offset / mainContent.clientHeight) * 100;
        if (pct > 20 && pct < 80) {
            topPanels.style.height = pct + '%';
            tcPanel.style.height = (100 - pct) + '%';
        }
    }
});

document.addEventListener('mouseup', () => {
    isResizingH = false;
    isResizingV = false;
    document.body.style.cursor = 'default';
});

// Initialization
renderTabs();
loadCurrentTab();

// ============================================
// Phase 2: Calendar Logic
// ============================================

const calendarBtn = document.getElementById('calendar-btn');
const calendarView = document.getElementById('calendar-view');
const calendarRefreshBtn = document.getElementById('calendar-refresh-btn');
const calendarLoading = document.getElementById('calendar-loading');
const calendarError = document.getElementById('calendar-error');
const calendarGridBody = document.getElementById('calendar-grid-body');
const calendarMonthTitle = document.getElementById('calendar-month-title');
const calendarPrevBtn = document.getElementById('calendar-prev-btn');
const calendarNextBtn = document.getElementById('calendar-next-btn');

const detailsPanel = document.getElementById('calendar-details-panel');
const detailsDateTitle = document.getElementById('details-date-title');
const detailsContestList = document.getElementById('details-contest-list');

let calendarActive = false;
let contestsCache = null;

// Phase 2C State
let trainingPlans = [];
let lastRatingSelected = "入門";

// Phase 2C DOM elements
const ratingModalOverlay = document.getElementById('rating-modal-overlay');
const ratingCancelBtn = document.getElementById('rating-cancel-btn');
const ratingConfirmBtn = document.getElementById('rating-confirm-btn');
const ratingRadios = document.querySelectorAll('input[name="user_level"]');

const planReviewOverlay = document.getElementById('plan-review-overlay');
const planReviewTitle = document.getElementById('plan-review-title');
const planReviewSubtitle = document.getElementById('plan-review-subtitle');
const planReviewLoading = document.getElementById('plan-review-loading');
const planReviewContent = document.getElementById('plan-review-content');
const planReviewActions = document.getElementById('plan-review-actions');
const planReviewCancelBtn = document.getElementById('plan-review-cancel-btn');
const planReviewRegenerateBtn = document.getElementById('plan-review-regenerate-btn');
const planReviewConfirmBtn = document.getElementById('plan-review-confirm-btn');

const agentNotificationBar = document.getElementById('agent-notification-bar');
const agentNotificationText = document.getElementById('agent-notification-text');

let activeContextContest = null;
let activePendingPlan = null;
let currentActiveContests = [];
let targetDateLabel = "";

function parseDate(s) {
    if (!s) return new Date();
    // If it's already a Date object, return it (just in case)
    if (s instanceof Date) return s;
    // Clist and other APIs might return ISO strings.
    // Ensure we treat them as UTC if they don't have timezone info,
    // as that's safe for competition platforms.
    if (s.includes('Z') || s.includes('+') || (s.includes('T') && s.split('-').length > 3)) {
        return new Date(s);
    }
    // For "2026-04-23 12:00:00" or similar, append Z for UTC
    if (s.includes(' ') && !s.includes('T')) {
        return new Date(s.replace(' ', 'T') + 'Z');
    }
    return new Date(s.includes('T') ? (s.endsWith('Z') ? s : s + 'Z') : s);
}

calendarBtn.addEventListener('click', () => {
    calendarActive = !calendarActive;
    if (calendarActive) {
        mainContent.style.display = 'none';
        calendarView.style.display = 'flex';
        calendarBtn.style.backgroundColor = 'var(--bg-panel)';
        if (!contestsCache) {
            loadContests();
        }
    } else {
        mainContent.style.display = 'flex';
        calendarView.style.display = 'none';
        calendarBtn.style.backgroundColor = 'transparent';
    }
});

calendarRefreshBtn.addEventListener('click', () => {
    loadContests();
});

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function getPlatformClass(platformUrl) {
    if (platformUrl.includes('codeforces')) return 'platform-codeforces';
    if (platformUrl.includes('leetcode')) return 'platform-leetcode';
    if (platformUrl.includes('atcoder')) return 'platform-atcoder';
    if (platformUrl.includes('codechef')) return 'platform-codechef';
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

async function loadContests() {
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoke) return;

    console.log("Loading contests via backend curl...");
    calendarLoading.style.display = 'block';
    calendarError.style.display = 'none';
    if (calendarGridBody) calendarGridBody.innerHTML = '';

    try {
        const contests = await invoke('fetch_contests', {
            clistUsername: appSettings.clistUsername || "",
            clistApiKey: appSettings.clistApiKey || ""
        });
        console.log("calendar response received:", contests);

        // We removed the dummy test contest

        contestsCache = contests;
        passiveAgentCheck();
        renderContests(contests);
    } catch (e) {
        console.error("fetch_contests failed:", e);
        calendarError.textContent = "Error fetching API: " + e;
        calendarError.style.display = 'block';
        calendarLoading.style.display = 'none';
    }
}

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

calendarPrevBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendarGrid();
});

calendarNextBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendarGrid();
});

function renderContests(contests) {
    calendarLoading.style.display = 'none';
    detailsPanel.style.display = 'none';
    
    // We already cached it to contestsCache, so just draw the grid
    renderCalendarGrid();
}

function renderCalendarGrid() {
    const list = contestsCache || [];
    calendarGridBody.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    calendarMonthTitle.textContent = `${firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
    
    const startOffset = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = lastDay.getDate();
    
    // Fill empty cells before the 1st
    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-cell empty-cell';
        calendarGridBody.appendChild(emptyCell);
    }
    
    // Fast lookup for contests by day
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
        if (isCurrentMonth && day === todayDate) {
            dayClass += ' today';
        }
        
        const dtStr = new Date(currentYear, currentMonth, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
        const localIsoDate = new Date(currentYear, currentMonth, day).toLocaleDateString('en-CA'); // YYYY-MM-DD

        let contestsHtml = '';
        const dayContests = monthContests[day] || [];
        
        // Find training plan tasks for this day
        const dayTrainingTasks = [];
        trainingPlans.forEach(plan => {
            plan.tasks.forEach(task => {
                if (task.date === localIsoDate) {
                    dayTrainingTasks.push(task);
                }
            });
        });

        if (dayContests.length > 0 || dayTrainingTasks.length > 0) {
            let barsHtml = '';
            let dotsHtml = '';
            const maxBars = 3;
            let renderedBars = 0;

            // Render contests as bars (16px high with text)
            for (let i = 0; i < dayContests.length && renderedBars < maxBars; i++) {
                const abbr = getPlatformAbbr(dayContests[i].platform);
                barsHtml += `<div class="platform-bar ${getPlatformClass(dayContests[i].platform)}">${abbr}</div>`;
                renderedBars++;
            }

            if (dayContests.length > maxBars) {
                barsHtml += `<div class="more-bars">+${dayContests.length - maxBars} more</div>`;
            }

            // Render training tasks as purple dots
            if (dayTrainingTasks.length > 0) {
                dotsHtml = '<div class="cell-dots-container">';
                for (let i = 0; i < dayTrainingTasks.length; i++) {
                    dotsHtml += `<div class="training-dot"></div>`;
                }
                dotsHtml += '</div>';
            }

            contestsHtml = `<div class="cell-bars-compact">${barsHtml}${dotsHtml}</div>`;
        }
        
        cell.innerHTML = `
            <div class="${dayClass}">${day}</div>
            <div class="cell-contests">${contestsHtml}</div>
        `;
        
        cell.addEventListener('click', () => {
            // Discard previous selections
            document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            
            showDetailsPanel(dtStr, dayContests, dayTrainingTasks);
        });
        
        calendarGridBody.appendChild(cell);
    }
    
    // Calculate total rows mapping
    const totalCells = startOffset + totalDays;
    const remain = totalCells % 7;
    if (remain !== 0) {
        for (let i = 0; i < (7 - remain); i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty-cell';
            calendarGridBody.appendChild(emptyCell);
        }
    }
}function showDetailsPanel(dateStr, dayContests, dayTrainingTasks) {
    detailsPanel.style.display = 'block';
    detailsDateTitle.innerHTML = `<span class="accent-bar" style="display:inline-block;width:4px;height:16px;background:#4CAF50;margin-right:8px;vertical-align:middle;border-radius:2px;"></span>已選擇： ${dateStr}`;
    detailsContestList.innerHTML = '';
    
    if (dayContests.length === 0 && (!dayTrainingTasks || dayTrainingTasks.length === 0)) {
        detailsContestList.innerHTML = '<div style="color: #888; font-size: 13px;">這天沒有比賽</div>';
        return;
    }

    currentActiveContests = dayContests;
    targetDateLabel = dateStr;
    const now = new Date();

    // Render training tasks first
    if (dayTrainingTasks && dayTrainingTasks.length > 0) {
        // Group by parent plan internally or just show all
        const trainingDiv = document.createElement('div');
        trainingDiv.className = `contest-item border-platform-training`;
        trainingDiv.style.flexDirection = 'column';
        trainingDiv.style.alignItems = 'flex-start';
        
        let headerHtml = `<div class="contest-title" style="margin-bottom: 8px;">練習計畫</div>`;
        let tasksHtml = '';
        dayTrainingTasks.forEach((task, idx) => {
            const isChecked = task.completed ? 'checked' : '';
            tasksHtml += `
            <label class="todo-item" style="margin-left: 4px; display: block; margin-bottom: 4px;">
                <input type="checkbox" data-task-idx="${idx}" ${isChecked}>
                <span class="todo-text">[${task.topic}] <a href="#" style="color: var(--accent-green); text-decoration: none;" onclick="openExternal('https://cses.fi/problemset/task/${task.source}')">${task.problem}</a> (${task.source}) - ${task.difficulty}</span>
            </label>`;
        });
        
        trainingDiv.innerHTML = headerHtml + tasksHtml;
        
        // Attach handlers to checkboxes
        trainingDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const checked = e.target.checked;
                // Find and update original reference
                dayTrainingTasks[cb.dataset.taskIdx].completed = checked;
            });
        });

        detailsContestList.appendChild(trainingDiv);
    }

    // Render Contests
    dayContests.forEach(c => {
        const itemDiv = document.createElement('div');
        const platformClass = getPlatformClass(c.platform);
        itemDiv.className = `contest-item border-${platformClass || 'platform-unknown'}`;

        const startDt = c.startDt || parseDate(c.start_time);
        const startStr = startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endDt = parseDate(c.end_time);
        const endStr = endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const timeLabel = `${startStr} — ${endStr} (${formatDuration(c.duration_minutes)})`;
        
        // Is future contest?
        const isFuture = startDt > now;
        const wantBtnHtml = isFuture ? `<button class="want-to-compete-btn">想打這場</button>` : '';

        itemDiv.innerHTML = `
            <div class="contest-main">
                <div class="contest-title">
                    ${c.name}
                </div>
                <div class="contest-time">${timeLabel}</div>
            </div>
            <div class="contest-actions">
                ${wantBtnHtml}
                <button class="open-link-btn" data-url="${c.url}">開啟</button>
            </div>
        `;

        itemDiv.querySelector('.open-link-btn').addEventListener('click', () => {
            openExternal(c.url);
        });
        
        if (isFuture) {
            const btn = itemDiv.querySelector('.want-to-compete-btn');
            if (btn) {
                btn.addEventListener('click', () => {
                    openRatingModal(c);
                });
            }
        }
        
        detailsContestList.appendChild(itemDiv);
    });
}

// ----------------------------------------------------
// Agent Workflow (Phase 2C)
// ----------------------------------------------------

function openRatingModal(contest) {
    activeContextContest = contest;
    ratingModalOverlay.style.display = 'flex';
    // Remember last selection
    ratingRadios.forEach(radio => {
        if (radio.value === lastRatingSelected) {
            radio.checked = true;
        }
    });
}

ratingCancelBtn.addEventListener('click', () => {
    ratingModalOverlay.style.display = 'none';
    activeContextContest = null;
});

ratingConfirmBtn.addEventListener('click', () => {
    const selected = document.querySelector('input[name="user_level"]:checked');
    lastRatingSelected = selected.value;
    
    ratingModalOverlay.style.display = 'none';
    planReviewOverlay.style.display = 'flex';
    planReviewLoading.style.display = 'block';
    planReviewContent.style.display = 'none';
    planReviewActions.style.display = 'none';
    
    generateTrainingPlan();
});

planReviewCancelBtn.addEventListener('click', () => {
    planReviewOverlay.style.display = 'none';
    activePendingPlan = null;
});

planReviewRegenerateBtn.addEventListener('click', () => {
    planReviewLoading.style.display = 'block';
    planReviewContent.style.display = 'none';
    planReviewActions.style.display = 'none';
    generateTrainingPlan();
});

planReviewConfirmBtn.addEventListener('click', () => {
    if (activePendingPlan) {
        trainingPlans.push(activePendingPlan);
        renderCalendarGrid();
        passiveAgentCheck();
    }
    planReviewOverlay.style.display = 'none';
    activePendingPlan = null;
});

async function generateTrainingPlan() {
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoke || !activeContextContest) return;

    const contest = activeContextContest;
    const now = new Date();
    const diffTime = contest.startDt.getTime() - now.getTime();
    let daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntil < 1) daysUntil = 1;

    try {
        const response = await invoke('generate_training_plan', { 
            contestName: contest.name,
            contestPlatform: contest.platform,
            contestDate: contest.start_time,
            daysUntil: daysUntil,
            userLevel: lastRatingSelected,
            groqApiKey: appSettings.groqApiKey || ""
        });
        
        parseReviewPlan(response, contest, daysUntil);
        
    } catch (e) {
        console.error("Agent failed:", e);
        planReviewLoading.style.display = 'none';
        planReviewContent.innerHTML = `<div style="color: #ff5252;">產生計畫失敗，請檢查 API Key 是否正確。</div>`;
        planReviewContent.style.display = 'block';
        planReviewActions.style.display = 'flex';
        document.getElementById('plan-review-confirm-btn').style.display = 'none';
    }
}

function parseReviewPlan(rawResponse, contest, daysUntil) {
    console.log("GROQ RAW RESPONSE IN JS:", rawResponse);
    const lines = rawResponse.split('\n');
    let groupedByDay = {};
    let dateMapping = {}; 
    
    // Use the user's recommended formula: contest_date - days_until + day_number - 1
    const contestDt = contest.startDt || parseDate(contest.start_time);

    lines.forEach(line => {
        if (!line.includes('|')) return;
        const parts = line.split('|').map(s => s.trim());
        if (parts.length < 5) return;
        
        console.log("Parsing line:", line);
        
        // Format: DAY 1 | Name | Source | Topic | Diff
        const dayStr = parts[0].toUpperCase();
        let dayNum = 1;
        const match = dayStr.match(/\d+/);
        if (match) dayNum = parseInt(match[0]);
        
        if (!groupedByDay[dayNum]) {
            groupedByDay[dayNum] = [];
            
            const targetDate = new Date(contestDt);
            // formula: contest_date - days_until + day_number - 1
            targetDate.setDate(targetDate.getDate() - daysUntil + (dayNum - 1));
            
            dateMapping[dayNum] = {
                iso: targetDate.toLocaleDateString('en-CA'),
                label: targetDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', weekday: 'short' })
            };
            console.log(`Day ${dayNum} mapped to:`, dateMapping[dayNum].iso);
        }
        
        groupedByDay[dayNum].push({
            date: dateMapping[dayNum].iso,
            problem: parts[1],
            source: parts[2],
            topic: parts[3],
            difficulty: parts[4],
            completed: false
        });
    });

    const contestDateLabel = contest.startDt.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', weekday: 'short' });
    planReviewTitle.textContent = `備賽計畫：${contest.name}`;
    planReviewSubtitle.textContent = `比賽日期：${contestDateLabel}   你的程度：${lastRatingSelected}`;

    let reviewHtml = '';
    let flatTasksList = [];

    // Keys sorted logically
    const sortedDays = Object.keys(groupedByDay).map(Number).sort((a,b)=>a-b);
    
        sortedDays.forEach(day => {
        reviewHtml += `<div class="plan-day-header">Day ${day} — ${dateMapping[day].label}</div>`;
        groupedByDay[day].forEach(task => {
            flatTasksList.push(task);
            const link = `https://cses.fi/problemset/task/${task.source}`;
            reviewHtml += `<div style="font-size: 13px; margin-bottom: 4px; color: #ccc;">□ [${task.topic}] <a href="#" style="color: var(--accent-green); text-decoration: none;" onclick="openExternal('${link}')">${task.problem}</a> (${task.source}) - ${task.difficulty}</div>`;
        });
    });

    // Cache the pending plan
    activePendingPlan = {
        contestName: contest.name,
        tasks: flatTasksList
    };

    planReviewLoading.style.display = 'none';
    planReviewContent.innerHTML = reviewHtml;
    planReviewContent.style.display = 'block';
    
    planReviewActions.style.display = 'flex';
    document.getElementById('plan-review-confirm-btn').style.display = 'block';
}

function passiveAgentCheck() {
    if (!contestsCache) return;
    const now = new Date();
    
    let upcomingMatchesCount = 0;
    
    // Check next 3 days
    contestsCache.forEach(c => {
        const startDt = parseDate(c.start_time);
        if (startDt > now) {
            const diffTime = startDt.getTime() - now.getTime();
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= 3) {
                // Check if this contest already has a generated plan
                const hasPlan = trainingPlans.some(p => p.contestName === c.name);
                if (!hasPlan) {
                    upcomingMatchesCount++;
                }
            }
        }
    });

    if (upcomingMatchesCount > 0) {
        agentNotificationText.textContent = `3天內有 ${upcomingMatchesCount} 場比賽尚未規劃，要安排練習嗎？`;
        agentNotificationBar.style.display = 'block';
        
        // Ensure handler removes old bound ones by re-assigning onclick instead of multiple eventListeners
        agentNotificationBar.onclick = () => {
            const firstUnplanned = contestsCache.find(c => {
                const sDt = parseDate(c.start_time);
                const diffTime = sDt.getTime() - now.getTime();
                const dU = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return sDt > now && dU <= 3 && !trainingPlans.some(p => p.contestName === c.name);
            });
            if (firstUnplanned) {
                const targetDt = parseDate(firstUnplanned.start_time);
                if (targetDt.getFullYear() === currentYear && targetDt.getMonth() === currentMonth) {
                    const d = targetDt.getDate();
                    const cells = document.querySelectorAll('.calendar-cell');
                    // Find cell matching text matching this day
                    for (const cell of cells) {
                        const dateDiv = cell.querySelector('.cell-date');
                        if (dateDiv && dateDiv.textContent.trim() === String(d)) {
                            // Scroll and trigger
                            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            cell.click();
                            break;
                        }
                    }
                } else {
                    currentYear = targetDt.getFullYear();
                    currentMonth = targetDt.getMonth();
                    renderCalendarGrid();
                    const cells = document.querySelectorAll('.calendar-cell');
                    for (const cell of cells) {
                        const dateDiv = cell.querySelector('.cell-date');
                        if (dateDiv && dateDiv.textContent.trim() === String(targetDt.getDate())) {
                            cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            cell.click();
                            break;
                        }
                    }
                }
            }
        };

    } else {
        agentNotificationBar.style.display = 'none';
        agentNotificationBar.onclick = null;
    }
}
