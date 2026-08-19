from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.crud.auth import get_current_user, require_role
from app.schemas.forecasting import (
    ProductForecastResponse,
    ReorderAlertItem,
    CategoryForecastResponse,
)
from app.services.forecasting_service import (
    generate_product_forecast,
    generate_catalog_reorder_alerts,
)

router = APIRouter(prefix="/forecasting", tags=["Machine Learning Time-Series Forecasting"])


@router.get("/product/{product_id}", response_model=ProductForecastResponse)
def get_product_forecast(
    product_id: int,
    horizon_days: int = Query(14, ge=7, le=60, description="Forecast horizon in days"),
    lead_time_days: int = Query(7, ge=1, le=30, description="Supplier lead time in days"),
    db: Session = Depends(get_db),
):
    """
    Train a time-series model (ARIMA / Exponential Smoothing) on historical daily sales
    and project future inventory demand with 95% confidence intervals and Reorder Point (ROP).
    """
    try:
        return generate_product_forecast(
            db=db,
            product_id=product_id,
            horizon_days=horizon_days,
            lead_time_days=lead_time_days,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")


@router.get("/reorder-alerts", response_model=List[ReorderAlertItem])
def get_reorder_alerts(
    vendor_id: Optional[int] = Query(None, description="Optional vendor ID filter"),
    db: Session = Depends(get_db),
):
    """
    Scan inventory and return ML-driven reorder alerts prioritized by stockout urgency.
    """
    return generate_catalog_reorder_alerts(db=db, vendor_id=vendor_id)
