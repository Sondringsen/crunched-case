from fastapi import APIRouter

from app.routers import chat, conversations

router = APIRouter()

router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
