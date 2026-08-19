from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductApprovalUpdate,
    StockLevelResponse, LowStockAlertResponse,
)
from app.crud import product as crud_product
from app.crud.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["VENDOR", "ADMIN"]))):
    if current_user.role == "VENDOR" and current_user.vendor_id != product.vendor_id:
        raise HTTPException(status_code=403, detail="Vendors can only create products for their own account")
    return crud_product.create_product(db=db, product=product, approval_status="APPROVED")

@router.get("/", response_model=list[ProductResponse])
def read_products(skip: int = 0, limit: int = 100, vendor_id: int = None, category: str = None, db: Session = Depends(get_db)):
    """Public catalog feed used by the unauthenticated forecasting page."""
    return crud_product.get_products(db=db, skip=skip, limit=limit, vendor_id=vendor_id, category=category)


@router.get("/inventory/stock-levels", response_model=list[StockLevelResponse])
def stock_levels(
    vendor_id: int = None,
    category: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "VENDOR"])),
):
    """Return current stock quantities for all products.
    VENDORs are automatically scoped to their own products.
    """
    if current_user.role == "VENDOR":
        vendor_id = current_user.vendor_id
    products = crud_product.get_stock_levels(
        db=db, vendor_id=vendor_id, category=category, skip=skip, limit=limit
    )
    return [
        StockLevelResponse(
            product_id=p.id,
            product_name=p.product_name,
            category=p.category,
            vendor_id=p.vendor_id,
            stock_quantity=p.stock_quantity,
            price=p.price,
            is_active=p.is_active,
        )
        for p in products
    ]


@router.get("/inventory/low-stock", response_model=list[LowStockAlertResponse])
def low_stock_alerts(
    threshold: int = 10,
    vendor_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "VENDOR"])),
):
    """Return products whose stock quantity is at or below `threshold` (default 10).
    VENDORs are automatically scoped to their own products.
    """
    if current_user.role == "VENDOR":
        vendor_id = current_user.vendor_id
    products = crud_product.get_low_stock_products(
        db=db, threshold=threshold, vendor_id=vendor_id
    )
    return [
        LowStockAlertResponse(
            product_id=p.id,
            product_name=p.product_name,
            category=p.category,
            vendor_id=p.vendor_id,
            stock_quantity=p.stock_quantity,
            threshold=threshold,
            price=p.price,
        )
        for p in products
    ]

@router.get("/{product_id}", response_model=ProductResponse)
def read_product(product_id: int, db: Session = Depends(get_db)):
    db_product = crud_product.get_product(db=db, product_id=product_id)
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["VENDOR", "ADMIN"]))):
    existing = crud_product.get_product(db, product_id)
    if existing and current_user.role == "VENDOR" and existing.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="Vendors can only update their own products")
    db_product = crud_product.update_product(db=db, product_id=product_id, product_update=product)
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    db_product = crud_product.delete_product(db=db, product_id=product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
