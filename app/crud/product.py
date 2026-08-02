from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from datetime import datetime

def create_product(db: Session, product: ProductCreate, approval_status: str = "APPROVED") -> Product:
    db_product = Product(**product.model_dump(), approval_status=approval_status,
                         approved_at=datetime.utcnow() if approval_status == "APPROVED" else None)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def get_product(db: Session, product_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100, vendor_id: int | None = None, category: str | None = None) -> list[Product]:
    query = db.query(Product)
    if vendor_id:
        query = query.filter(Product.vendor_id == vendor_id)
    if category:
        query = query.filter(Product.category == category)
    return query.offset(skip).limit(limit).all()

def update_product(db: Session, product_id: int, product_update: ProductUpdate) -> Product | None:
    db_product = get_product(db, product_id)
    if db_product:
        update_data = product_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int) -> bool:
    db_product = get_product(db, product_id)
    if db_product:
        db.delete(db_product)
        db.commit()
        return True
    return False

def get_pending_products(db: Session, skip: int = 0, limit: int = 100) -> list[Product]:
    return (db.query(Product).filter(Product.approval_status == "PENDING")
            .order_by(Product.created_at.asc()).offset(skip).limit(limit).all())

def set_product_approval(db: Session, product_id: int, approval_status: str, approval_note: str | None = None) -> Product | None:
    product = get_product(db, product_id)
    if not product:
        return None
    product.approval_status = approval_status
    product.approval_note = approval_note
    product.approved_at = datetime.utcnow() if approval_status == "APPROVED" else None
    product.is_active = approval_status == "APPROVED"
    db.commit()
    db.refresh(product)
    return product
