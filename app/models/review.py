from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ProductReview(Base):
    __tablename__ = "product_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    rating = Column(Integer, nullable=False, default=5)
    reviewer_name = Column(String(100), nullable=True, default="Verified Customer")
    title = Column(String(200), nullable=True)
    review_text = Column(Text, nullable=False)
    sentiment_score = Column(Float, nullable=True)  # 0.0 to 100.0 or -1.0 to 1.0
    sentiment_label = Column(String(20), nullable=True)  # POSITIVE, NEUTRAL, NEGATIVE
    pros = Column(Text, nullable=True)  # JSON-encoded list of strings
    cons = Column(Text, nullable=True)  # JSON-encoded list of strings
    aspect_scores = Column(Text, nullable=True)  # JSON-encoded dict: {"quality": 90, "value": 85, "usability": 95}
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", backref="reviews")
    vendor = relationship("Vendor", backref="reviews")
    customer = relationship("Customer", backref="reviews")
