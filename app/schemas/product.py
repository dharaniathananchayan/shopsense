from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductCreate(BaseModel):
    vendor_id: int = Field(..., gt=0)
    product_name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    price: float = Field(..., gt=0)
    stock_quantity: int = Field(0, ge=0)

class ProductUpdate(BaseModel):
    product_name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    price: Optional[float] = Field(None, gt=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductApprovalUpdate(BaseModel):
    approval_status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    approval_note: Optional[str] = Field(None, max_length=500)

class ProductResponse(BaseModel):
    id: int
    vendor_id: int
    product_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float
    stock_quantity: int
    is_active: bool
    approval_status: str
    approval_note: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
