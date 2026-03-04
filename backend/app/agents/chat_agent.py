from __future__ import annotations

import json
from dataclasses import dataclass, field

from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelMessage
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider

from app.schemas.chat import SpreadsheetContext, WriteOperation

CellValue = str | int | float | bool | None

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# Agent dependencies — mutable state shared across tool calls in one run
# ---------------------------------------------------------------------------


@dataclass
class _Deps:
    context: SpreadsheetContext | None
    operations: list[WriteOperation] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Agent definition
# ---------------------------------------------------------------------------

# Model is provided at runtime in run_agent() to avoid requiring env vars at import time
_agent: Agent[_Deps, str] = Agent(
    deps_type=_Deps,
    system_prompt=SYSTEM_PROMPT,
)


@_agent.tool
def write_cells(
    ctx: RunContext[_Deps],
    sheet: str,
    range: str,
    values: list[list[CellValue]],
) -> str:
    """Write values to a range of cells in the spreadsheet.

    Args:
        ctx: Run context with accumulated operations.
        sheet: Name of the worksheet to write to.
        range: Cell range in A1 notation, e.g. 'A1' or 'B2:D4'.
        values: 2-D array of values to write (rows × columns).
    """
    op = WriteOperation(sheet=sheet, range=range, values=values)
    ctx.deps.operations.append(op)
    return f"Queued write to {sheet}!{range}"


# ---------------------------------------------------------------------------
# Context formatting
# ---------------------------------------------------------------------------


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
        lines.append("\nSpreadsheet data (row-major, 0-indexed):")
        lines.append("```json")
        lines.append(json.dumps(ctx.data, ensure_ascii=False))
        lines.append("```")
    else:
        lines.append("The active sheet appears to be empty.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def run_agent(
    message: str,
    context: SpreadsheetContext | None,
    api_key: str,
    message_history: list[ModelMessage] | None = None,
) -> tuple[str, list[WriteOperation], bytes]:
    """Run the agent and return (reply, operations, all_messages_json bytes).

    The caller (router layer) is responsible for assigning the conversation ID
    and constructing the final response schema.
    """
    deps = _Deps(context=context)
    context_text = _build_context_text(context)
    user_content = f"{message}\n\n---\nSpreadsheet context:\n{context_text}"

    model = AnthropicModel("claude-opus-4-6", provider=AnthropicProvider(api_key=api_key))
    result = _agent.run_sync(
        user_content,
        deps=deps,
        model=model,
        message_history=message_history or [],
    )

    return result.output, deps.operations, result.all_messages_json()
