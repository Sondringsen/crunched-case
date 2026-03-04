from fastapi import APIRouter, HTTPException

from app.agents.chat_agent import run_agent
from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if not settings.ANTHROPIC_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_KEY not configured")

    return run_agent(req.message, req.context, settings.ANTHROPIC_KEY)
