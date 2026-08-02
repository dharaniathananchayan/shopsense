from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Vendor, Product, Customer, Transaction
from app.models.user import User
from app.crud.auth import get_current_user, require_role
from app.schemas.transaction import (
    VendorAnalyticsSummary,
    SalesDataPoint,
    TopVendorResponse,
    TopProductResponse,
    PlatformAnalyticsResponse,
    PlatformSummary
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/vendors/{vendor_id}/summary", response_model=VendorAnalyticsSummary)
def vendor_summary(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "VENDOR"]))):
    if current_user.role == "VENDOR" and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Vendors can only view their own analytics")
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    stats = db.query(
        func.count(Transaction.id).label("total_sales"),
        func.sum(Transaction.total_amount).label("total_revenue"),
        func.avg(Transaction.total_amount).label("avg_order_value")
    ).filter(
        Transaction.vendor_id == vendor_id,
        Transaction.payment_status == "COMPLETED"
    ).first()
    
    product_count = db.query(func.count(Product.id)).filter(
        Product.vendor_id == vendor_id
    ).scalar()
    
    return {
        "total_sales": stats.total_sales or 0,
        "total_revenue": stats.total_revenue or 0.0,
        "avg_order_value": stats.avg_order_value or 0.0,
        "product_count": product_count or 0
    }

@router.get("/vendors/{vendor_id}/sales", response_model=list[SalesDataPoint])
def vendor_sales(
    vendor_id: int,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "VENDOR"]))
):
    if current_user.role == "VENDOR" and current_user.vendor_id != vendor_id:
        raise HTTPException(status_code=403, detail="Vendors can only view their own analytics")
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    query = db.query(
        func.date(Transaction.transaction_date).label("date"),
        func.count(Transaction.id).label("total_sales"),
        func.sum(Transaction.total_amount).label("total_revenue")
    ).filter(
        Transaction.vendor_id == vendor_id,
        Transaction.payment_status == "COMPLETED"
    )
    
    if start_date:
        query = query.filter(func.date(Transaction.transaction_date) >= start_date)
    if end_date:
        query = query.filter(func.date(Transaction.transaction_date) <= end_date)
        
    results = query.group_by(func.date(Transaction.transaction_date)).order_by(
        func.date(Transaction.transaction_date)
    ).all()

    return [
        {"date": str(r.date), "total_sales": r.total_sales, "total_revenue": r.total_revenue}
        for r in results
    ]

@router.get("/top-vendors", response_model=list[TopVendorResponse])
def top_vendors(limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    results = db.query(
        Vendor.id.label("vendor_id"),
        Vendor.vendor_name.label("vendor_name"),
        func.sum(Transaction.total_amount).label("total_revenue"),
        func.count(Transaction.id).label("total_sales")
    ).join(
        Transaction, Vendor.id == Transaction.vendor_id
    ).filter(
        Transaction.payment_status == "COMPLETED"
    ).group_by(
        Vendor.id, Vendor.vendor_name
    ).order_by(
        func.sum(Transaction.total_amount).desc()
    ).limit(limit).all()
     
    return [
        {
            "vendor_id": r.vendor_id,
            "vendor_name": r.vendor_name,
            "total_revenue": r.total_revenue or 0.0,
            "total_sales": r.total_sales or 0
        }
        for r in results
    ]

@router.get("/top-products", response_model=list[TopProductResponse])
def top_products(limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "VENDOR"]))):
    results = db.query(
        Product.id.label("product_id"),
        Product.product_name.label("product_name"),
        func.sum(Transaction.quantity).label("total_sold"),
        func.sum(Transaction.total_amount).label("total_revenue")
    ).join(
        Transaction, Product.id == Transaction.product_id
    ).filter(
        Transaction.payment_status == "COMPLETED"
    )
    if current_user.role == "VENDOR":
        results = results.filter(Product.vendor_id == current_user.vendor_id)
    results = results.group_by(
        Product.id, Product.product_name
    ).order_by(
        func.sum(Transaction.quantity).desc()
    ).limit(limit).all()
     
    return [
        {
            "product_id": r.product_id,
            "product_name": r.product_name,
            "total_sold": r.total_sold or 0,
            "total_revenue": r.total_revenue or 0.0
        }
        for r in results
    ]

@router.get("/platform-summary", response_model=list[PlatformAnalyticsResponse])
def platform_channel_summary(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    results = db.query(
        Transaction.sales_platform.label("platform_name"),
        func.count(Transaction.id).label("total_orders"),
        func.sum(Transaction.total_amount).label("total_revenue"),
        func.avg(Transaction.total_amount).label("avg_order_value"),
    ).filter(
        Transaction.payment_status == "COMPLETED"
    ).group_by(
        Transaction.sales_platform
    ).order_by(
        func.sum(Transaction.total_amount).desc()
    ).all()

    return [{
        "platform_name": row.platform_name,
        "total_orders": row.total_orders or 0,
        "total_revenue": row.total_revenue or 0.0,
        "avg_order_value": row.avg_order_value or 0.0,
    } for row in results]

@router.get("/summary", response_model=PlatformSummary)
def platform_summary(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN", "VENDOR"]))):
    if current_user.role == "VENDOR":
        vendor_id = current_user.vendor_id
        if not vendor_id:
            raise HTTPException(status_code=403, detail="Vendor account is not linked to a vendor profile")
        vendors_count = 1
        products_count = db.query(func.count(Product.id)).filter(Product.vendor_id == vendor_id).scalar()
        customers_count = 0
        transactions_count = db.query(func.count(Transaction.id)).filter(Transaction.vendor_id == vendor_id, Transaction.payment_status == "COMPLETED").scalar()
        total_revenue = db.query(func.sum(Transaction.total_amount)).filter(Transaction.vendor_id == vendor_id, Transaction.payment_status == "COMPLETED").scalar()
    else:
        vendors_count = db.query(func.count(Vendor.id)).scalar()
        products_count = db.query(func.count(Product.id)).scalar()
        customers_count = db.query(func.count(Customer.id)).scalar()
        transactions_count = db.query(func.count(Transaction.id)).scalar()
        total_revenue = db.query(func.sum(Transaction.total_amount)).filter(Transaction.payment_status == "COMPLETED").scalar()
    
    return {
        "total_vendors": vendors_count or 0,
        "total_products": products_count or 0,
        "total_customers": customers_count or 0,
        "total_transactions": transactions_count or 0,
        "total_revenue": total_revenue or 0.0
    }
