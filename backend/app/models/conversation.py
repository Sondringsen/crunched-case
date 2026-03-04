import uuid

from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base
from app.models.base import TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(120), nullable=False)
    # pydantic-ai serialised message history (all_messages_json)
    messages_json = Column(Text, nullable=False, default="[]")
    # simplified [{role, content}] list for display
    display_messages_json = Column(Text, nullable=False, default="[]")
