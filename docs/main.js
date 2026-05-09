const scenarios = {
    'w2': {
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
        agentMsg: "w=2 時，可以分成兩個偶數嗎？",
        errorClass: "verdict-wa",
        errorText: "WA"
    },
    'logic': {
        code: [
            '<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> w;',
            '    cin >> w;',
            '    ',
            '    <span class="keyword">if</span> (w % <span class="number">2</span> != <span class="number">0</span>) {',
            '        cout << <span class="string">"YES\\n"</span>;',
            '    } <span class="keyword">else</span> {',
            '        cout << <span class="string">"NO\\n"</span>;',
            '    }',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 8,
        agentMsg: "題目要求分成兩個『偶數』，你的條件是不是寫反了？",
        errorClass: "verdict-wa",
        errorText: "WA"
    },
    'include': {
        code: [
            '<span class="comment">// 漏寫標頭檔</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> w;',
            '    cin >> w;',
            '    ',
            '    <span class="keyword">if</span> (w > <span class="number">2</span> && w % <span class="number">2</span> == <span class="number">0</span>) {',
            '        cout << <span class="string">"YES\\n"</span>;',
            '    } <span class="keyword">else</span> {',
            '        cout << <span class="string">"NO\\n"</span>;',
            '    }',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 6,
        agentMsg: "編譯器不認得 cin 和 cout，是不是忘記引入哪個標準函式庫了？",
        errorClass: "verdict-error",
        errorText: "Compilation Error"
    }
};

const editorContent = document.getElementById('editor');
const runBtn = document.getElementById('run-btn');
const scenarioBtns = document.querySelectorAll('.scenario-btn');

// Test Case Elements
const tcActual = document.getElementById('tc-actual');
const tcVerdict = document.getElementById('tc-verdict');

let currentScenario = null;
let isTyping = false;

// 1. Fetch Latest Release for all download buttons
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
                if (subText) {
                    subText.innerText = `macOS Apple Silicon (${data.tag_name})`;
                }
            });
        }
    } catch (error) {
        console.error("Failed to fetch GitHub release", error);
    }
}
fetchLatestRelease();

// 2. Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

function resetIDE() {
    editorContent.innerHTML = '';
    tcActual.innerHTML = '';
    tcVerdict.innerHTML = '<span class="verdict-pending">Pending...</span>';
    runBtn.disabled = true;
}

async function typeCode(codeLines) {
    isTyping = true;
    
    const container = document.createElement('div');
    container.className = 'code-container';
    editorContent.appendChild(container);
    
    for (let i = 0; i < codeLines.length; i++) {
        const lineText = codeLines[i];
        
        const lineWrapper = document.createElement('div');
        lineWrapper.className = 'code-line-wrapper';
        lineWrapper.id = `line-wrapper-${i + 1}`;
        
        const lineNum = document.createElement('div');
        lineNum.className = 'line-number';
        lineNum.innerText = i + 1;
        
        const lineContent = document.createElement('div');
        lineContent.className = 'line-content';
        lineContent.id = `line-${i + 1}`;
        lineContent.innerHTML = lineText || ' ';
        
        lineWrapper.appendChild(lineNum);
        lineWrapper.appendChild(lineContent);
        container.appendChild(lineWrapper);
        
        await new Promise(r => setTimeout(r, 40));
    }
    
    isTyping = false;
    runBtn.disabled = false;
}

async function typeAgentMessage(widgetTextElement, message) {
    let currentText = '';
    let index = 0;
    
    return new Promise(resolve => {
        const interval = setInterval(() => {
            currentText += message[index];
            widgetTextElement.innerText = currentText;
            index++;
            
            if (index >= message.length) {
                clearInterval(interval);
                resolve();
            }
        }, 40); // 40ms per character
    });
}

scenarioBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (isTyping) return;
        
        scenarioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        resetIDE();
        
        const scenarioKey = btn.getAttribute('data-scenario');
        currentScenario = scenarios[scenarioKey];
        
        await typeCode(currentScenario.code);
    });
});

runBtn.addEventListener('click', () => {
    if (!currentScenario || isTyping) return;
    
    runBtn.disabled = true;
    
    tcVerdict.innerHTML = '<span class="verdict-pending">Running...</span>';
    
    setTimeout(() => {
        if (currentScenario.errorText === 'Compilation Error') {
            tcActual.innerHTML = 'N/A';
        } else {
            tcActual.innerHTML = currentScenario.errorText === 'WA' ? 'YES' : 'Timeout';
        }
        
        tcVerdict.innerHTML = `<span class="${currentScenario.errorClass}">${currentScenario.errorText}</span>`;
        
        setTimeout(async () => {
            const lineContent = document.getElementById(`line-${currentScenario.highlightLine}`);
            if (lineContent) {
                lineContent.classList.add('highlight-bg');
            }
            
            const zoneWidget = document.createElement('div');
            zoneWidget.className = 'zone-widget';
            
            // Using SVG instead of emoji
            zoneWidget.innerHTML = `
                <div class="zone-content">
                    <div class="zone-icon">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                    <div class="zone-text" id="zone-msg"></div>
                </div>
            `;
            
            const lineWrapper = document.getElementById(`line-wrapper-${currentScenario.highlightLine}`);
            if (lineWrapper) {
                lineWrapper.after(zoneWidget);
            }
            
            const zoneMsg = document.getElementById('zone-msg');
            await typeAgentMessage(zoneMsg, currentScenario.agentMsg);
            
            runBtn.disabled = false;
        }, 600);
        
    }, 600);
});

// Init first scenario on load
window.addEventListener('DOMContentLoaded', () => {
    if (scenarioBtns.length > 0) {
        scenarioBtns[0].click();
    }
});
