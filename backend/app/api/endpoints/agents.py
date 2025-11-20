from fastapi import APIRouter, HTTPException
from typing import List
from app.models.agent import Agent, AgentCreate
from app.services.agent_service import agent_service
import logging
from fastapi import status

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=Agent)
def create_agent(agent: AgentCreate):
    logger.info(f"Received request to create agent: {agent.name}")
    try:
        created_agent = agent_service.create_agent(agent)
        logger.info(f"Successfully created agent with ID: {created_agent.id}")
        return created_agent
    except Exception as e:
        logger.error(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Agent])
def get_agents():
    logger.info("Received request to list all agents")
    agents = agent_service.get_agents()
    logger.info(f"Returning {len(agents)} agents")
    return agents

@router.get("/{agent_id}", response_model=Agent)
def get_agent(agent_id: str):
    logger.info(f"Received request to get agent ID: {agent_id}")
    agent = agent_service.get_agent(agent_id)
    if not agent:
        logger.warning(f"Agent ID {agent_id} not found")
        raise HTTPException(status_code=404, detail="Agent not found")
    logger.info(f"Successfully retrieved agent ID: {agent_id}")
    return agent

@router.put("/{agent_id}", response_model=Agent)
def update_agent(agent_id: str, agent: AgentCreate):
    logger.info(f"Received request to update agent ID: {agent_id}")
    updated_agent = agent_service.update_agent(agent_id, agent)
    if not updated_agent:
        logger.warning(f"Agent ID {agent_id} not found for update")
        raise HTTPException(status_code=404, detail="Agent not found")
    logger.info(f"Successfully updated agent ID: {agent_id}")
    return updated_agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(agent_id: str):
    logger.info(f"Received request to delete agent ID: {agent_id}")
    deleted = agent_service.delete_agent(agent_id)
    if not deleted:
        logger.warning(f"Agent ID {agent_id} not found for delete")
        raise HTTPException(status_code=404, detail="Agent not found")
    logger.info(f"Successfully deleted agent ID: {agent_id}")
    return None
