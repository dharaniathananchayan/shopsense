from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    role: str = Field("VENDOR", pattern="^(ADMIN|VENDOR|CUSTOMER)$")
    vendor_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    email: str
    full_name: Optional[str] = None
    vendor_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    role: str
    vendor_id: Optional[int] = None
    approval_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class VendorApprovalUpdate(BaseModel):
    approval_status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
