import random

class TicketGenerator:
    """Generates synthetic tickets for the environment on the fly."""
    
    TICKET_TEMPLATES = [
        {
            "category": "billing",
            "priority": "high",
            "text": "My payment of ${amount} for the {plan} plan failed but the money was deducted from my bank. Please resolve immediately."
        },
        {
            "category": "technical",
            "priority": "high",
            "text": "The app crashed while I was {action}. I'm using an {device} and I've already tried clearing the cache."
        },
        {
            "category": "refund",
            "priority": "medium",
            "text": "I was charged twice for the {plan} plan. I would like a refund for the duplicate transaction."
        },
        {
            "category": "general",
            "priority": "low",
            "text": "How do I change my profile picture in the {plan} dashboard?"
        },
        {
            "category": "technical",
            "priority": "medium",
            "text": "I am unable to login with my {auth_method} account since the last update. Is there a maintenance going on?"
        }
    ]
    
    AMOUNTS = ["10.99", "25.00", "99.99", "1.50"]
    PLANS = ["Premium", "Basic", "Enterprise", "Pro"]
    DEVICES = ["iPhone 15", "Samsung S23", "MacBook Pro", "Windows Desktop"]
    ACTIONS = ["uploading an image", "trying to checkout", "navigating to settings", "logging in"]
    AUTH_METHODS = ["Google", "Facebook", "Email & Password", "GitHub"]

    def generate_random_ticket(self, difficulty="easy"):
        template = random.choice(self.TICKET_TEMPLATES)
        
        # Adjusting difficulty
        if difficulty == "hard":
            # Multi-intent: Combine two templates
            t1 = random.choice(self.TICKET_TEMPLATES)
            t2 = random.choice([t for t in self.TICKET_TEMPLATES if t["category"] != t1["category"]])
            text = f"{t1['text']} Also, {t2['text']}"
            category = "multiple"
            priority = "high"
        else:
            text = template["text"]
            category = template["category"]
            priority = template["priority"]

        # Template Filling
        text = text.format(
            amount=random.choice(self.AMOUNTS),
            plan=random.choice(self.PLANS),
            device=random.choice(self.DEVICES),
            action=random.choice(self.ACTIONS),
            auth_method=random.choice(self.AUTH_METHODS)
        )
        
        return {
            "ticket_id": random.randint(1000, 99999),
            "text": text,
            "status": "open",
            "previous_response": None,
            "ground_truth_category": category,
            "ground_truth_priority": priority
        }

class SupportTaskEngine:
    def __init__(self):
        self.generator = TicketGenerator()
        
    def generate_ticket(self, task_name="easy_classification"):
        difficulty = "hard" if "hard" in task_name else "medium" if "medium" in task_name else "easy"
        return self.generator.generate_random_ticket(difficulty)

# Legacy Mapping for Compatibility
class EasyTask:
    def generate_ticket(self): return SupportTaskEngine().generate_ticket("easy")
class MediumTask:
    def generate_ticket(self): return SupportTaskEngine().generate_ticket("medium")
class HardTask:
    def generate_ticket(self): return SupportTaskEngine().generate_ticket("hard")

TASKS = {
    "easy_classification": EasyTask,
    "medium_routing": MediumTask,
    "hard_resolution": HardTask
}
