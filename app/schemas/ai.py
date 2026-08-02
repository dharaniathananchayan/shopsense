from pydantic import BaseModel, Field
from typing import Optional, List

class AIGenerateRequest(BaseModel):
    product_name: str = Field(..., min_length=2, max_length=150)
    category: Optional[str] = Field(None, max_length=50)
    keywords: Optional[str] = Field(None, max_length=200)
    target_audience: Optional[str] = Field("General Customers", max_length=100)

class AIGenerateResponse(BaseModel):
    tagline: str
    description: str
    highlights: List[str]
    seo_tags: List[str]
    target_keywords: List[str]
    seo_score: int
    ai_provider: str

class ProductWithAICreate(BaseModel):
    vendor_id: int = Field(..., gt=0)
    product_name: str = Field(..., min_length=2, max_length=150)
    category: Optional[str] = Field(None, max_length=50)
    price: float = Field(..., gt=0)
    stock_quantity: int = Field(0, ge=0)
    keywords: Optional[str] = Field(None, max_length=200)
    target_audience: Optional[str] = Field("General Customers", max_length=100)
