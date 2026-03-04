import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.conversation import Conversation
from app.schemas.chat import ConversationDetail, ConversationMessage, ConversationSummary

router = APIRouter()


@router.get("", response_model=list[ConversationSummary])
def list_conversations(db: Session = Depends(get_db)) -> list[ConversationSummary]:
    convs = (
        db.query(Conversation)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return [ConversationSummary.model_validate(c) for c in convs]


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: uuid.UUID, db: Session = Depends(get_db)) -> ConversationDetail:
    conv = db.get(Conversation, conversation_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    raw = json.loads(conv.display_messages_json)
    messages = [ConversationMessage(role=m["role"], content=m["content"]) for m in raw]

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        messages=messages,
    )
