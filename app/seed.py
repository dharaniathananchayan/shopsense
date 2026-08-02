import random
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import Vendor, Product, Customer, Transaction


def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Vendor).first():
        print("Data already exists. Skipping seeding.")
        db.close()
        return

    print("Seeding data...")

    # --- Vendors ---
    vendors_data = [
        {"vendor_name": "TechGadgets Pro", "contact_email": "contact@techgadgetspro.com", "phone": "555-0101", "address": "123 Tech Ave, San Francisco, CA"},
        {"vendor_name": "Fashion Forward", "contact_email": "hello@fashionforward.com", "phone": "555-0102", "address": "456 Style St, New York, NY"},
        {"vendor_name": "Home Essentials", "contact_email": "info@homeessentials.com", "phone": "555-0103", "address": "789 Comfort Blvd, Chicago, IL"},
        {"vendor_name": "Sports Elite", "contact_email": "support@sportselite.com", "phone": "555-0104", "address": "321 Fitness Rd, Austin, TX"},
        {"vendor_name": "BookWorm Haven", "contact_email": "books@bookwormhaven.com", "phone": "555-0105", "address": "654 Library Ln, Seattle, WA"},
    ]

    vendors = []
    for vd in vendors_data:
        v = Vendor(**vd, status="ACTIVE")
        db.add(v)
        vendors.append(v)
    db.commit()
    for v in vendors:
        db.refresh(v)

    # --- Products ---
    product_names = {
        "Electronics": [
            "Wireless Bluetooth Earbuds", "Smart LED Monitor 27\"",
            "Mechanical Gaming Keyboard", "USB-C Hub Adapter"
        ],
        "Fashion": [
            "Premium Leather Jacket", "Classic Aviator Sunglasses",
            "Silk Evening Dress", "Canvas Sneakers"
        ],
        "Home & Kitchen": [
            "Stainless Steel Cookware Set", "Smart Air Purifier",
            "Memory Foam Pillow", "Bamboo Cutting Board"
        ],
        "Sports": [
            "Carbon Fiber Tennis Racket", "Yoga Mat Premium",
            "Adjustable Dumbbell Set", "Running Hydration Vest"
        ],
        "Books": [
            "The Art of Data Science", "Modern Python Cookbook",
            "Leadership in Tech", "Sci-Fi Anthology Collection"
        ],
    }

    categories = list(product_names.keys())
    products = []
    for i, category in enumerate(categories):
        vendor = vendors[i]
        for name in product_names[category]:
            p = Product(
                vendor_id=vendor.id,
                product_name=name,
                description=f"High-quality {category.lower()} product — {name}.",
                category=category,
                price=round(random.uniform(9.99, 499.99), 2),
                stock_quantity=random.randint(20, 200),
                is_active=True,
            )
            db.add(p)
            products.append(p)
    db.commit()
    for p in products:
        db.refresh(p)

    # --- Customers ---
    customer_names = [
        ("Alice", "Johnson"), ("Bob", "Smith"), ("Carol", "Davis"),
        ("David", "Wilson"), ("Emma", "Brown"), ("Frank", "Taylor"),
        ("Grace", "Anderson"), ("Henry", "Thomas"), ("Isabel", "Martinez"),
        ("Jack", "Robinson"),
    ]

    customers = []
    for i, (first, last) in enumerate(customer_names):
        c = Customer(
            first_name=first,
            last_name=last,
            email=f"{first.lower()}.{last.lower()}@example.com",
            phone=f"555-{1000 + i}",
        )
        db.add(c)
        customers.append(c)
    db.commit()
    for c in customers:
        db.refresh(c)

    # --- Transactions ---
    transactions = []
    for _ in range(50):
        p = random.choice(products)
        c = random.choice(customers)
        quantity = random.randint(1, 5)

        if p.stock_quantity >= quantity:
            p.stock_quantity -= quantity

            payment_status = random.choices(
                ["COMPLETED", "PENDING", "REFUNDED"], weights=[80, 10, 10]
            )[0]

            t = Transaction(
                product_id=p.id,
                customer_id=c.id,
                vendor_id=p.vendor_id,
                quantity=quantity,
                unit_price=p.price,
                total_amount=round(p.price * quantity, 2),
                payment_status=payment_status,
                transaction_date=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            )
            db.add(t)
            transactions.append(t)

    db.commit()

    print(f"Seeded successfully:")
    print(f"  - {len(vendors)} vendors")
    print(f"  - {len(products)} products")
    print(f"  - {len(customers)} customers")
    print(f"  - {len(transactions)} transactions")
    db.close()


if __name__ == "__main__":
    seed_data()
