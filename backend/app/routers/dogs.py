from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.dog import DogCreate, DogRead
from app.services import dog_service

router = APIRouter()


@router.get("", response_model=list[DogRead])
def list_dogs(db: Session = Depends(get_db)):
    return dog_service.list_dogs(db)


@router.post("", response_model=DogRead, status_code=201)
def create_dog(data: DogCreate, db: Session = Depends(get_db)):
    return dog_service.create_dog(db, data)
