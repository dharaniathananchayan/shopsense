from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class SemanticSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = Field(6, ge=1, le=50)
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class SemanticSearchResultItem(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str] = None
    price: float
    vendor_id: int
    description: Optional[str] = None
    similarity_score: float  # 0.0 to 100.0 %
    match_confidence: str  # "HIGH", "MEDIUM", "RELEVANT"
    matched_features: List[str]
    contextual_reason: str


class SemanticSearchResponse(BaseModel):
    query: str
    total_matches: int
    results: List[SemanticSearchResultItem]
    vector_dimension: int
    search_strategy: str


class VectorRecommendationItem(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str] = None
    price: float
    vendor_id: int
    similarity_score: float
    affinity_reasons: List[str]
    co_purchased_count: int
