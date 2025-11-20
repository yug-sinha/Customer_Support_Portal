from fastapi import APIRouter, HTTPException
from app.core.sheets_db import sheets_db
from typing import List, Dict, Any
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/agent/{agent_id}")
def get_agent_conversations(agent_id: str):
    """Get all conversations for a specific agent"""
    logger.info(f"Fetching conversations for agent: {agent_id}")
    
    try:
        all_conversations = sheets_db.get_all_rows('Conversations')
        
        # Filter by agent_id
        agent_conversations = [
            conv for conv in all_conversations 
            if conv.get('agent_id') == agent_id
        ]
        
        # Sort by started_at (most recent first)
        agent_conversations.sort(key=lambda x: x.get('started_at', ''), reverse=True)
        
        logger.info(f"Found {len(agent_conversations)} conversations for agent {agent_id}")
        return agent_conversations
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{conversation_id}/messages")
def get_conversation_messages(conversation_id: str):
    """Get all messages in a conversation"""
    logger.info(f"Fetching messages for conversation: {conversation_id}")
    
    try:
        all_messages = sheets_db.get_all_rows('Messages')
        
        # Filter by conversation_id
        conversation_messages = [
            msg for msg in all_messages 
            if msg.get('conversation_id') == conversation_id
        ]
        
        # Sort by timestamp
        conversation_messages.sort(key=lambda x: x.get('timestamp', ''))
        
        logger.info(f"Found {len(conversation_messages)} messages")
        return conversation_messages
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{conversation_id}/resolve")
def resolve_conversation(conversation_id: str):
    """Mark a conversation as resolved"""
    logger.info(f"Resolving conversation: {conversation_id}")
    
    try:
        from datetime import datetime
        
        success = sheets_db.update_row('Conversations', 'conversation_id', conversation_id, {
            'status': 'resolved',
            'ended_at': datetime.now().isoformat()
        })
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        logger.info(f"Conversation {conversation_id} marked as resolved")
        return {"message": "Conversation resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def get_all_conversations():
    """Get all conversations across all agents with agent names"""
    logger.info("Fetching all conversations")
    
    try:
        conversations = sheets_db.get_all_rows('Conversations')
        agents = sheets_db.get_all_rows('Agents')
        
        # Create a map of agent_id to agent_name (Google Sheet uses column 'agent_id')
        agent_map = {}
        for agent in agents:
            agent_id = agent.get('agent_id')
            agent_name = agent.get('name')

            if not agent_id:
                logger.warning(f"Skipping agent row without agent_id: {agent}")
                continue

            agent_map[str(agent_id)] = agent_name or 'Unknown Agent'
        
        # Add agent_name to each conversation
        for conv in conversations:
            agent_id = conv.get('agent_id')
            conv_id = conv.get('conversation_id')

            if not conv_id:
                logger.warning(f"Conversation row missing conversation_id: {conv}")

            if not agent_id:
                logger.warning(f"Conversation {conv_id} missing agent_id; marking as Unknown Agent")

            conv['agent_name'] = agent_map.get(str(agent_id), 'Unknown Agent')
        
        # Sort by started_at (most recent first)
        conversations.sort(key=lambda x: x.get('started_at', ''), reverse=True)
        
        logger.info(f"Found {len(conversations)} total conversations; agent map size {len(agent_map)}")
        return conversations
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
