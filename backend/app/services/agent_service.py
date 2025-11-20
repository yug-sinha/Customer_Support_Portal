from app.models.agent import Agent, AgentCreate
from app.core.sheets_db import sheets_db
from typing import List, Optional
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class AgentService:
    def __init__(self):
        logger.info("AgentService initialized with Google Sheets storage")

    def create_agent(self, agent_in: AgentCreate) -> Agent:
        logger.info(f"Creating new agent: {agent_in.name}")
        
        agent_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        agent_data = {
            'agent_id': agent_id,
            'name': agent_in.name,
            'persona': agent_in.persona,
            'system_instructions': agent_in.system_instructions,
            'tools': agent_in.tools,  # Will be stored as JSON string
            'escalation_threshold': agent_in.escalation_threshold,
            'created_at': now,
            'updated_at': now,
            'status': 'active'
        }
        
        sheets_db.insert_row('Agents', agent_data)
        
        agent = Agent(id=agent_id, **agent_in.model_dump())
        logger.info(f"Agent created with ID: {agent_id}")
        return agent

    def get_agents(self) -> List[Agent]:
        logger.debug("Fetching all agents")
        records = sheets_db.get_all_rows('Agents')
        
        agents = []
        for record in records:
            if record.get('status') == 'active':
                # Parse tools from JSON string if needed
                tools = record.get('tools', '[]')
                if isinstance(tools, str):
                    import json
                    try:
                        tools = json.loads(tools)
                    except:
                        tools = []
                
                agent = Agent(
                    id=record.get('agent_id'),
                    name=record.get('name'),
                    persona=record.get('persona'),
                    system_instructions=record.get('system_instructions'),
                    tools=tools,
                    escalation_threshold=float(record.get('escalation_threshold', 0.5))
                )
                agents.append(agent)
        
        return agents

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        logger.debug(f"Fetching agent with ID: {agent_id}")
        record = sheets_db.find_row('Agents', 'agent_id', agent_id)
        
        if not record or record.get('status') != 'active':
            logger.warning(f"Agent ID {agent_id} not found")
            return None
        
        # Parse tools from JSON string if needed
        tools = record.get('tools', '[]')
        if isinstance(tools, str):
            import json
            try:
                tools = json.loads(tools)
            except:
                tools = []
        
        agent = Agent(
            id=record.get('agent_id'),
            name=record.get('name'),
            persona=record.get('persona'),
            system_instructions=record.get('system_instructions'),
            tools=tools,
            escalation_threshold=float(record.get('escalation_threshold', 0.5))
        )
        return agent

    def update_agent(self, agent_id: str, agent_in: AgentCreate) -> Optional[Agent]:
        logger.info(f"Updating agent ID: {agent_id}")
        
        updates = {
            'name': agent_in.name,
            'persona': agent_in.persona,
            'system_instructions': agent_in.system_instructions,
            'tools': agent_in.tools,
            'escalation_threshold': agent_in.escalation_threshold,
            'updated_at': datetime.now().isoformat()
        }
        
        success = sheets_db.update_row('Agents', 'agent_id', agent_id, updates)
        
        if success:
            logger.info(f"Agent ID {agent_id} updated successfully")
            return Agent(id=agent_id, **agent_in.model_dump())
        else:
            logger.warning(f"Agent ID {agent_id} not found for update")
            return None

    def delete_agent(self, agent_id: str) -> bool:
        logger.info(f"Deleting agent ID: {agent_id}")
        try:
            # Remove the row from Google Sheets
            deleted = sheets_db.delete_row('Agents', 'agent_id', agent_id)
            if not deleted:
                logger.warning(f"Agent ID {agent_id} not found for delete")
            return deleted
        except Exception as e:
            logger.error(f"Error deleting agent {agent_id}: {str(e)}")
            return False

agent_service = AgentService()
