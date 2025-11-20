from google import genai
from google.genai import types
from app.core.config import settings
import logging
import time

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = None
        self.gk_model_id = 'gemini-2.5-flash'
        self._initialize_client()

    def _initialize_client(self):
        """Initialize Gemini client"""
        try:
            if not settings.GEMINI_API_KEY:
                logger.warning("GEMINI_API_KEY not set")
                return
            
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
            logger.info("Gemini client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {str(e)}")

    async def generate_response(self, prompt: str) -> str:
        """Generate a response using Gemini"""
        try:
            if not self.client:
                logger.error("Gemini client not initialized")
                return "I apologize, but I'm unable to process your request at the moment."

            logger.info("Generating response from Gemini")
            
            config = types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1000,
            )
            
            response = self.client.models.generate_content(
                model=self.gk_model_id,
                contents=prompt,
                config=config
            )
            
            return response.text
        except Exception as e:
            logger.error(f"Error generating response from Gemini: {str(e)}")
            return "I apologize, but I encountered an error while processing your request."

    def _build_history(self, conversation_history):
        """
        Convert internal conversation history to Gemini chat history.
        Expects a list of dicts with 'role' and 'content'.
        """
        history = []
        for entry in conversation_history:
            role = entry.get("role", "").lower()
            content = (entry.get("content") or "").strip()
            if not content:
                continue

            if role == "user":
                history.append(types.Content(role="user", parts=[types.Part(text=content)]))
            else:
                # Treat any non-user as model/assistant
                history.append(types.Content(role="model", parts=[types.Part(text=content)]))
        return history

    async def generate_response_with_history(self, agent, conversation_history, query: str) -> str:
        """Generate a response using Gemini chat history for follow-ups."""
        try:
            if not self.client:
                logger.error("Gemini client not initialized")
                return "I apologize, but I'm unable to process your request at the moment."

            config = types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1000,
                system_instruction=agent.system_instructions if agent else None
            )

            history = self._build_history(conversation_history or [])

            # If we have history, use chats.create with history; otherwise fallback to generate_content
            if history:
                logger.info("Creating chat session with history. Messages=%s", len(history))
                chat = self.client.chats.create(
                    model=self.gk_model_id,
                    config=config,
                    history=history,
                )

                max_retries = 3
                attempt = 0
                last_error = None
                while attempt < max_retries:
                    try:
                        response = chat.send_message(query)
                        return getattr(response, "text", str(response))
                    except Exception as e:
                        last_error = e
                        status_code = getattr(e, "status_code", None)
                        if status_code == 503 or "503" in str(e):
                            attempt += 1
                            logger.info(f"Received 503 error. Retrying attempt {attempt}/{max_retries}...")
                            time.sleep(1)
                            continue
                        raise
                logger.error(f"Failed to send message after retries: {last_error}")
                return "I apologize, but I encountered an error while processing your request."
            else:
                logger.info("No conversation history found. Sending prompt directly.")
                prompt = f"{agent.system_instructions if agent else ''}\nUser: {query}"
                max_retries = 3
                attempt = 0
                last_error = None
                while attempt < max_retries:
                    try:
                        response = self.client.models.generate_content(
                            model=self.gk_model_id,
                            contents=prompt,
                            config=config,
                        )
                        return response.text
                    except Exception as e:
                        last_error = e
                        status_code = getattr(e, "status_code", None)
                        if status_code == 503 or "503" in str(e):
                            attempt += 1
                            logger.info(f"Received 503 error. Retrying attempt {attempt}/{max_retries}...")
                            time.sleep(1)
                            continue
                        raise
                logger.error(f"Failed to send message after retries: {last_error}")
                return "I apologize, but I encountered an error while processing your request."
        except Exception as e:
            logger.error(f"Error generating response with history from Gemini: {str(e)}")
            return "I apologize, but I encountered an error while processing your request."

    async def classify_intent(self, query: str) -> str:
        """Classify user intent using Gemini"""
        try:
            if not self.client:
                logger.error("Gemini client not initialized")
                return "Error"

            logger.info("Classifying intent with Gemini")
            
            prompt = f"""You are an intent classifier. Return exactly one of: Escalation, Transactional, Informational.

Rules (highest priority first):
- If the user explicitly asks to escalate, speak to a human/manager/agent, or requests to transfer/hand off/raise a ticket, classify as Escalation.
- Otherwise if the user wants an action performed (check status, process refund, change booking, etc.), classify as Transactional.
- Otherwise, classify as Informational.

User query: {query}

Respond with only the single word: Escalation, Transactional, or Informational."""

            config = types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=50,
            )
            
            response = self.client.models.generate_content(
                model=self.gk_model_id,
                contents=prompt,
                config=config
            )
            
            intent_text = (response.text or "").strip()
            intent = intent_text if intent_text else "Informational"
            
            # Validate intent
            valid_intents = ["Informational", "Transactional", "Escalation"]
            if intent not in valid_intents:
                logger.warning(f"Invalid intent '{intent}', defaulting to Informational")
                return "Informational"
            
            return intent
        except Exception as e:
            logger.error(f"Error classifying intent: {str(e)}")
            return "Error"

llm_service = LLMService()
