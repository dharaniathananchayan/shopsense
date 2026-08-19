from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
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
    PlatformSummary,
    CustomerSegmentResponse,
    HistoricalValidationReport,
    ValidationCheck,
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


# ---------------------------------------------------------------------------
# Customer Segmentation
# ---------------------------------------------------------------------------

_SEGMENT_THRESHOLDS = {
    "VIP": 10_000,
    "Regular": 1_000,
}  # VIP >= 10000, Regular >= 1000, Occasional < 1000


def _classify_segment(total_spent: float) -> str:
    if total_spent >= _SEGMENT_THRESHOLDS["VIP"]:
        return "VIP"
    if total_spent >= _SEGMENT_THRESHOLDS["Regular"]:
        return "Regular"
    return "Occasional"


@router.get("/customer-segments", response_model=list[CustomerSegmentResponse])
def customer_segments(
    segment: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"])),
):
    """Group every customer by total spend into VIP / Regular / Occasional tiers.

    Optional query param `segment` (VIP | Regular | Occasional) filters the result.
    Thresholds: VIP >= ₹10 000, Regular ₹1 000–9 999, Occasional < ₹1 000.
    """
    rows = (
        db.query(
            Customer.id.label("customer_id"),
            Customer.first_name,
            Customer.last_name,
            Customer.email,
            func.coalesce(func.sum(Transaction.total_amount), 0.0).label("total_spent"),
            func.count(Transaction.id).label("order_count"),
        )
        .outerjoin(Transaction, Customer.id == Transaction.customer_id)
        .filter(
            (Transaction.payment_status == "COMPLETED") | (Transaction.id == None)
        )
        .group_by(Customer.id, Customer.first_name, Customer.last_name, Customer.email)
        .order_by(func.coalesce(func.sum(Transaction.total_amount), 0.0).desc())
        .all()
    )

    result = []
    for row in rows:
        seg = _classify_segment(row.total_spent)
        if segment and seg.lower() != segment.lower():
            continue
        result.append(
            CustomerSegmentResponse(
                customer_id=row.customer_id,
                first_name=row.first_name,
                last_name=row.last_name,
                email=row.email,
                total_spent=round(row.total_spent, 2),
                order_count=row.order_count,
                segment=seg,
            )
        )
    return result


# ---------------------------------------------------------------------------
# Historical Data Validation
# ---------------------------------------------------------------------------

@router.get("/validate-historical", response_model=HistoricalValidationReport)
def validate_historical(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"])),
):
    """Cross-check analytical outputs against raw historical transaction data.

    Runs four integrity checks and returns a detailed validation report.
    """
    checks: list[ValidationCheck] = []

    # ------------------------------------------------------------------
    # Check 1: Revenue consistency — total_amount == quantity × unit_price
    # ------------------------------------------------------------------
    discrepancies = (
        db.query(
            Transaction.id,
            Transaction.total_amount,
            (Transaction.quantity * Transaction.unit_price).label("expected"),
        )
        .filter(Transaction.payment_status == "COMPLETED")
        .all()
    )
    revenue_anomalies = [
        {"transaction_id": r.id, "stored": r.total_amount, "expected": r.expected}
        for r in discrepancies
        if abs(r.total_amount - r.expected) > 0.01
    ]
    checks.append(
        ValidationCheck(
            check_name="Revenue Consistency",
            passed=len(revenue_anomalies) == 0,
            detail=(
                f"All {len(discrepancies)} completed transactions have matching total_amount."
                if not revenue_anomalies
                else f"{len(revenue_anomalies)} transaction(s) have total_amount mismatches."
            ),
            anomalies=revenue_anomalies,
        )
    )

    # ------------------------------------------------------------------
    # Check 2: Stock non-negative — no product stock_quantity < 0
    # ------------------------------------------------------------------
    negative_stock = (
        db.query(Product.id, Product.product_name, Product.stock_quantity)
        .filter(Product.stock_quantity < 0)
        .all()
    )
    checks.append(
        ValidationCheck(
            check_name="Stock Non-Negative",
            passed=len(negative_stock) == 0,
            detail=(
                "All product stock quantities are >= 0."
                if not negative_stock
                else f"{len(negative_stock)} product(s) have negative stock."
            ),
            anomalies=[
                {"product_id": p.id, "product_name": p.product_name, "stock_quantity": p.stock_quantity}
                for p in negative_stock
            ],
        )
    )

    # ------------------------------------------------------------------
    # Check 3: Referential integrity — no orphan transactions
    # ------------------------------------------------------------------
    orphan_product = (
        db.query(Transaction.id)
        .outerjoin(Product, Transaction.product_id == Product.id)
        .filter(Product.id == None)
        .all()
    )
    orphan_customer = (
        db.query(Transaction.id)
        .outerjoin(Customer, Transaction.customer_id == Customer.id)
        .filter(Customer.id == None)
        .all()
    )
    orphan_ids = list({r.id for r in orphan_product + orphan_customer})
    checks.append(
        ValidationCheck(
            check_name="Referential Integrity",
            passed=len(orphan_ids) == 0,
            detail=(
                "All transactions reference valid products and customers."
                if not orphan_ids
                else f"{len(orphan_ids)} transaction(s) reference missing products or customers."
            ),
            anomalies=[{"transaction_id": tid} for tid in orphan_ids],
        )
    )

    # ------------------------------------------------------------------
    # Check 4: Aggregate revenue cross-check
    # sum(total_amount) vs sum(quantity * unit_price)
    # ------------------------------------------------------------------
    agg = db.query(
        func.sum(Transaction.total_amount).label("sum_total"),
        func.sum(Transaction.quantity * Transaction.unit_price).label("sum_computed"),
    ).filter(Transaction.payment_status == "COMPLETED").first()

    sum_total = agg.sum_total or 0.0
    sum_computed = agg.sum_computed or 0.0
    agg_diff = abs(sum_total - sum_computed)
    checks.append(
        ValidationCheck(
            check_name="Aggregate Revenue Cross-Check",
            passed=agg_diff < 0.01,
            detail=(
                f"Aggregate revenue matches: ₹{sum_total:,.2f}."
                if agg_diff < 0.01
                else f"Aggregate mismatch: stored ₹{sum_total:,.2f} vs computed ₹{sum_computed:,.2f} (diff ₹{agg_diff:,.2f})."
            ),
            anomalies=[] if agg_diff < 0.01 else [{"stored_sum": sum_total, "computed_sum": sum_computed, "difference": agg_diff}],
        )
    )

    overall = all(c.passed for c in checks)
    return HistoricalValidationReport(overall_passed=overall, checks=checks)
