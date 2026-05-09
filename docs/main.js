const scenarios = {
    'wa': {
        code: [
            '<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> w;',
            '    cin >> w;',
            '    ',
            '    <span class="keyword">if</span> (w % <span class="number">2</span> == <span class="number">0</span>) {',
            '        cout << <span class="string">"YES\\n"</span>;',
            '    } <span class="keyword">else</span> {',
            '        cout << <span class="string">"NO\\n"</span>;',
            '    }',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 8,
        agentMsg: "你的程式碼在 w 是最小的偶數 (w=2) 時，邏輯依然正確嗎？",
        errorClass: "verdict-wa",
        errorText: "WA",
        input: "2",
        expected: "NO",
        actual: "YES"
    },
    're': {
        code: [
            '<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> w;',
            '    cin >> w;',
            '    <span class="type">int</span> a = w - <span class="number">2</span>;',
            '    <span class="type">int</span> ratio = w / a;',
            '    ',
            '    <span class="keyword">if</span> (ratio % <span class="number">2</span> == <span class="number">0</span>) cout << <span class="string">"YES\\n"</span>;',
            '    <span class="keyword">else</span> cout << <span class="string">"NO\\n"</span>;',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 8,
        agentMsg: "當輸入的 w 為 2 時，變數 a 會變成什麼？這會導致什麼嚴重的執行期錯誤？",
        errorClass: "verdict-error",
        errorText: "Runtime Error (SIGFPE)",
        input: "2",
        expected: "NO",
        actual: "N/A"
    },
    'tle': {
        code: [
            '<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> w;',
            '    cin >> w;',
            '    <span class="type">int</span> i = <span class="number">2</span>;',
            '    <span class="keyword">while</span> (i < w) {',
            '        <span class="keyword">if</span> (w % i == <span class="number">0</span>) <span class="keyword">return</span> cout << <span class="string">"YES\\n"</span>, <span class="number">0</span>;',
            '    }',
            '    cout << <span class="string">"NO\\n"</span>;',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 8,
        agentMsg: "你的 while 迴圈條件依賴變數 i，但在迴圈內部卻沒有看到更新 i 的操作。這會導致什麼結果？",
        errorClass: "verdict-tle",
        errorText: "Time Limit Exceeded",
        input: "8",
        expected: "YES",
        actual: "N/A"
    }
};

const editorContent = document.getElementById('editor');
const runBtn = document.getElementById('run-btn');
const scenarioBtns = document.querySelectorAll('.scenario-btn');

// Test Case Elements
const tcInput = document.getElementById('tc-input');
const tcExpected = document.getElementById('tc-expected');
const tcActual = document.getElementById('tc-actual');
const tcVerdict = document.getElementById('tc-verdict');

let currentScenario = null;
let isTyping = false;

// 1. Fetch Latest Release
async function fetchLatestRelease() {
    try {
        const response = await fetch('https://api.github.com/repos/rayhuang2006/Aceey/releases/latest');
        if (!response.ok) return;
        const data = await response.json();
        
        const dmgAsset = data.assets.find(asset => asset.name.endsWith('.dmg'));
        if (dmgAsset) {
            const downloadLinks = document.querySelectorAll('.download-link');
            downloadLinks.forEach(link => {
                link.href = dmgAsset.browser_download_url;
                const subText = link.querySelector('.btn-sub-text');
                if (subText) subText.innerText = `macOS Apple Silicon (${data.tag_name})`;
            });
        }
    } catch (e) {}
}
fetchLatestRelease();

// 2. Scroll Animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

function resetIDE() {
    editorContent.innerHTML = '';
    tcInput.innerText = currentScenario ? currentScenario.input : '';
    tcExpected.innerText = currentScenario ? currentScenario.expected : '';
    tcActual.innerText = '';
    tcVerdict.innerHTML = '<span class="verdict-pending">Pending...</span>';
    runBtn.disabled = true;
}

async function typeCode(codeLines) {
    isTyping = true;
    const container = document.createElement('div');
    container.className = 'code-container';
    editorContent.appendChild(container);
    
    for (let i = 0; i < codeLines.length; i++) {
        const lineWrapper = document.createElement('div');
        lineWrapper.className = 'code-line-wrapper';
        lineWrapper.id = `line-wrapper-${i + 1}`;
        lineWrapper.innerHTML = `<div class="line-number">${i + 1}</div><div class="line-content" id="line-${i + 1}">${codeLines[i] || ' '}</div>`;
        container.appendChild(lineWrapper);
        await new Promise(r => setTimeout(r, 40));
    }
    isTyping = false;
    runBtn.disabled = false;
}

async function typeAgentMessage(widgetTextElement, message) {
    let index = 0;
    return new Promise(resolve => {
        const interval = setInterval(() => {
            widgetTextElement.innerText += message[index++];
            if (index >= message.length) {
                clearInterval(interval);
                resolve();
            }
        }, 30);
    });
}

scenarioBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (isTyping) return;
        scenarioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScenario = scenarios[btn.getAttribute('data-scenario')];
        resetIDE();
        await typeCode(currentScenario.code);
    });
});

runBtn.addEventListener('click', () => {
    if (!currentScenario || isTyping) return;
    runBtn.disabled = true;
    tcVerdict.innerHTML = '<span class="verdict-pending">Running...</span>';
    
    setTimeout(() => {
        tcActual.innerText = currentScenario.actual;
        tcVerdict.innerHTML = `<span class="${currentScenario.errorClass}">${currentScenario.errorText}</span>`;
        
        setTimeout(async () => {
            document.getElementById(`line-${currentScenario.highlightLine}`).classList.add('highlight-bg');
            const zoneWidget = document.createElement('div');
            zoneWidget.className = 'zone-widget';
            zoneWidget.innerHTML = `<div class="zone-content"><div class="zone-icon"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div><div class="zone-text" id="zone-msg"></div></div>`;
            document.getElementById(`line-wrapper-${currentScenario.highlightLine}`).after(zoneWidget);
            await typeAgentMessage(document.getElementById('zone-msg'), currentScenario.agentMsg);
            runBtn.disabled = false;
        }, 600);
    }, 600);
});

// 3. Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const sunIcon = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;
const moonIcon = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = moonIcon;
    } else {
        document.body.classList.remove('light-mode');
        themeToggle.innerHTML = sunIcon;
    }
    localStorage.setItem('theme', theme);
}

themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-mode');
    setTheme(isLight ? 'dark' : 'light');
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    scenarioBtns[0].click();
});
