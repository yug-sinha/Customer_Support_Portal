from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import agents, chat, analytics, conversations
import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Customer Support Agentic App")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(conversations.router, prefix="/conversations", tags=["conversations"])

@app.get("/")
def read_root():
    return {"message": "Customer Support Agentic Backend is running"}
