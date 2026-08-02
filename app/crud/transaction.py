from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.transaction import Transaction
from app.models.product import Product
from app.schemas.transaction import TransactionCreate

def create_transaction(db: Session, transaction: TransactionCreate) -> Transaction:
    product = db.query(Product).filter(Product.id == transaction.product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not getattr(product, "is_active", True):
        raise HTTPException(status_code=400, detail="Product is inactive")
    if product.stock_quantity < transaction.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
        
    unit_price = product.price
    total_amount = transaction.quantity * unit_price
    
    product.stock_quantity -= transaction.quantity
    
    db_transaction = Transaction(
        product_id=transaction.product_id,
        customer_id=transaction.customer_id,
        vendor_id=product.vendor_id,
        quantity=transaction.quantity,
        unit_price=unit_price,
        total_amount=total_amount,
        sales_platform=transaction.sales_platform,
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    db.refresh(product)
    
    return db_transaction

def get_transaction(db: Session, transaction_id: int) -> Transaction | None:
    return db.query(Transaction).filter(Transaction.id == transaction_id).first()

def get_transactions(db: Session, skip: int = 0, limit: int = 100, vendor_id: int | None = None, customer_id: int | None = None) -> list[Transaction]:
    query = db.query(Transaction)
    if vendor_id:
        query = query.filter(Transaction.vendor_id == vendor_id)
    if customer_id:
        query = query.filter(Transaction.customer_id == customer_id)
    return query.offset(skip).limit(limit).all()
