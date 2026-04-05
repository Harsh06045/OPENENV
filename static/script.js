/* 
   OpenEnv | Neural Heartbeat Logic V8 (Final Real-Time Hub)
*/

let chart = null;
let scoreHistory = [];
let sessionResults = [];
let isAutoRunning = false;

// 1. Leaderboard & Data Sync
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
            .sort((a,b) => b.score - a.score)
            .map((agent, i) => `
                <div class="flex justify-between items-center text-[10px] bg-white/[0.02] border border-white/5 p-3 rounded-lg animate-shimmer" style="animation-delay: ${i*0.1}s">
                    <div>
                        <div class="font-bold text-white">${agent.name}</div>
                        <div class="text-[8px] text-zinc-600 uppercase tracking-widest">${agent.type}</div>
                    </div>
                    <div class="font-mono text-indigo-500">${agent.score.toFixed(2)}</div>
                </div>
            `).join('');
    } catch (e) { console.error(e); }
}

// 2. Charts & Background
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

function setStatus(text) {
    const label = document.getElementById('env-status-text');
    if (label) label.innerText = text;
}

// 3. Heartbeat State Sync
async function syncGlobalState() {
    if (isAutoRunning) return; // Don't interrupt while evaluating
    try {
        const res = await fetch('/state');
        const data = await res.json();
        if (data && data.observation) {
            const buffer = document.getElementById('ticket-buffer');
            const badge = document.getElementById('ticket-id-badge');
            const currentIdStr = `ID://${data.observation.ticket_id}`;
            if (badge && badge.innerText !== currentIdStr) {
                if (buffer) buffer.value = data.observation.text || "";
                if (badge) badge.innerText = currentIdStr;
            }
        }
    } catch (e) {}
}

async function resetEnv() {
    const taskSelect = document.getElementById('task-select');
    const task = taskSelect ? taskSelect.value : "easy_classification";
    const con = document.getElementById('thought-console');
    setStatus(`REBOOT:// ${task.toUpperCase()}`);
    if (con) con.innerHTML += `<br>> RECONFIGURING PIPELINE [${task}]...`;
    
    try {
        const res = await fetch(`/reset?task=${task}`, { method: 'POST' });
        const data = await res.json();
        
        if (data && data.observation) {
            document.getElementById('ticket-buffer').value = data.observation.text || "";
            document.getElementById('ticket-id-badge').innerText = `ID://${data.observation.ticket_id || "--"}`;
            scoreHistory = [];
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update();
            }
            setStatus("READY");
            updateStatusDot(1, true); // Green start
        }
    } catch (e) { console.error(e); }
}

// 4. Intelligence Loop
async function autoSolve() {
    const ticketText = document.getElementById('ticket-buffer').value;
    const btn = document.getElementById('btn-auto');
    const con = document.getElementById('thought-console');
    
    if (btn) btn.disabled = true;
    if (con) con.innerHTML += `<br>> STREAMING NEURAL INFERENCE...`;
    
    try {
        const res = await fetch('/auto-solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_text: ticketText })
        });
        const action = await res.json();
        
        const charCount = ticketText.length;
        const latency = 40 + Math.round(charCount * 0.12);
        const cost = (charCount * 0.000030).toFixed(4);
        
        document.getElementById('metric-latency').innerText = `${latency}ms`;
        document.getElementById('metric-cost').innerText = `$${cost}`;
        
        document.getElementById('action-category').value = action.category || "general";
        document.getElementById('action-priority').value = action.priority || "medium";
        document.getElementById('action-response').value = action.response || "";
        
        if (con) {
            con.innerHTML += `<br>> LOGIC_STREAM: ${String(action.category).toUpperCase()} [${String(action.priority).toUpperCase()}]`;
            con.scrollTop = con.scrollHeight;
        }
    } catch (e) { console.error(e); }
    finally { if (btn) btn.disabled = false; }
}

async function submitAction() {
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
        const reward = result.reward || 0;
        
        scoreHistory.push(reward);
        const avg = scoreHistory.length ? (scoreHistory.reduce((a,b)=>a+b, 0) / scoreHistory.length) : 0;
        
        document.getElementById('metric-reward').innerText = reward.toFixed(2);
        document.getElementById('metric-total').innerText = avg.toFixed(2);
        document.getElementById('metric-steps').innerText = `Iter: ${scoreHistory.length}/5`;
        document.getElementById('metric-feedback').innerText = (result.info && result.info.feedback) ? result.info.feedback : "VERIFIED";

        if(chart) {
            chart.data.labels.push(`S${scoreHistory.length}`);
            chart.data.datasets[0].data.push(reward);
            chart.update();
        }
        updateHeatmap(reward);
        updateStatusDot(reward);

        if (result.done) {
            setStatus("SESSION_END");
            const taskEl = document.getElementById('task-select');
            sessionResults.push({ task: taskEl ? taskEl.value : "easy", final_score: avg });
            updateSessionLog();
        }
        return result;
    } catch (e) { return { done: true }; }
}

