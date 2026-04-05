import os
from openai import OpenAI
from .models import Action

# API Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
HF_TOKEN = os.getenv("HF_TOKEN", "") # Primary key for evaluation
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")

client = OpenAI(
    base_url=API_BASE_URL,
    api_key=HF_TOKEN
)

def deterministic_grade(state, action: Action):
    score = 0.0
    
    expected_cat = state.get("expected_category", "general")
    expected_prio = state.get("expected_priority", "medium")
    
    # 1. Category Matching (40% Weight)
    if action.category.lower() == expected_cat.lower():
        score += 0.4
    elif action.category.lower() in ["general", "billing"] and expected_cat.lower() in ["general", "billing"]:
        score += 0.2 # Partial match
        
    # 2. Priority Matching (30% Weight)
    if action.priority.lower() == expected_prio.lower():
        score += 0.3
    elif (action.priority.lower() in ["high", "medium"]) and (expected_prio.lower() in ["high", "medium"]):
        score += 0.15 # Close match (medium/high distinction can be fuzzy)
        
    # 3. Basic Response Quality (10% Weight)
    # Simple Length/Greeting check for 0.1
    resp = action.response.lower()
    if len(resp) > 30 and ("hello" in resp or "hi" in resp or "regards" in resp or "sincerely" in resp):
        score += 0.1
        
    return min(score, 0.8) # Cap deterministic at 0.8 to leave room for LLM refinement

def llm_grade(state, action: Action):
    if not HF_TOKEN:
      return 0.1 # Minimal score if no LLM key
      
    prompt = f"""
Evaluate the quality of this support response.
Ticket: "{state['text']}"
Agent Response: "{action.response}"
Scale: 0.0 (unhelpful) to 0.2 (professional, accurate, empathic).
Return ONLY the score (e.g. 0.18).
"""
    try:
        res = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=5
        )
        score_str = res.choices[0].message.content.strip()
        score = float(score_str)
        return min(max(score, 0.0), 0.2)
    except Exception as e:
        # Fallback to rule-based nuance check
        return 0.1 if len(action.response) > 50 else 0.0

def grade_action(state, action: Action):
    # This methodology is the benchmark for "Deterministic + Subjective" hybrid grading
    det_score = deterministic_grade(state, action)
    nuance_score = llm_grade(state, action)
    
    final_score = round(det_score + nuance_score, 2)
    
    # Message for frontend feedback
    if final_score >= 0.85: feedback = "Elite resolution. Perfect triage."
    elif final_score >= 0.7: feedback = "Strong performance. Minor nuance missing."
    elif final_score >= 0.4: feedback = "Passable triage, but lacking accuracy/professionalism."
    else: feedback = "Incorrect triage. Requires re-training."
    
    return final_score, feedback
