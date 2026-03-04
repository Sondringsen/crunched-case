import uuid
from datetime import datetime

from pydantic import BaseModel

CellValue = str | int | float | bool | None


class SpreadsheetContext(BaseModel):
    sheets: list[str] = []
    current_sheet: str = "Sheet1"
    data: list[list[CellValue]] = []
    selection: str | None = None


class ChatRequest(BaseModel):
    message: str
    context: SpreadsheetContext | None = None
    conversation_id: uuid.UUID | None = None


class WriteOperation(BaseModel):
    sheet: str
    range: str
    values: list[list[CellValue]]


class ChatResponse(BaseModel):
    reply: str
    operations: list[WriteOperation] = []
    conversation_id: uuid.UUID


class ConversationMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ConversationSummary(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    messages: list[ConversationMessage]

    class Config:
        from_attributes = True
