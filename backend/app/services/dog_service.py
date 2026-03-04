from sqlalchemy.orm import Session
from app.models.dog import Dog
from app.schemas.dog import DogCreate


def list_dogs(db: Session) -> list[Dog]:
    return db.query(Dog).order_by(Dog.id).all()


def create_dog(db: Session, data: DogCreate) -> Dog:
    dog = Dog(**data.model_dump())
    db.add(dog)
    db.commit()
    db.refresh(dog)
    return dog
