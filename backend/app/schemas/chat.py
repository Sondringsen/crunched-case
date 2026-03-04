import uuid
from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

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
    type: Literal["write"] = "write"
    sheet: str
    range: str
    values: list[list[CellValue]]


class AddSheetOperation(BaseModel):
    type: Literal["add_sheet"] = "add_sheet"
    name: str


class AppendRowOperation(BaseModel):
    type: Literal["append_row"] = "append_row"
    sheet: str
    values: list[CellValue]


Operation = Annotated[
    Union[WriteOperation, AddSheetOperation, AppendRowOperation],
    Field(discriminator="type"),
]


class ChatResponse(BaseModel):
    reply: str
    operations: list[Operation] = []
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
