# OpenEnv Support Triage Benchmark 🏆

A high-fidelity, real-time customer support triage evaluation environment built for the **OpenEnv Round 1 Hackathon**. This platform benchmarks AI agents on classification accuracy, routing strategy, and response professionalism across 1,000 unique synthetic scenarios.

## 🚀 Quick Start (Local)

1. **Clone & Install**:
   ```bash
   git clone https://github.com/Harsh06045/OPENENV.git
   cd OPENENV
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   Create a `.env` file or export your keys:
   ```bash
   # Optional: Redirect to a custom LLM router
   API_BASE_URL="https://your-llm-router.com/v1"
   MODEL_NAME="your-model-id"
   HF_TOKEN="your_hf_token"
   ```

3. **Launch Server**:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 7860
   ```
   Open `http://localhost:7860` in your browser.

## 🥇 Hackathon Features

- **Zen Prism UI**: A performance-first, glassmorphic dashboard optimized for any device (Mobile/Desktop).
- **1,000 Scenario Dataset**: Automatically generates a tiered benchmark pool on startup.
- **Grader Engine**: Hybrid 70/30 deterministic/LLM grading methodology.
- **Auto-Benchmark Engine**: Continuous recursive evaluation loop with live rewards charting.
- **Session Export**: One-click JSON export for verifiable submission results.

## 🛠️ Project Structure

- `app/`: Core FastAPI logic, environment simulation, and grading engine.
- `static/`: High-fidelity frontend (Vanilla JS/CSS/HTML).
- `inference.py`: Mandated Round 1 submission logging script.
- `openenv.yaml`: OpenEnv manifest for spec compliance.

---
Built with pride by **Chorus** for the 2026 OpenEnv Finals. ⚖️📡🥇
