from sqlalchemy import Column, Integer, String
from app.core.database import Base
from app.models.base import TimestampMixin


class Dog(Base, TimestampMixin):
    __tablename__ = "dogs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    breed = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
