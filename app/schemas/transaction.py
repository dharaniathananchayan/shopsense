from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TransactionCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    customer_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    sales_platform: str = Field("ShopSense Direct", max_length=50)

class TransactionResponse(BaseModel):
    id: int
    product_id: int
    customer_id: int
    vendor_id: int
    quantity: int
    unit_price: float
    total_amount: float
    payment_status: str
    sales_platform: str
    transaction_date: datetime

    class Config:
        from_attributes = True

class VendorAnalyticsSummary(BaseModel):
    total_sales: int
    total_revenue: float
    avg_order_value: float
    product_count: int

class SalesDataPoint(BaseModel):
    date: str
    total_sales: int
    total_revenue: float

class TopVendorResponse(BaseModel):
    vendor_id: int
    vendor_name: str
    total_revenue: float
    total_sales: int

class TopProductResponse(BaseModel):
    product_id: int
    product_name: str
    total_sold: int
    total_revenue: float

class PlatformAnalyticsResponse(BaseModel):
    platform_name: str
    total_orders: int
    total_revenue: float
    avg_order_value: float

class PlatformSummary(BaseModel):
    total_vendors: int
    total_products: int
    total_customers: int
    total_transactions: int
    total_revenue: float
