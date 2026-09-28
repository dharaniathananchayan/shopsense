from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.crud.auth import require_role
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.wishlist import Wishlist, WishlistItem

router = APIRouter(prefix="/wishlists", tags=["Wishlists"])

# Request/Response schemas
class WishlistCreate(BaseModel):
    name: str

class WishlistItemCreate(BaseModel):
    product_id: int

class WishlistItemAlertToggle(BaseModel):
    alerts_enabled: bool

@router.get("")
def get_my_wishlists(db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []
    
    wishlists = db.query(Wishlist).filter(Wishlist.customer_id == customer.id).all()
    results = []
    for w in wishlists:
        items = db.query(WishlistItem).filter(WishlistItem.wishlist_id == w.id).all()
        item_data = []
        for i in items:
            p = db.query(Product).filter(Product.id == i.product_id).first()
            if p:
                item_data.append({
                    "id": i.id,
                    "product_id": p.id,
                    "product_name": p.product_name,
                    "price": p.price,
                    "image_url": p.image_url,
                    "category": p.category,
                    "alerts_enabled": i.alerts_enabled,
                    "added_at": i.added_at
                })
        results.append({
            "id": w.id,
            "name": w.name,
            "created_at": w.created_at,
            "items": item_data
        })
    return results

@router.post("")
def create_wishlist(data: WishlistCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    w = Wishlist(customer_id=customer.id, name=data.name)
    db.add(w)
    db.commit()
    db.refresh(w)
    return {"id": w.id, "name": w.name, "items": []}

@router.delete("/{wishlist_id}")
def delete_wishlist(wishlist_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    w = db.query(Wishlist).filter(Wishlist.id == wishlist_id, Wishlist.customer_id == customer.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    db.delete(w)
    db.commit()
    return {"message": "Deleted"}

@router.post("/{wishlist_id}/items")
def add_to_wishlist(wishlist_id: int, data: WishlistItemCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    w = db.query(Wishlist).filter(Wishlist.id == wishlist_id, Wishlist.customer_id == customer.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wishlist not found")
        
    existing = db.query(WishlistItem).filter(WishlistItem.wishlist_id == w.id, WishlistItem.product_id == data.product_id).first()
    if existing:
        return {"message": "Already in wishlist"}
        
    item = WishlistItem(wishlist_id=w.id, product_id=data.product_id)
    db.add(item)
    db.commit()
    return {"message": "Added"}

@router.delete("/{wishlist_id}/items/{product_id}")
def remove_from_wishlist(wishlist_id: int, product_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    w = db.query(Wishlist).filter(Wishlist.id == wishlist_id, Wishlist.customer_id == customer.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Wishlist not found")
        
    item = db.query(WishlistItem).filter(WishlistItem.wishlist_id == w.id, WishlistItem.product_id == product_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed"}

@router.put("/items/{item_id}/alerts")
def toggle_alerts(item_id: int, data: WishlistItemAlertToggle, db: Session = Depends(get_db), current_user: User = Depends(require_role(["CUSTOMER"]))):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    item = db.query(WishlistItem).join(Wishlist).filter(WishlistItem.id == item_id, Wishlist.customer_id == customer.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
        
    item.alerts_enabled = data.alerts_enabled
    db.commit()
    return {"message": "Alerts updated"}
