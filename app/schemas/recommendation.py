from pydantic import BaseModel
from typing import Optional


class RecommendedProductResponse(BaseModel):
    """A product surfaced by one of the rule-based recommendation endpoints."""
    product_id: int
    product_name: str
    category: Optional[str] = None
    price: float
    vendor_id: int
    total_sold: int
    score: float  # generic ranking score (units depend on endpoint)
    reason: str   # human-readable explanation of why this was recommended

    class Config:
        from_attributes = True
