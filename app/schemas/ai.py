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
    category: Optional[str] = None

class ProductWithAICreate(BaseModel):
    vendor_id: int = Field(..., gt=0)
    product_name: str = Field(..., min_length=2, max_length=150)
    category: Optional[str] = Field(None, max_length=50)
    price: float = Field(..., gt=0)
    stock_quantity: int = Field(0, ge=0)
    keywords: Optional[str] = Field(None, max_length=200)
    target_audience: Optional[str] = Field("General Customers", max_length=100)


class ShoppingAssistantRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=300)
    price_max: Optional[float] = Field(None, ge=0)


class ShoppingAssistantResponse(BaseModel):
    query: str
    answer: str
    recommended_products: List[dict]
    ai_provider: str


class DataAnalystRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=300)
    vendor_id: Optional[int] = None


class DataAnalystResponse(BaseModel):
    question: str
    generated_sql: str
    query_results: List[dict]
    analysis_insight: str
    ai_provider: str
    chart_type: Optional[str] = None


class AgentWorkflowRequest(BaseModel):
    vendor_id: int = Field(..., gt=0)


class AgentWorkflowResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    timestamp: str
    audit_data: List[dict]
    advisory_report: str
    ai_agent_status: str


