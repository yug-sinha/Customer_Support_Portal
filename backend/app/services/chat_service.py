from app.models.chat import ChatRequest, ChatResponse
from app.services.agent_service import agent_service
from app.core.llm import llm_service
from app.core.sheets_db import sheets_db
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        logger.info("ChatService initialized with Google Sheets storage")

    def _get_or_create_conversation(self, agent_id: str, conversation_id: str = None) -> str:
        """Get existing conversation or create a new one"""
        if conversation_id:
            # Verify conversation exists
            existing = sheets_db.find_row('Conversations', 'conversation_id', conversation_id)
            if existing:
                logger.info(f"Using existing conversation: {conversation_id}")
                return conversation_id
        
        # Create new conversation
        new_conversation_id = str(uuid.uuid4())
        sheets_db.insert_row('Conversations', {
            'conversation_id': new_conversation_id,
            'agent_id': agent_id,
            'user_id': '',  # Could be added later
            'started_at': datetime.now().isoformat(),
            'ended_at': '',
            'status': 'active',
            'total_messages': 0
        })
        logger.info(f"Created new conversation: {new_conversation_id}")
        return new_conversation_id

    def _get_conversation_history(self, conversation_id: str) -> list:
        """Retrieve conversation history for context"""
        all_messages = sheets_db.get_all_rows('Messages')
        
        # Filter messages for this conversation
        conversation_messages = [
            msg for msg in all_messages 
            if msg.get('conversation_id') == conversation_id
        ]
        
        # Sort by timestamp
        conversation_messages.sort(key=lambda x: x.get('timestamp', ''))
        
        return conversation_messages

    def _build_context_prompt(self, conversation_history: list, current_query: str, agent) -> str:
        """Build a prompt with conversation history"""
        if not conversation_history:
            return f"System: {agent.system_instructions}\n\nUser: {current_query}\n\nAssistant:"
        
        # Build conversation context
        context = f"System: {agent.system_instructions}\n\nConversation History:\n"
        
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role == 'user':
                context += f"User: {content}\n"
            elif role == 'assistant':
                context += f"Assistant: {content}\n"
        
        context += f"\nUser: {current_query}\n\nAssistant:"
        return context

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        logger.info(f"Processing chat for Agent ID: {request.agent_id}")
        
        agent = agent_service.get_agent(request.agent_id)
        if not agent:
            logger.error(f"Agent ID {request.agent_id} not found")
            return ChatResponse(
                response="Agent not found", 
                intent="Error", 
                confidence_score=0.0,
                conversation_id=""
            )

        # Get or create conversation
        conversation_id = self._get_or_create_conversation(
            request.agent_id, 
            request.conversation_id
        )

        # Get conversation history
        conversation_history = self._get_conversation_history(conversation_id)

        # 1. Classify Intent
        logger.info("Classifying intent...")
        intent = await llm_service.classify_intent(request.query)
        logger.info(f"Intent classified as: {intent}")
        
        # 2. Handle Intent
        response_text = ""
        escalated = False
        confidence = 0.9 # Mock confidence for now

        # Helper to gate tool access
        def tool_available(tool_name: str) -> bool:
            try:
                return tool_name in getattr(agent, "tools", []) if agent else False
            except Exception:
                return False

        # Dummy tool responses
        tool_responses = {
            "check_order_status": "I checked your order status. It is currently 'Shipped' (demo).",
            "initiate_refund": "I initiated a refund for your order (demo).",
            "send_email": "I sent an email notification with the latest update (demo).",
            "create_support_ticket": "I created a support ticket for escalation to a human (demo).",
            "apply_discount": "I applied the discount code to your account (demo).",
            "get_customer_profile": "I fetched your profile details (demo).",
            "update_order_address": "I updated the delivery address on your order (demo).",
            "notify_vendor": "I notified the vendor with your message (demo).",
        }

        tool_keywords = {
            "check_order_status": ["check order", "order status", "where is my order", "track order"],
            "initiate_refund": ["refund", "money back", "return"],
            "send_email": ["email", "send mail", "notify by email"],
            "create_support_ticket": ["ticket", "support ticket", "escalate", "escalation"],
            "apply_discount": ["discount", "promo", "coupon"],
            "get_customer_profile": ["profile", "account info", "customer details"],
            "update_order_address": ["change address", "update address", "delivery address"],
            "notify_vendor": ["vendor", "restaurant", "partner alert", "notify partner"],
        }

        if intent == "Escalation":
            logger.info("Intent is Escalation. Triggering escalation.")
            escalated = True
            response_text = "I am escalating this to a human agent. Please wait."
        elif intent == "Transactional":
            logger.info("Intent is Transactional. Checking for tools.")
            lower_query = request.query.lower()
            matched_tool = None
            for tool_name, keywords in tool_keywords.items():
                if any(k in lower_query for k in keywords):
                    matched_tool = tool_name
                    break

            if matched_tool and tool_available(matched_tool):
                logger.info(f"Executing tool: {matched_tool}")
                response_text = tool_responses.get(matched_tool, "Action completed (demo).")
            else:
                logger.info("No available tool matched. Offering escalation.")
                response_text = "I don't have access to perform that action. Would you like me to escalate this to a human?"
        else: # Informational
            logger.info("Intent is Informational. Generating LLM response with context.")
            # Build response using conversation history
            response_text = await llm_service.generate_response_with_history(agent, conversation_history, request.query)

        # 3. Check Escalation Thresholds
        logger.info(f"Checking confidence score ({confidence}) against threshold ({agent.escalation_threshold})")
        if confidence < agent.escalation_threshold:
            logger.warning("Confidence too low. Escalating to human.")
            escalated = True
            response_text = "I am not confident in my answer. Escalating to human."

        # 4. Store messages in Google Sheets
        timestamp = datetime.now().isoformat()
        
        # Store user message
        sheets_db.insert_row('Messages', {
            'message_id': str(uuid.uuid4()),
            'conversation_id': conversation_id,
            'agent_id': request.agent_id,
            'role': 'user',
            'content': request.query,
            'intent': intent,
            'confidence_score': confidence,
            'timestamp': timestamp,
            'escalated': 'FALSE'
        })
        
        # Store assistant message
        message_id = str(uuid.uuid4())
        sheets_db.insert_row('Messages', {
            'message_id': message_id,
            'conversation_id': conversation_id,
            'agent_id': request.agent_id,
            'role': 'assistant',
            'content': response_text,
            'intent': intent,
            'confidence_score': confidence,
            'timestamp': timestamp,
            'escalated': str(escalated).upper()
        })

        # Update conversation message count (keep status as active unless escalated)
        message_count = len(conversation_history) + 2  # +2 for current exchange
        updates = {'total_messages': message_count}
        
        # If escalated, mark conversation as escalated with ended_at timestamp
        if escalated:
            updates['status'] = 'escalated'
            updates['ended_at'] = timestamp
        
        sheets_db.update_row('Conversations', 'conversation_id', conversation_id, updates)

        # 5. Track escalations
        if escalated:
            reason = "User Request" if intent == "Escalation" else "Low Confidence"
            escalation_id = str(uuid.uuid4())
            
            sheets_db.insert_row('Escalations', {
                'escalation_id': escalation_id,
                'conversation_id': conversation_id,
                'message_id': message_id,
                'agent_id': request.agent_id,
                'query': request.query,
                'reason': reason,
                'status': 'pending',
                'created_at': timestamp,
                'resolved_at': '',
                'resolved_by': '',
                'resolution_notes': ''
            })
            logger.info(f"Added escalation #{escalation_id}")

        return ChatResponse(
            response=response_text,
            intent=intent,
            confidence_score=confidence,
            escalated=escalated,
            conversation_id=conversation_id
        )

    def get_escalations(self):
        logger.info("Fetching escalation queue")
        records = sheets_db.get_all_rows('Escalations')
        
        escalations = []
        for record in records:
            escalations.append({
                "id": record.get('escalation_id'),
                "conversation_id": record.get('conversation_id'),
                "message_id": record.get('message_id'),
                "query": record.get('query'),
                "reason": record.get('reason'),
                "status": record.get('status', 'pending').capitalize(),
                "created_at": record.get('created_at') or record.get('timestamp') or record.get('date')
            })
        
        return escalations

    def get_metrics(self):
        logger.info("Fetching metrics")
        
        # Get all messages
        messages = sheets_db.get_all_rows('Messages')
        
        # Calculate metrics
        total_queries = len([m for m in messages if m.get('role') == 'user'])
        escalated_queries = len([m for m in messages if m.get('escalated') == 'TRUE'])
        resolved_queries = total_queries - escalated_queries
        resolution_rate = (resolved_queries / total_queries * 100) if total_queries > 0 else 0.0
        
        return {
            "total_queries": total_queries,
            "escalated_queries": escalated_queries,
            "resolved_queries": resolved_queries,
            "resolution_rate": round(resolution_rate, 1)
        }

    def get_recent_activity(self):
        logger.info("Fetching recent activity")
        
        # Get all messages
        messages = sheets_db.get_all_rows('Messages')
        
        # Filter assistant messages and sort by timestamp
        assistant_messages = [m for m in messages if m.get('role') == 'assistant']
        assistant_messages.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Get agent names
        activity = []
        for msg in assistant_messages[:10]:  # Last 10
            agent = agent_service.get_agent(msg.get('agent_id'))
            activity.append({
                "query": msg.get('content', '')[:100],
                "response": msg.get('content', '')[:100],
                "agent_name": agent.name if agent else "Unknown",
                "intent": msg.get('intent', ''),
                "escalated": msg.get('escalated') == 'TRUE',
                "timestamp": msg.get('timestamp', '')
            })
        
        return activity

chat_service = ChatService()
