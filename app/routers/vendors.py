from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.schemas.auth import UserResponse, VendorApprovalUpdate
from app.crud import vendor as crud_vendor
from app.crud.auth import require_role, get_pending_vendor_users, set_vendor_approval
from app.models.user import User

router = APIRouter(prefix="/vendors", tags=["Vendors"])

@router.get("/pending-users", response_model=list[UserResponse])
def read_pending_vendor_users(db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    return get_pending_vendor_users(db)

@router.patch("/users/{user_id}/approval", response_model=UserResponse)
def review_vendor_user(user_id: int, review: VendorApprovalUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    user = set_vendor_approval(db, user_id, review.approval_status)
    if not user:
        raise HTTPException(status_code=404, detail="Vendor account not found")
    return user

@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def create_vendor(vendor: VendorCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    return crud_vendor.create_vendor(db=db, vendor=vendor)

@router.get("/", response_model=list[VendorResponse])
def read_vendors(skip: int = 0, limit: int = 100, status: str = None, db: Session = Depends(get_db)):
    # Assuming crud_vendor.get_vendors accepts status
    return crud_vendor.get_vendors(db=db, skip=skip, limit=limit, status=status)

@router.get("/{vendor_id}", response_model=VendorResponse)
def read_vendor(vendor_id: int, db: Session = Depends(get_db)):
    db_vendor = crud_vendor.get_vendor(db=db, vendor_id=vendor_id)
    if db_vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return db_vendor

@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, vendor: VendorUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    db_vendor = crud_vendor.update_vendor(db=db, vendor_id=vendor_id, vendor_update=vendor)
    if db_vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return db_vendor

@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["ADMIN"]))):
    db_vendor = crud_vendor.delete_vendor(db=db, vendor_id=vendor_id)
    if not db_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor deleted successfully"}
