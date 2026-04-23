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

// Initialize Monaco when loaded
require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: DEFAULT_CPP,
        language: 'cpp',
        theme: 'vs-dark',
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: 'off',
        lineNumbers: 'on',
        automaticLayout: true
    });

    // Setup shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runCode();
    });
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
    } catch (e) {
        alert("Failed to invoke backend: " + e);
    }
    
    loadCurrentTab();
    renderTabs();
}

document.getElementById('run-btn').addEventListener('click', runCode);

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
