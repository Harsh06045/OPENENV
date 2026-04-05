import random
from .models import Observation, Action, Reward
from .tasks import TASKS
from .grader import grade_action

class SupportEnv:
    def __init__(self):
        self.current_task_name = None
        self.state = None
        self.step_count = 0
        self.max_steps = 5

    def reset(self, task_name="easy_classification"):
        if task_name not in TASKS:
             task_name = "easy_classification"
        
        self.current_task_name = task_name
        task_gen = TASKS[task_name]()
        self.state = task_gen.generate_ticket()
        self.step_count = 0

        return Observation(**self.state)

    def step(self, action: Action):
        self.step_count += 1

        reward_score, feedback = grade_action(self.state, action)

        # Done if max steps reached or if the agent achieved high enough reward
        done = self.step_count >= self.max_steps or reward_score >= 0.9

        reward = Reward(score=reward_score, feedback=feedback)

        # In a real support env, the ticket might status change to resolved
        if reward_score >= 0.8:
          self.state["status"] = "resolved"

        return {
            "observation": Observation(**self.state),
            "reward": reward.score,
            "done": done,
            "info": {"feedback": feedback}
        }

    def state_fn(self):
        return self.state
