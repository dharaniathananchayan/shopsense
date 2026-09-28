import os
import sys

# Add the root directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models.customer import Customer
from app.models.wishlist import Wishlist, WishlistItem
from app.models.product import Product

def seed_wishlists():
    with Session(engine) as db:
        customer = db.query(Customer).filter(Customer.email == "firstcustomer@gmail.com").first()
        if not customer:
            print("Customer firstcustomer@gmail.com not found!")
            return

        # Create "Summer Wardrobe" wishlist
        w1 = Wishlist(customer_id=customer.id, name="Summer Wardrobe")
        db.add(w1)
        db.commit()
        db.refresh(w1)

        # Add products to Summer Wardrobe
        products_summer = db.query(Product).filter(Product.id.in_([6, 7, 8, 22, 28])).all()
        for p in products_summer:
            item = WishlistItem(wishlist_id=w1.id, product_id=p.id, alerts_enabled=True)
            db.add(item)
            
        # Create "Tech Upgrades" wishlist
        w2 = Wishlist(customer_id=customer.id, name="Tech Upgrades")
        db.add(w2)
        db.commit()
        db.refresh(w2)

        # Add products to Tech Upgrades
        products_tech = db.query(Product).filter(Product.id.in_([1, 2, 3, 21])).all()
        for p in products_tech:
            item = WishlistItem(wishlist_id=w2.id, product_id=p.id, alerts_enabled=False)
            db.add(item)

        db.commit()
        print(f"Successfully seeded 2 wishlists with {len(products_summer) + len(products_tech)} items for firstcustomer@gmail.com.")

if __name__ == "__main__":
    seed_wishlists()
