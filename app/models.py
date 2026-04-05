from pydantic import BaseModel
from typing import Optional, List

class Observation(BaseModel):
    ticket_id: int
    text: str
    category: Optional[str] = None
    priority: Optional[str] = None
    status: str
    previous_response: Optional[str] = None

class Action(BaseModel):
    category: str
    priority: str
    response: str

class Reward(BaseModel):
    score: float
    feedback: str
