import pytest
from app.env import SupportEnv
from app.models import Action

def test_reset():
    env = SupportEnv()
    obs = env.reset("easy_classification")
    assert obs.ticket_id == 1
    assert "payment failed" in obs.text.lower()
    assert obs.status == "open"

def test_step_logic():
    env = SupportEnv()
    env.reset("easy_classification")
    
    # Correct action
    action = Action(
        category="billing",
        priority="high",
        response="We are looking into your billing issue immediately. Please expect a refund shortly."
    )
    
    result = env.step(action)
    
    assert "observation" in result
    assert "reward" in result
    assert result["reward"] > 0.5
    assert result["info"]["feedback"] in ["Excellent", "Good"]

def test_done_condition():
    env = SupportEnv()
    env.reset("medium_routing")
    
    # Force max steps
    for i in range(5):
      action = Action(category="other", priority="low", response="N/A")
      result = env.step(action)
      
    assert result["done"] is True

def test_task_variety():
    env = SupportEnv()
    
    obs_easy = env.reset("easy_classification")
    obs_med = env.reset("medium_routing")
    obs_hard = env.reset("hard_resolution")
    
    assert obs_easy.ticket_id != obs_med.ticket_id
    assert obs_med.ticket_id != obs_hard.ticket_id
    assert "refund" in obs_hard.text.lower()
