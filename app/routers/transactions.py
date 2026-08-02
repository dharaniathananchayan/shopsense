from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.crud import transaction as crud_transaction

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    # The crud function handles stock validation and price computation
    return crud_transaction.create_transaction(db=db, transaction=transaction)

@router.get("/", response_model=list[TransactionResponse])
def read_transactions(skip: int = 0, limit: int = 100, vendor_id: int = None, customer_id: int = None, db: Session = Depends(get_db)):
    return crud_transaction.get_transactions(db=db, skip=skip, limit=limit, vendor_id=vendor_id, customer_id=customer_id)

@router.get("/{transaction_id}", response_model=TransactionResponse)
def read_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = crud_transaction.get_transaction(db=db, transaction_id=transaction_id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction
