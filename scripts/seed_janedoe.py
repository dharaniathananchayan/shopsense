import os
import random
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Vendor, Product, ProductReview, Transaction, Customer
from app.models.user import User
from app.utils.security import hash_password

db = SessionLocal()

# 1. Create or get the vendor
vendor_email = "janedoe@gmail.com"
vendor = db.query(Vendor).filter_by(contact_email=vendor_email).first()

if not vendor:
    vendor = Vendor(
        vendor_name="Jane Doe Boutique",
        contact_email=vendor_email,
        status="ACTIVE"
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)

user = db.query(User).filter_by(email=vendor_email).first()
if not user:
    user = User(
        email=vendor_email,
        hashed_password=hash_password("password123"),
        full_name="Jane Doe",
        role="VENDOR",
        vendor_id=vendor.id,
        approval_status="APPROVED"
    )
    db.add(user)
    db.commit()

# 2. Seed Products for the vendor
product_names = [
    ("Artisan Ceramic Mug", "Home & Kitchen", 25.00),
    ("Hand-poured Soy Candle", "Home & Kitchen", 18.50),
    ("Vintage Denim Jacket", "Fashion", 85.00),
    ("Organic Cotton Tote", "Fashion", 22.00),
    ("Minimalist Gold Necklace", "Fashion", 120.00),
]

products_created = []
for name, cat, price in product_names:
    # Check if exists
    p = db.query(Product).filter_by(vendor_id=vendor.id, product_name=name).first()
    if not p:
        p = Product(
            vendor_id=vendor.id,
            product_name=name,
            category=cat,
            price=price,
            stock_quantity=random.randint(10, 50),
            is_active=True,
            approval_status="APPROVED"
        )
        db.add(p)
        db.commit()
        db.refresh(p)
    products_created.append(p)

# 3. Seed Customers (ensure we have some)
customers = db.query(Customer).limit(5).all()
if not customers:
    print("No customers found, skipping reviews/transactions")
else:
    # 4. Seed Transactions and Reviews
    now = datetime.utcnow()
    for p in products_created:
        for _ in range(random.randint(2, 5)):
            c = random.choice(customers)
            # Create Transaction
            qty = random.randint(1, 3)
            tx = Transaction(
                product_id=p.id,
                customer_id=c.id,
                vendor_id=vendor.id,
                quantity=qty,
                unit_price=p.price,
                total_amount=qty * p.price,
                payment_status="COMPLETED",
                sales_platform=random.choice(["ShopSense Direct", "Amazon", "Instagram"]),
                transaction_date=now - timedelta(days=random.randint(1, 40))
            )
            db.add(tx)
            
            # Create Review
            review_text = random.choice([
                "Absolutely love this! The quality is amazing.",
                "Good product, fast shipping.",
                "Looks great, exactly as described.",
                "A bit pricey but worth it for the craftsmanship.",
                "My new favorite item! Highly recommend Jane Doe's shop."
            ])
            rating = random.randint(4, 5)
            rev = ProductReview(
                product_id=p.id,
                customer_id=c.id,
                vendor_id=vendor.id,
                rating=rating,
                review_text=review_text,
                created_at=now - timedelta(days=random.randint(1, 30))
            )
            db.add(rev)

    db.commit()
    print("Seed complete for janedoe@gmail.com")
