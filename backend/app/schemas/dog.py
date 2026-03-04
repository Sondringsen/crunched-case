from pydantic import BaseModel
import uuid



class DogBase(BaseModel):
    name: str
    breed: str
    age: int | None = None


class DogCreate(DogBase):
    pass


class DogRead(DogBase):
    id: uuid.UUID

    class Config:
        from_attributes = True