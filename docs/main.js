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
        agentMsg: "你的程式碼在 w 是最小的偶數 (w=2) 時，邏輯依然正確嗎？",
        errorMsg: "WA (Wrong Answer) on test 5"
    },
    'overflow': {
        code: [
            '<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> a, b;',
            '    cin >> a >> b;',
            '    ',
            '    <span class="type">int</span> sum = a * b; <span class="comment">// 這裡可能會溢位</span>',
            '    cout << sum << <span class="string">"\\n"</span>;',
            '    ',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 8,
        agentMsg: "注意變數範圍。當 a 和 b 都是 10^5 時，它們的乘積會超過 int 的最大值嗎？",
        errorMsg: "WA (Wrong Answer) on test 12"
    },
    'missing-input': {
        code: [
            '<span class="keyword">#include</span> <span class="string">&lt;iostream&gt;</span>',
            '<span class="keyword">using namespace</span> std;',
            '',
            '<span class="type">int</span> <span class="function">main</span>() {',
            '    <span class="type">int</span> t;',
            '    cin >> t;',
            '    ',
            '    <span class="keyword">while</span> (t--) {',
            '        <span class="type">int</span> n;',
            '        <span class="comment">// cin >> n; // 忘記讀取 N</span>',
            '        cout << <span class="string">"Case processing...\\n"</span>;',
            '    }',
            '    <span class="keyword">return</span> <span class="number">0</span>;',
            '}'
        ],
        highlightLine: 9,
        agentMsg: "你宣告了 n，但是在迴圈中是否有正確讀取它的值呢？",
        errorMsg: "TLE (Time Limit Exceeded) on test 1"
    }
};

const codeArea = document.getElementById('code-area');
const lineNumbers = document.getElementById('line-numbers');
const runBtn = document.getElementById('run-btn');
const terminalContent = document.getElementById('terminal-content');
const aiBubble = document.getElementById('ai-bubble');
const aiText = document.getElementById('ai-text');
const scenarioBtns = document.querySelectorAll('.scenario-btn');

let currentScenario = null;
let isTyping = false;

function resetIDE() {
    codeArea.innerHTML = '';
    lineNumbers.innerHTML = '1';
    terminalContent.innerHTML = '';
    aiBubble.classList.add('hidden');
    aiText.innerHTML = '';
    runBtn.disabled = true;
}

async function typeCode(codeLines) {
    isTyping = true;
    codeArea.innerHTML = '';
    lineNumbers.innerHTML = '';
    
    let currentHTML = '';
    let currentLineNums = '';
    
    for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i];
        currentLineNums += (i + 1) + '<br>';
        lineNumbers.innerHTML = currentLineNums;
        
        // Simple typing effect line by line
        currentHTML += `<div class="line" id="line-${i+1}">${line || ' '}</div>`;
        codeArea.innerHTML = currentHTML;
        
        await new Promise(r => setTimeout(r, 80));
    }
    
    isTyping = false;
    runBtn.disabled = false;
}

async function typeAgentMessage(message) {
    aiText.innerHTML = '';
    let text = '';
    for (let i = 0; i < message.length; i++) {
        text += message[i];
        aiText.innerHTML = text;
        await new Promise(r => setTimeout(r, 30));
    }
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
    
    terminalContent.innerHTML = `<div style="color: #ccc;">Compiling main.cpp...</div>`;
    
    setTimeout(() => {
        terminalContent.innerHTML += `<div style="color: #ccc;">Running test cases...</div>`;
        
        setTimeout(() => {
            terminalContent.innerHTML += `<div class="wa">${currentScenario.errorMsg}</div>`;
            
            setTimeout(async () => {
                aiBubble.classList.remove('hidden');
                
                const lineElem = document.getElementById(`line-${currentScenario.highlightLine}`);
                if (lineElem) {
                    const originalContent = lineElem.innerHTML;
                    lineElem.innerHTML = `<span class="highlight-line">${originalContent}</span>`;
                }
                
                await typeAgentMessage(currentScenario.agentMsg);
                runBtn.disabled = false;
            }, 1000);
            
        }, 800);
    }, 600);
});

// Init first scenario
scenarioBtns[0].click();
