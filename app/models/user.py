from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(100), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default="VENDOR", nullable=False)  # ADMIN, VENDOR, CUSTOMER
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    approval_status = Column(String(20), default="APPROVED", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", backref="user_account", uselist=False)
