import os
import json
import asyncio
import httpx
from typing import List, Optional
from openai import OpenAI

# Environment Configuration (Strict requirements)
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
API_KEY = os.getenv("HF_TOKEN", "") # Use HF_TOKEN as API key

# Local Env Config
LOCAL_ENV_URL = os.getenv("LOCAL_ENV_URL", "http://localhost:7860")
TASK_NAME = os.getenv("TASK_NAME", "hard_resolution")
MAX_STEPS = 5
SUCCESS_SCORE_THRESHOLD = 0.8

# Initialize OpenAI Client
client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

def log_start(task: str, env: str, model: str):
    print(f"[START] task={task} env={env} model={model}", flush=True)

def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str] = None):
    error_str = f'"{error}"' if error else "null"
    done_str = "true" if done else "false"
    print(f"[STEP]  step={step} action={json.dumps(action)} reward={reward:.2f} done={done_str} error={error_str}", flush=True)

def log_end(success: bool, steps: int, score: float, rewards: List[float]):
    success_str = "true" if success else "false"
    rewards_str = ",".join([f"{r:.2f}" for r in rewards])
    print(f"[END]   success={success_str} steps={steps} score={score:.2f} rewards={rewards_str}", flush=True)

def get_model_action(ticket_text: str) -> dict:
    prompt = f"""
Choose category (billing, refund, technical, general), priority (low, medium, high), and compose a helpful response.
Scenario: {ticket_text}
Respond with JSON only.
"""
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        text = (completion.choices[0].message.content or "").strip()
        # Basic JSON extraction
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        return json.loads(text)
    except Exception as exc:
        # Strict requirement: default to a baseline if it fails
        return {
            "category": "general",
            "priority": "medium",
            "response": "Understood. We are looking into your request."
        }

async def main():
    async with httpx.AsyncClient(timeout=30.0) as http:
        # Run across 3 mandatory tasks for full evaluation
        tasks = ["easy_classification", "medium_routing", "hard_resolution"]
        
        for task in tasks:
            history_rewards = []
            steps_taken = 0
            success = False
            
            log_start(task=task, env="support-triage", model=MODEL_NAME)
            
            try:
                # 1. Reset
                res = await http.post(f"{LOCAL_ENV_URL}/reset?task={task}")
                data = res.json()
                obs = data["observation"]
                done = False
                
                # 2. Step Loop
                for step in range(1, MAX_STEPS + 1):
                    if done: break
                    
                    steps_taken = step
                    action_dict = get_model_action(obs["text"])
                    
                    # Execute Step
                    step_res = await http.post(f"{LOCAL_ENV_URL}/step", json=action_dict)
                    step_data = step_res.json()
                    
                    obs = step_data["observation"]
                    reward = float(step_data["reward"])
                    done = step_data["done"]
                    
                    history_rewards.append(reward)
                    log_step(step=step, action=json.dumps(action_dict), reward=reward, done=done)
                    
                    if done: break
                
                # 3. Final Scoring
                final_score = max(history_rewards) if history_rewards else 0.0
                success = final_score >= SUCCESS_SCORE_THRESHOLD
                
            except Exception as e:
                log_step(step=1, action="ERROR", reward=0.0, done=True, error=str(e))
                history_rewards = [0.0]
                steps_taken = 1
                final_score = 0.0
            
            log_end(success=success, steps=steps_taken, score=final_score, rewards=history_rewards)

if __name__ == "__main__":
    asyncio.run(main())
