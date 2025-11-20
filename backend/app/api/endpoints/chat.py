from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, ChatResponse
from app.services.chat_service import chat_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    logger.info(f"Received chat request for Agent ID: {request.agent_id}")
    logger.debug(f"Query: {request.query}")
    try:
        response = await chat_service.process_chat(request)
        logger.info(f"Chat processed successfully. Intent: {response.intent}, Escalated: {response.escalated}")
        return response
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
