from __future__ import annotations

import json
from typing import Any

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Tool definitions for the AI agent
# ---------------------------------------------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "name": "write_cells",
        "description": (
            "Write values to a range of cells in the spreadsheet. "
            "Use A1 notation for the range (e.g. 'A1', 'B2:D5'). "
            "Values must be a 2-D array matching the range dimensions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sheet": {
                    "type": "string",
                    "description": "Name of the worksheet to write to.",
                },
                "range": {
                    "type": "string",
                    "description": "Cell range in A1 notation, e.g. 'A1' or 'B2:D4'.",
                },
                "values": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": ["string", "number", "boolean", "null"]},
                    },
                    "description": "2-D array of values to write (rows × columns).",
                },
            },
            "required": ["sheet", "range", "values"],
        },
    }
]

SYSTEM_PROMPT = """\
You are Crunched, an expert Excel AI assistant embedded in the user's spreadsheet.
You help users understand, analyse, and transform their data.

When you need to write data back to the spreadsheet, use the `write_cells` tool.
You can call it multiple times if you need to write to several locations.

Guidelines:
- Be concise and clear in your replies.
- Always confirm what you wrote and where.
- If the data is too large to analyse fully, let the user know and work with what is available.
- Never invent data that isn't in the provided context.
- When performing calculations, show your reasoning briefly.
"""


def _build_context_text(ctx: SpreadsheetContext | None) -> str:
    if ctx is None:
        return "No spreadsheet context provided — the user has not shared any data."

    lines = [
        f"Available sheets: {', '.join(ctx.sheets) if ctx.sheets else 'unknown'}",
        f"Active sheet: {ctx.current_sheet}",
    ]
    if ctx.selection:
        lines.append(f"User's current selection: {ctx.selection}")

    if ctx.data:
        rows, cols = len(ctx.data), max(len(r) for r in ctx.data)
        lines.append(f"Used range: {rows} rows × {cols} columns")
        # Include data as a compact JSON block so the model can read it
        lines.append("\nSpreadsheet data (row-major, 0-indexed):")
        lines.append("```json")
        lines.append(json.dumps(ctx.data, ensure_ascii=False))
        lines.append("```")
    else:
        lines.append("The active sheet appears to be empty.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if not settings.ANTHROPIC_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_KEY not configured")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_KEY)

    context_text = _build_context_text(req.context)
    user_content = f"{req.message}\n\n---\nSpreadsheet context:\n{context_text}"

    messages: list[dict[str, Any]] = [{"role": "user", "content": user_content}]

    operations: list[WriteOperation] = []
    reply = ""

    # Agentic loop: let the model call tools until it returns a final message
    while True:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        # Collect any text from this turn
        for block in response.content:
            if block.type == "text":
                reply += block.text

        if response.stop_reason == "tool_use":
            # Process each tool call and append a synthetic tool_result turn
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                if block.name == "write_cells":
                    op = WriteOperation(
                        sheet=block.input["sheet"],
                        range=block.input["range"],
                        values=block.input["values"],
                    )
                    operations.append(op)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": f"Queued write to {op.sheet}!{op.range}",
                        }
                    )

            # Append assistant turn + tool results and continue
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

        else:
            # stop_reason == "end_turn" (or something else) → done
            break

    return ChatResponse(reply=reply.strip(), operations=operations)
