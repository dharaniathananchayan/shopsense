from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class VendorStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"

class VendorCreate(BaseModel):
    vendor_name: str = Field(..., min_length=2, max_length=100)
    contact_email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)

class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = Field(None, min_length=2, max_length=100)
    contact_email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=255)
    status: Optional[VendorStatus] = None

class VendorResponse(BaseModel):
    id: int
    vendor_name: str
    contact_email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
