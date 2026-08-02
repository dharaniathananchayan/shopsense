from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate

def create_vendor(db: Session, vendor: VendorCreate) -> Vendor:
    existing = db.query(Vendor).filter(Vendor.contact_email == vendor.contact_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor with this contact email already exists")
    db_vendor = Vendor(**vendor.model_dump())
    db.add(db_vendor)
    try:
        db.commit()
        db.refresh(db_vendor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Vendor creation failed due to database constraint")
    return db_vendor

def get_vendor(db: Session, vendor_id: int) -> Vendor | None:
    return db.query(Vendor).filter(Vendor.id == vendor_id).first()

def get_vendors(db: Session, skip: int = 0, limit: int = 100, status: str | None = None) -> list[Vendor]:
    query = db.query(Vendor)
    if status:
        query = query.filter(Vendor.status == status)
    return query.offset(skip).limit(limit).all()

def update_vendor(db: Session, vendor_id: int, vendor_update: VendorUpdate) -> Vendor | None:
    db_vendor = get_vendor(db, vendor_id)
    if not db_vendor:
        return None
    update_data = vendor_update.model_dump(exclude_unset=True)
    if "contact_email" in update_data and update_data["contact_email"] != db_vendor.contact_email:
        existing = db.query(Vendor).filter(Vendor.contact_email == update_data["contact_email"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Contact email is already taken by another vendor")
    for key, value in update_data.items():
        setattr(db_vendor, key, value)
    try:
        db.commit()
        db.refresh(db_vendor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Vendor update failed due to database constraint")
    return db_vendor

def delete_vendor(db: Session, vendor_id: int) -> bool:
    db_vendor = get_vendor(db, vendor_id)
    if db_vendor:
        db.delete(db_vendor)
        db.commit()
        return True
    return False
