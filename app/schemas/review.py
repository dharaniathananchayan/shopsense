from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(5, ge=1, le=5)
    reviewer_name: Optional[str] = "Verified Customer"
    title: Optional[str] = None
    review_text: str


class ReviewResponse(BaseModel):
    id: int
    product_id: int
    vendor_id: int
    customer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    rating: int
    title: Optional[str] = None
    review_text: str
    sentiment_score: Optional[float] = None
    sentiment_label: Optional[str] = None
    pros: Optional[List[str]] = []
    cons: Optional[List[str]] = []
    aspect_scores: Optional[Dict[str, int]] = {}
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewAnalyzeRequest(BaseModel):
    text: str
    product_name: Optional[str] = "Product"
    category: Optional[str] = "General"


class ReviewAnalyzeResponse(BaseModel):
    sentiment_score: float
    sentiment_label: str
    pros: List[str]
    cons: List[str]
    summary: str
    aspect_scores: Dict[str, int]
    vendor_action_items: List[str]
    ai_provider: str


class ProductSentimentSummaryResponse(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str] = None
    total_reviews: int
    avg_rating: float
    overall_sentiment_score: float
    sentiment_distribution: Dict[str, int]  # positive, neutral, negative count
    top_pros: List[str]
    top_cons: List[str]
    executive_summary: str
    aspect_breakdown: Dict[str, int]
    vendor_recommendations: List[str]
    ai_provider: str
