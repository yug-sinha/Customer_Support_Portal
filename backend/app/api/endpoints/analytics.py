from fastapi import APIRouter
from app.services.chat_service import chat_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
def get_metrics():
    logger.info("Received request for metrics")
    metrics = chat_service.get_metrics()
    logger.info("Returning metrics data")
    return metrics

@router.get("/escalations")
def get_escalations():
    logger.info("Received request for escalations")
    escalations = chat_service.get_escalations()
    logger.info(f"Returning {len(escalations)} escalations")
    return escalations

@router.get("/activity")
def get_activity():
    logger.info("Received request for recent activity")
    activity = chat_service.get_recent_activity()
    logger.info(f"Returning {len(activity)} activity items")
    return activity

@router.get("/overview")
def get_overview():
    """
    Combined endpoint to reduce frontend round-trips.
    Returns metrics and recent activity in a single payload.
    """
    logger.info("Received request for analytics overview (metrics + activity)")
    metrics = chat_service.get_metrics()
    activity = chat_service.get_recent_activity()
    logger.info(
        "Returning analytics overview: metrics ready, activity count=%s",
        len(activity)
    )
    return {
        "metrics": metrics,
        "activity": activity,
    }
