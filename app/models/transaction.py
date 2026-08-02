from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    payment_status = Column(String(20), default="COMPLETED")
    sales_platform = Column(String(50), nullable=False, default="ShopSense Direct")
    transaction_date = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    vendor = relationship("Vendor", back_populates="transactions")
