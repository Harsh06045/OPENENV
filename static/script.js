/* 
   OpenEnv | The "Advanced" JS Logic (Refined)
*/

let chart = null;
let currentTaskId = null;
let scoreHistory = [];
let sessionResults = [];
let isAutoRunning = false;

// 1. Initialize Leaderboard with API Data
async function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    
    try {
        const res = await fetch('/leaderboard');
        const board = await res.json();
        const avg = scoreHistory.length ? (scoreHistory.reduce((a,b)=>a+b, 0) / scoreHistory.length) : 0;
        const currentIdx = board.findIndex(b => b.name === "Current Session");
        if (currentIdx !== -1) board[currentIdx].score = avg;

        list.innerHTML = board
            .sort((a, b) => b.score - a.score)
            .map((agent, i) => `
                <div class="flex justify-between items-center text-[10px] bg-white/[0.02] border border-white/5 p-3 rounded-lg animate-slide-up" style="animation-delay: ${i*0.1}s">
                    <div>
                        <div class="font-bold text-white">${agent.name}</div>
                        <div class="text-[8px] text-zinc-600 uppercase tracking-widest">${agent.type}</div>
                    </div>
                    <div class="font-mono text-indigo-500">${agent.score.toFixed(2)}</div>
                </div>
            `).join('');
    } catch (err) { console.error(err); }
}

// 2. Initialize Reward Chart
function initChart() {
    const ctx = document.getElementById('scoreChart');
    if (!ctx) return;
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Reward',
                data: [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { display: false } },
                x: { grid: { display : false }, ticks: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function setStatus(text, active = true) {
    const label = document.getElementById('env-status-text');
    if (label) label.innerText = text;
}

// 3. RESET TASK
async function resetEnv() {
    const task = document.getElementById('task-select').value;
    setStatus(`REBOOT:// ${task.toUpperCase()}`, true);
    document.getElementById('thought-console').innerHTML += `<br>> REBOOTING ENVIRONMENT [TASK: ${task}]...`;
    
    try {
        const res = await fetch(`/reset?task=${task}`, { method: 'POST' });
        const data = await res.json();
        document.getElementById('ticket-buffer').value = data.observation.text;
        document.getElementById('ticket-id-badge').innerText = data.observation.id;
        scoreHistory = [];
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        setStatus("READY", true);
    } catch (err) { console.error(err); }
}

// 5. AUTO-SOLVE (LLM PROXY)
async function autoSolve() {
    const startTime = performance.now();
    const ticketText = document.getElementById('ticket-buffer').value;
    const btn = document.getElementById('btn-auto');
    const console = document.getElementById('thought-console');
    
    btn.disabled = true;
    console.innerHTML += `<br>> ANALYZING TICKET STIMULUS...`;
    
    try {
        const res = await fetch('/auto-solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_text: ticketText })
        });
        const action = await res.json();
        const endTime = performance.now();
        
        document.getElementById('metric-latency').innerText = `${Math.round(endTime - startTime)}ms`;
        document.getElementById('metric-cost').innerText = `$${(Math.random() * 0.01).toFixed(3)}`;
        
        document.getElementById('action-category').value = action.category || "general";
        document.getElementById('action-priority').value = action.priority || "medium";
        document.getElementById('action-response').value = action.response || "";
        
        console.innerHTML += `<br>> CLASSIFIED AS ${action.category.toUpperCase()} [${action.priority.toUpperCase()}]<br>> PROPOSAL GENERATED.`;
        console.scrollTop = console.scrollHeight;
    } catch (err) { console.error(err); }
    finally { btn.disabled = false; }
}

// 6. SUBMIT ACTION
async function submitAction(silent = false) {
    const action = {
        category: document.getElementById('action-category').value,
        priority: document.getElementById('action-priority').value,
        response: document.getElementById('action-response').value
    };

    try {
        const res = await fetch('/step', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
        });
        const result = await res.json();
        
        scoreHistory.push(result.reward);
        const avg = scoreHistory.reduce((a,b)=>a+b, 0) / scoreHistory.length;
        
        document.getElementById('metric-reward').innerText = result.reward.toFixed(2);
        document.getElementById('metric-total').innerText = avg.toFixed(2);
        document.getElementById('metric-steps').innerText = `Iter://${scoreHistory.length}:5`;
        document.getElementById('metric-feedback').innerText = result.info.feedback;

        chart.data.labels.push(`S${scoreHistory.length}`);
        chart.data.datasets[0].data.push(result.reward);
        chart.update();
        updateHeatmap(result.reward);

        if (result.done) {
            setStatus("COMPLETE", true);
            sessionResults.push({ task: document.getElementById('task-select').value, final_score: avg });
            updateSessionLog();
        }
        return result;
    } catch (err) { return { done: true }; }
}

async function toggleAutoBenchmark() {
    if (isAutoRunning) { isAutoRunning = false; return; }
    isAutoRunning = true;
    while (isAutoRunning) {
        await resetEnv();
        if (!isAutoRunning) break;
        let done = false;
        while (!done && isAutoRunning) {
            await autoSolve();
            const res = await submitAction(true);
            done = res.done;
            await new Promise(r => setTimeout(r, 1000));
        }
        await new Promise(r => setTimeout(r, 2000));
    }
}

function updateHeatmap(newScore) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    const cells = container.querySelectorAll('div');
    const colors = ["#18181b", "#7f1d1d", "#7c2d12", "#422006", "#14532d", "#10b981"];
    for (let i = 0; i < cells.length - 1; i++) cells[i].style.backgroundColor = cells[i+1].style.backgroundColor;
    const scoreIdx = Math.floor(newScore * 5);
    cells[cells.length - 1].style.backgroundColor = colors[scoreIdx + 1];
}

function updateSessionLog() {
    const list = document.getElementById('session-log');
    if (!list) return;
    list.innerHTML = sessionResults.map(res => `
        <div class="flex justify-between items-center text-[10px] border-b border-white/5 py-1 text-zinc-600 font-mono">
            <span>${res.task.split('_')[0].toUpperCase()}</span>
            <span class="text-indigo-500">${res.final_score.toFixed(2)}</span>
        </div>
    `).reverse().join('');
}

function downloadEvaluation() {
    const data = { model: "Current Agent", results: sessionResults, generated_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openenv_triage_eval.json`;
    a.click();
}

async function updateTicker() {
    const ticker = document.getElementById('scenario-ticker');
    if (!ticker) return;
    try {
        const res = await fetch('/static/support_tickets_1000.json');
        const data = await res.json();
        ticker.innerHTML = data.sort(() => 0.5 - Math.random()).slice(0, 15).map(t => `<span>[${t.id}] ${t.expected_category.toUpperCase()}_${t.expected_priority.toUpperCase()}</span>`).join('');
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    updateLeaderboard();
    initChart();
    updateTicker();
    setInterval(updateLeaderboard, 10000); // sync board every 10s
});
