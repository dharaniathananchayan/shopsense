import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.crud import transaction as crud_transaction
from app.services.ws_manager import manager
from app.models import Product, Vendor, Customer

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    # The crud function handles stock validation and price computation
    new_tx = crud_transaction.create_transaction(db=db, transaction=transaction)
    
    # Broadcast real-time sale notification via WebSocket
    try:
        prod = db.query(Product).filter(Product.id == new_tx.product_id).first()
        vend = db.query(Vendor).filter(Vendor.id == new_tx.vendor_id).first()
        cust = db.query(Customer).filter(Customer.id == new_tx.customer_id).first()
        
        event_payload = {
            "type": "NEW_SALE",
            "data": {
                "transaction_id": new_tx.id,
                "product_name": prod.product_name if prod else f"Product #{new_tx.product_id}",
                "vendor_name": vend.vendor_name if vend else f"Vendor #{new_tx.vendor_id}",
                "customer_name": f"{cust.first_name} {cust.last_name}" if cust else f"Customer #{new_tx.customer_id}",
                "quantity": new_tx.quantity,
                "total_amount": new_tx.total_amount,
                "sales_platform": new_tx.sales_platform,
                "timestamp": new_tx.transaction_date.strftime("%Y-%m-%d %H:%M:%S") if new_tx.transaction_date else ""
            }
        }
        await manager.broadcast(event_payload)
    except Exception as e:
        pass # Non-blocking WebSocket broadcast error safeguard

    return new_tx

from app.crud.auth import get_optional_current_user
from app.models.user import User

@router.get("/", response_model=list[TransactionResponse])
def read_transactions(skip: int = 0, limit: int = 100, vendor_id: int = None, customer_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(get_optional_current_user)):
    if current_user and current_user.role == "VENDOR":
        vendor_id = current_user.vendor_id
    return crud_transaction.get_transactions(db=db, skip=skip, limit=limit, vendor_id=vendor_id, customer_id=customer_id)

@router.get("/{transaction_id}", response_model=TransactionResponse)
def read_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = crud_transaction.get_transaction(db=db, transaction_id=transaction_id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction

