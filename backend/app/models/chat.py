from pydantic import BaseModel
from typing import Optional, Dict, Any

class ChatRequest(BaseModel):
    agent_id: str  # Changed from int to str for UUID support
    query: str
    conversation_id: Optional[str] = None  # Optional: continue existing conversation

class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence_score: float
    escalated: bool = False
    conversation_id: str  # Return the conversation ID
    tool_calls: Optional[Dict[str, Any]] = None
