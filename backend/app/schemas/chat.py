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


class WriteOperation(BaseModel):
    sheet: str
    range: str
    values: list[list[CellValue]]


class ChatResponse(BaseModel):
    reply: str
    operations: list[WriteOperation] = []
