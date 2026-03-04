import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic_ai.messages import ModelMessagesTypeAdapter
from sqlalchemy.orm import Session

from app.agents.chat_agent import run_agent
from app.core.config import settings
from app.core.database import get_db
from app.models.conversation import Conversation
from app.schemas.chat import AddSheetOperation, AppendRowOperation, ChatRequest, ChatResponse, Operation

router = APIRouter()


def _ops_summary(operations: list[Operation]) -> str:
    parts = []
    for op in operations:
        if op.type == "write":
            parts.append(f"write {op.sheet}!{op.range}")
        elif op.type == "add_sheet":
            parts.append(f"add sheet '{op.name}'")
    return "; ".join(parts) if parts else "none"


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    if not settings.ANTHROPIC_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_KEY not configured")

    # Load or create conversation
    if req.conversation_id:
        conv = db.get(Conversation, req.conversation_id)
        if conv is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        prev_messages = ModelMessagesTypeAdapter.validate_json(conv.messages_json)
        display = json.loads(conv.display_messages_json)
    else:
        conv = Conversation(
            title=req.message[:60],
            messages_json="[]",
            display_messages_json="[]",
        )
        db.add(conv)
        db.flush()  # assign id without committing yet
        prev_messages = []
        display = []

    reply, operations, messages_json_bytes = run_agent(
        req.message,
        req.context,
        settings.ANTHROPIC_KEY,
        message_history=prev_messages,
    )

    # Auto-append Changes Log entry
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    log_operations: list[Operation] = [
        AddSheetOperation(name="Changes Log"),
        AppendRowOperation(
            sheet="Changes Log",
            values=[timestamp, req.message[:80], reply[:80], _ops_summary(operations)],
        ),
    ]
    all_operations = operations + log_operations

    # Append display messages for this turn
    display.append({"role": "user", "content": req.message})
    display.append({"role": "assistant", "content": reply})

    conv.messages_json = messages_json_bytes.decode()
    conv.display_messages_json = json.dumps(display)
    db.commit()

    return ChatResponse(reply=reply, operations=all_operations, conversation_id=conv.id)
