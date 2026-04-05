/* 
   OpenEnv | Production-Grade Logic V7 (Deterministic Efficiency)
*/

let chart = null;
let scoreHistory = [];
let sessionResults = [];
let isAutoRunning = false;

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
                <div class="flex justify-between items-center text-[10px] bg-white/[0.02] border border-white/5 p-3 rounded-lg animate-slide-up" style="animation-delay: ${i*0.1}s">
                    <div>
                        <div class="font-bold text-white">${agent.name}</div>
                        <div class="text-[8px] text-zinc-600 uppercase tracking-widest">${agent.type}</div>
                    </div>
                    <div class="font-mono text-indigo-500">${agent.score.toFixed(2)}</div>
                </div>
            `).join('');
    } catch (e) { console.error("Leaderboard error:", e); }
}

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

async function resetEnv() {
    const taskSelect = document.getElementById('task-select');
    const task = taskSelect ? taskSelect.value : "easy_classification";
    const con = document.getElementById('thought-console');
    setStatus(`REBOOT:// ${task.toUpperCase()}`);
    if (con) con.innerHTML += `<br>> REBOOTING TASK GRID [${task}]...`;
    
    try {
        const res = await fetch(`/reset?task=${task}`, { method: 'POST' });
        const data = await res.json();
        
        if (data && data.observation) {
            const buffer = document.getElementById('ticket-buffer');
            const badge = document.getElementById('ticket-id-badge');
            if (buffer) buffer.value = data.observation.text || "";
            if (badge) badge.innerText = `ID://${data.observation.ticket_id || "--"}`;
            
            scoreHistory = [];
            document.getElementById('metric-reward').innerText = "--";
            document.getElementById('metric-total').innerText = "--";
            document.getElementById('metric-steps').innerText = "Iter: 0/5";
            
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update();
            }
            setStatus("READY");
        }
    } catch (e) { console.error("Reset error:", e); }
}

async function autoSolve() {
    const buffer = document.getElementById('ticket-buffer');
    const ticketText = buffer ? buffer.value : "";
    const btn = document.getElementById('btn-auto');
    const con = document.getElementById('thought-console');
    
    if (btn) btn.disabled = true;
    if (con) con.innerHTML += `<br>> ANALYZING TICKET INTENT...`;
    
    try {
        const res = await fetch('/auto-solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_text: ticketText })
        });
        const action = await res.json();
        
        // 🔮 Deterministic Metrics: Based purely on character volume
        const charCount = ticketText.length;
        const latency = 40 + Math.round(charCount * 0.15);
        const cost = (charCount * 0.000035).toFixed(4);
        
        document.getElementById('metric-latency').innerText = `${latency}ms`;
        document.getElementById('metric-cost').innerText = `$${cost}`;
        
        document.getElementById('action-category').value = action.category || "general";
        document.getElementById('action-priority').value = action.priority || "medium";
        document.getElementById('action-response').value = action.response || "";
        
        if (con) {
            con.innerHTML += `<br>> RULE_PROC: ${String(action.category).toUpperCase()} [${String(action.priority).toUpperCase()}]<br>> SYNC_READY.`;
            con.scrollTop = con.scrollHeight;
        }
    } catch (e) { 
        console.error("AutoSolve error:", e); 
    } finally { 
        if (btn) btn.disabled = false; 
    }
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

        if (result.done) {
            setStatus("COMPLETED");
            const taskEl = document.getElementById('task-select');
            sessionResults.push({ task: taskEl ? taskEl.value : "easy", final_score: avg });
            updateSessionLog();
        }
        return result;
    } catch (e) { 
        console.error("Submit error:", e);
        return { done: true }; 
    }
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
            const res = await submitAction();
            done = res ? res.done : true;
            await new Promise(r => setTimeout(r, 1200));
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
    const scoreIdx = Math.max(0, Math.min(5, Math.floor(newScore * 5)));
    cells[cells.length - 1].style.backgroundColor = colors[scoreIdx];
}

function updateSessionLog() {
    const list = document.getElementById('session-log');
    if (!list) return;
    list.innerHTML = sessionResults.map(res => `
        <div class="flex justify-between items-center text-[10px] border-b border-white/5 py-2 text-zinc-600 font-mono">
            <span>${String(res.task).split('_')[0].toUpperCase()}</span>
            <span class="text-indigo-500">${Number(res.final_score).toFixed(2)}</span>
        </div>
    `).reverse().join('');
}

function downloadEvaluation() {
    const data = { model: "Chorus OpenEnv Agent", results: sessionResults, generated_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openenv_eval_${Date.now()}.json`;
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
    let pts = [];
    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    for(let i=0; i<30; i++) pts.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: Math.random()-0.5, vy: Math.random()-0.5 });
    function draw() {
        if (!canvas) return;
        ctx.clearRect(0,0,canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
        ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
        pts.forEach(p => {
            p.x += p.vx * 0.2; p.y += p.vy * 0.2;
            if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, Math.PI*2); ctx.fill();
            pts.forEach(p2 => {
                let d = Math.hypot(p.x-p2.x, p.y-p2.y);
                if(d < 150) {
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                }
            });
        });
        requestAnimationFrame(draw);
    }
    draw();
}

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    updateTicker();
    initBackground();
    setTimeout(resetEnv, 500);
});
