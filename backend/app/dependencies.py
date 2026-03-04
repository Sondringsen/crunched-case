from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

# Re-export get_db for convenience in routers
__all__ = ["get_db"]

# Add auth dependency here when ready, e.g.:
# from app.core.security import get_current_user
