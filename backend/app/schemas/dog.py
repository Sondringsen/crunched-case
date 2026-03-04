from pydantic import BaseModel


class DogBase(BaseModel):
    name: str
    breed: str
    age: int | None = None


class DogCreate(DogBase):
    pass


class DogRead(DogBase):
    id: int

    class Config:
        from_attributes = True
