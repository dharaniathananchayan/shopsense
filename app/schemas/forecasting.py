from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    forecast: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class ProductForecastResponse(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str] = None
    vendor_id: int
    current_stock: int
    forecast_horizon_days: int
    lead_time_days: int
    historical_series: List[ForecastPoint]
    forecast_series: List[ForecastPoint]
    total_predicted_demand: float
    avg_daily_demand: float
    safety_stock: int
    reorder_point: int
    stockout_risk: str  # "LOW", "MODERATE", "HIGH", "CRITICAL"
    days_until_stockout: Optional[int] = None
    recommended_reorder_qty: int
    model_name: str
    model_metrics: Dict[str, Any]
    summary_insight: str


class ReorderAlertItem(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str] = None
    vendor_id: int
    current_stock: int
    reorder_point: int
    safety_stock: int
    avg_daily_demand: float
    predicted_demand_30d: float
    recommended_reorder_qty: int
    stockout_risk: str
    days_until_stockout: Optional[int] = None
    urgency_score: float


class CategoryForecastResponse(BaseModel):
    category: str
    forecast_horizon_days: int
    historical_series: List[ForecastPoint]
    forecast_series: List[ForecastPoint]
    total_predicted_demand: float
    avg_daily_demand: float
    top_demanded_products: List[Dict[str, Any]]
    model_name: str
