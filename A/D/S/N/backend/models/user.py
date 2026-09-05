from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: str
    created_at: str

    class Config:
        from_attributes = True
