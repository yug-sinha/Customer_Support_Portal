from pydantic import BaseModel
from typing import List, Optional

class AgentBase(BaseModel):
    name: str
    persona: str
    system_instructions: str
    tools: List[str] = []
    escalation_threshold: float = 0.5 # Confidence score threshold
    max_attempts: int = 3

class AgentCreate(AgentBase):
    pass

class Agent(AgentBase):
    id: str

    class Config:
        from_attributes = True
