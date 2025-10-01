from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    active: Optional[bool] = None
    role: Optional[str] = None

class UserResponse(UserBase):
    id: str
    role: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
