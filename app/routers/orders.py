from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.transaction import Transaction
from app.models.customer import Customer
from app.models.product import Product
from app.models.user import User
from app.crud.auth import get_current_user, require_role

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("/me")
def get_my_orders(db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    """Get all orders for the current customer."""
    # Find the customer by email
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []
    
    # Get all transactions
    transactions = (
        db.query(Transaction, Product)
        .join(Product, Transaction.product_id == Product.id)
        .filter(Transaction.customer_id == customer.id)
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    
    results = []
    for t, p in transactions:
        results.append({
            "id": t.id,
            "product_name": p.product_name,
            "category": p.category,
            "image_url": p.image_url,
            "quantity": t.quantity,
            "unit_price": t.unit_price,
            "total_amount": t.total_amount,
            "order_status": t.order_status,
            "transaction_date": t.transaction_date,
            "sales_platform": t.sales_platform
        })
    return results

@router.put("/{transaction_id}/cancel")
def cancel_order(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    """Cancel a pending order."""
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.customer_id == customer.id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if transaction.order_status != "PROCESSING":
        raise HTTPException(status_code=400, detail="Only processing orders can be cancelled")
        
    transaction.order_status = "CANCELLED"
    db.commit()
    
    return {"message": "Order cancelled successfully", "order_status": transaction.order_status}
