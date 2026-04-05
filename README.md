# Customer Support Ticket Triage Environment 📩

A production-ready OpenEnv environment for training and evaluating agents on real-world customer support workflows.

## 🚀 Overview
The **Support Triage Env** simulates the core responsibilities of a customer support agent: reading incoming tickets, identifying the department (category), setting urgency (priority), and composing professional responses. It provides a multi-level difficulty progression from simple single-intent tickets to complex, multi-issue resolutions.

### Key Features
- **OpenEnv Spec Compliant**: Implements `step`, `reset`, `state`, and typed Pydantic models.
- **Hybrid Grading System**: Combines rule-based heuristics with LLM-powered evaluation for nuanced scoring.
- **Real-World Utility**: Models tasks actually performed by support teams (e.g., Zendesk, Freshdesk).
- **Interactive Dashboard**: A premium, glassmorphic UI to visualize agent trajectories and rewards in real-time.

---

## 🛠️ Environment Specification

### Observation Space
The agent receives an `Observation` object containing:
- `ticket_id`: Unique identifier for the ticket.
- `text`: The raw customer message.
- `status`: Current status (`open`, `resolved`).
- `previous_response`: Any previous context in the conversation thread.

### Action Space
The agent must provide an `Action` object:
- `category`: `billing`, `refund`, `technical`, or `general`.
- `priority`: `low`, `medium`, or `high`.
- `response`: A string containing the support message.

### Reward Function
The reward (0.0 - 1.0) is calculated based on:
1. **Accuracy of Classification**: Correct category and priority mapping (Rule-based).
2. **Quality of Response**: Professionalism, helpfulness, and length (LLM-based).
3. **Multi-intent bonus**: Extra points for correctly addressing multiple issues in complex tickets.

---

## 🎯 Tasks & Difficulty

1. **Easy: Classification**
   - *Description*: Simple tickets with a single clear intent (e.g., "My payment failed").
   - *Objective*: Identify category as `billing` and priority as `high`.

2. **Medium: Priority Routing**
   - *Description*: Technical issues involving app crashes and performance.
   - *Objective*: Route to `technical` and prioritize based on impact.

3. **Hard: Complex Resolution**
   - *Description*: Multi-faceted tickets (e.g., "Refund failed and my account is locked").
   - *Objective*: Address both intent points professionally.

---

## 💻 Setup & Usage

### Local Development
1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Run Server**:
   ```bash
   uvicorn app.main:app --port 7860
   ```
3. **Run Inference Baseline**:
   ```bash
   python inference.py
   ```

### Docker
```bash
docker build -t support-env .
docker run -p 7860:7860 support-env
```

---

## 🧪 Validation
Run the test suite to ensure spec compliance:
```bash
pytest tests/test_env.py
```

## 🏆 Hackathon Checklist
- [x] **Real-world utility**: Customer support automation.
- [x] **3 Tasks**: Easy, Medium, Hard.
- [x] **OpenEnv compliant**: Full spec implementation.
- [x] **HF Space ready**: Dockerfile + FastAPI entrypoint.
- [x] **Baseline Inference**: `inference.py` follows strict format.
- [x] **Premium Dashboard**: Live UI for visualization.

---
*Created for the OpenEnv Hackathon 2026.*
