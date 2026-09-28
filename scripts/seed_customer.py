import sys
import os
from datetime import datetime, timedelta

# Add the project root to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.utils.security import hash_password

def seed_data():
    db = SessionLocal()
    try:
        # Create User
        email = "firstcustomer@gmail.com"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=hash_password("password123"),
                full_name="First Customer",
                role="CUSTOMER",
                approval_status="APPROVED"
            )
            db.add(user)
            db.commit()
            print(f"Created user {email}")

        # Create Customer
        customer = db.query(Customer).filter(Customer.email == email).first()
        if not customer:
            customer = Customer(
                first_name="First",
                last_name="Customer",
                email=email,
                phone="123-456-7890",
                address="123 Main St, Cityville"
            )
            db.add(customer)
            db.commit()
            print(f"Created customer profile {email}")

        # Seed Transactions
        # Let's add some varied orders: some PROCESSING, some SHIPPED, some DELIVERED.
        # Ensure we have these products (IDs 1, 2, 3, 5) which have images.
        transactions_to_add = [
            {"product_id": 1, "vendor_id": 1, "quantity": 1, "unit_price": 437.01, "status": "DELIVERED", "days_ago": 10},
            {"product_id": 2, "vendor_id": 1, "quantity": 1, "unit_price": 500.00, "status": "SHIPPED", "days_ago": 2},
            {"product_id": 5, "vendor_id": 2, "quantity": 2, "unit_price": 120.00, "status": "PROCESSING", "days_ago": 0},
            {"product_id": 3, "vendor_id": 1, "quantity": 1, "unit_price": 150.00, "status": "PROCESSING", "days_ago": 0}
        ]

        # Only add if customer has no transactions
        existing_txs = db.query(Transaction).filter(Transaction.customer_id == customer.id).count()
        if existing_txs == 0:
            for tx in transactions_to_add:
                t = Transaction(
                    product_id=tx["product_id"],
                    customer_id=customer.id,
                    vendor_id=tx["vendor_id"],
                    quantity=tx["quantity"],
                    unit_price=tx["unit_price"],
                    total_amount=tx["quantity"] * tx["unit_price"],
                    payment_status="COMPLETED",
                    order_status=tx["status"],
                    sales_platform="ShopSense Direct",
                    transaction_date=datetime.utcnow() - timedelta(days=tx["days_ago"])
                )
                db.add(t)
            db.commit()
            print("Seeded transactions for customer")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