async function toggleAutoBenchmark() {
    const btn = document.getElementById('btn-auto-loop');
    if (isAutoRunning) { 
        isAutoRunning = false; 
        if (btn) {
            btn.classList.remove('active');
            btn.innerHTML = `<i data-lucide="play" class="w-3 h-3"></i> Start Auto-Pilot`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        return; 
    }
    
    isAutoRunning = true;
    if (btn) {
        btn.classList.add('active');
        btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i> Suspend Auto-Pilot`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    while (isAutoRunning) {
        await resetEnv();
        if (!isAutoRunning) break;
        let done = false;
        while (!done && isAutoRunning) {
            await autoSolve();
            const res = await submitAction();
            done = res ? res.done : true;
            await new Promise(r => setTimeout(r, 1500));
        }
        await new Promise(r => setTimeout(r, 2500));
    }
}

function updateHeatmap(newScore) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    const cells = container.querySelectorAll('div');
    const colors = ["#18181b", "#7f1d1d", "#7c2d12", "#422006", "#14532d", "#10b981"];
    for (let i = 0; i < cells.length - 1; i++) cells[i].style.backgroundColor = cells[i+1].style.backgroundColor;
    const scoreIdx = Math.max(0, Math.min(5, Math.floor(newScore * 5)));
    cells[cells.length - 1].style.backgroundColor = colors[scoreIdx];
}

function updateStatusDot(score, isDone = false) {
    const dot = document.querySelector('.status-dot');
    const indicator = document.querySelector('.status-indicator');
    if (!dot || !indicator) return;
    if (isDone) {
        dot.style.backgroundColor = '#10b981';
        dot.style.boxShadow = '0 0 15px #10b981';
        return;
    }
    if (score >= 0.8) {
        dot.style.backgroundColor = '#10b981'; dot.style.boxShadow = '0 0 15px #10b981';
    } else if (score >= 0.5) {
        dot.style.backgroundColor = '#f59e0b'; dot.style.boxShadow = '0 0 15px #f59e0b';
    } else {
        dot.style.backgroundColor = '#ef4444'; dot.style.boxShadow = '0 0 15px #ef4444';
    }
}

function updateSessionLog() {
    const list = document.getElementById('session-log');
    if (!list) return;
    list.innerHTML = sessionResults.map(res => `
        <div class="flex justify-between items-center text-[10px] border-b border-white/5 py-2 text-zinc-600 font-mono">
            <span>${res.task.split('_')[0].toUpperCase()}</span>
            <span class="text-indigo-500">${res.final_score.toFixed(2)}</span>
        </div>
    `).reverse().join('');
}

function downloadEvaluation() {
    const data = { model: "Chorus OpenEnv Agent", results: sessionResults, generated_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openenv_results_${Date.now()}.json`;
    a.click();
}

async function updateTicker() {
    const ticker = document.getElementById('scenario-ticker');
    if (!ticker) return;
    try {
        const res = await fetch('/static/support_tickets_1000.json');
        const data = await res.json();
        ticker.innerHTML = data.sort(() => 0.5 - Math.random()).slice(0, 15).map(t => `<span>[TKT-${t.ticket_id}] ${t.category ? t.category.toUpperCase() : 'QUEUED'}</span>`).join('');
    } catch(e) {}
}

function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let offset = 0;
    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    function draw() {
        if (!canvas) return;
        ctx.clearRect(0,0,canvas.width, canvas.height);
        ctx.lineWidth = 1;
        const colors = ["rgba(99, 102, 241, 0.08)", "rgba(168, 85, 247, 0.06)", "rgba(255, 255, 255, 0.03)"];
        for (let j = 0; j < 3; j++) {
            ctx.beginPath(); ctx.strokeStyle = colors[j];
            const amp = 40 + (j * 20); const freq = 0.002 + (j * 0.001); const speed = 0.5 + (j * 0.2);
            for (let i = 0; i < canvas.width; i += 5) {
                const y = (canvas.height / 2) + Math.sin((i * freq) + (offset * speed)) * amp + (j * 80 - 80);
                if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
            }
            ctx.stroke();
        }
        offset += 0.02;
        requestAnimationFrame(draw);
    }
    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    initChart();
    updateTicker();
    initBackground();
    setInterval(syncGlobalState, 2000); 
    setInterval(updateLeaderboard, 10000); 
    setTimeout(resetEnv, 500);
});
