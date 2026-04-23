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

const aiSuggestionWrapper = document.getElementById('ai-suggestion-wrapper');
const aiSuggestionText = document.getElementById('ai-suggestion-text');
const aiLoadingText = document.getElementById('ai-loading-text');
const aiActions = document.querySelector('.ai-actions');
const aiSoundsGoodBtn = document.getElementById('ai-sounds-good-btn');
const aiRefreshBtn = document.getElementById('ai-refresh-btn');

let calendarActive = false;
let contestsCache = null;

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

async function loadContests() {
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoke) return;

    console.log("Loading contests via backend curl...");
    calendarLoading.style.display = 'block';
    calendarError.style.display = 'none';
    if (calendarGridBody) calendarGridBody.innerHTML = '';

    try {
        const contests = await invoke('fetch_contests');
        console.log("calendar response received:", contests);

        // We removed the dummy test contest

        contestsCache = contests;
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
        const dt = new Date(c.start_time + 'Z');
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
        
        // Ensure day integer respects exact bounds relative to today.
        const dtStr = new Date(currentYear, currentMonth, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });

        let contestsHtml = '';
        const dayContests = monthContests[day] || [];
        
        if (dayContests.length > 0) {
            let barsHtml = '';
            const maxBars = 3;
            for (let i = 0; i < Math.min(dayContests.length, maxBars); i++) {
                barsHtml += `<div class="platform-bar ${getPlatformClass(dayContests[i].platform)}"></div>`;
            }
            if (dayContests.length > maxBars) {
                barsHtml += `<div class="more-bars">+${dayContests.length - maxBars} more</div>`;
            }
            contestsHtml = `<div class="cell-bars-compact">${barsHtml}</div>`;
        }
        
        cell.innerHTML = `
            <div class="${dayClass}">${day}</div>
            <div class="cell-contests">${contestsHtml}</div>
        `;
        
        cell.addEventListener('click', () => {
            // Discard previous selections
            document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            
            showDetailsPanel(dtStr, dayContests);
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
}

let currentActiveContests = [];
let targetDateLabel = "";

function showDetailsPanel(dateStr, dayContests) {
    detailsPanel.style.display = 'block';
    detailsDateTitle.innerHTML = `<span class="accent-bar" style="display:inline-block;width:4px;height:16px;background:#4CAF50;margin-right:8px;vertical-align:middle;border-radius:2px;"></span>已選擇： ${dateStr}`;
    detailsContestList.innerHTML = '';
    
    if (dayContests.length === 0) {
        detailsContestList.innerHTML = '<div style="color: #888; font-size: 13px;">這天沒有比賽</div>';
        aiSuggestionWrapper.style.display = 'none';
        return;
    }

    currentActiveContests = dayContests;
    targetDateLabel = dateStr;

    dayContests.forEach(c => {
        const itemDiv = document.createElement('div');
        const platformClass = getPlatformClass(c.platform);
        itemDiv.className = `contest-item border-${platformClass || 'platform-unknown'}`;

        const startStr = c.startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endDt = new Date(c.end_time + 'Z');
        const endStr = endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const timeLabel = `${startStr} — ${endStr} (${formatDuration(c.duration_minutes)})`;

        itemDiv.innerHTML = `
            <div class="contest-main">
                <div class="contest-title">
                    ${c.name}
                </div>
                <div class="contest-time">${timeLabel}</div>
            </div>
            <button class="open-link-btn" data-url="${c.url}">開啟</button>
        `;

        itemDiv.querySelector('.open-link-btn').addEventListener('click', () => {
            const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
            if (invoke) {
                invoke('plugin:shell|open', { path: c.url });
            } else {
                window.open(c.url, '_blank');
            }
        });
        
        detailsContestList.appendChild(itemDiv);
    });

    // Invoke AI Agent
    requestAiSuggestion();
}

async function requestAiSuggestion() {
    const invoke = window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke;
    if (!invoke || currentActiveContests.length === 0) return;

    aiSuggestionWrapper.style.display = 'block';
    aiLoadingText.style.display = 'block';
    aiSuggestionText.style.display = 'none';
    aiActions.style.display = 'none';
    
    // We compute rough days_until
    const now = new Date();
    // Use the first contest on that day
    const startDt = currentActiveContests[0].startDt;
    const diffTime = startDt.getTime() - now.getTime();
    let daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) daysUntil = 0;

    // strip the startDt complex structures for rust invoking payload constraints
    const safePayload = currentActiveContests.map(c => ({
        name: c.name,
        platform: c.platform,
        start_time: c.start_time,
        end_time: c.end_time,
        duration_minutes: c.duration_minutes,
        url: c.url
    }));

    try {
        const response = await invoke('get_practice_suggestion', { contests: safePayload, daysUntil: daysUntil });
        
        const lines = response.split('\\n');
        let htmlResponse = '';
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('□')) {
                const content = trimmed.substring(1).trim();
                htmlResponse += `
                <label class="todo-item">
                    <input type="checkbox">
                    <span class="todo-text">${content}</span>
                </label>`;
            } else if (trimmed !== '') {
                htmlResponse += `<div class="ai-paragraph">${trimmed}</div>`;
            }
        });
        
        aiSuggestionText.innerHTML = htmlResponse;
        
        aiLoadingText.style.display = 'none';
        aiSuggestionText.style.display = 'block';
        aiActions.style.display = 'flex';
    } catch (e) {
        console.error("AI Gen Failed:", e);
        aiSuggestionText.textContent = "AI Suggestion unavailable. Check GROQ_API_KEY inside your .env configuration.";
        aiLoadingText.style.display = 'none';
        aiSuggestionText.style.display = 'block';
    }
}

aiSoundsGoodBtn.addEventListener('click', () => {
    aiSuggestionWrapper.style.display = 'none';
});

aiRefreshBtn.addEventListener('click', () => {
    requestAiSuggestion();
});
