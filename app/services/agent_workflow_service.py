import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, Vendor, Transaction, ProductReview
from app.services.ai_service import GROQ_API_KEY, GROQ_MODEL, GROQ_CANDIDATE_MODELS

logger = logging.getLogger("shopsense.agent_workflow")

def run_autonomous_vendor_agent(db: Session, vendor_id: int) -> Dict[str, Any]:
    """
    Autonomous AI Agent Workflow:
    Executes automated store diagnostics on a vendor's products, sales velocity, and inventory.
    Generates proactive strategic advice (e.g. discounting slow-moving high-stock items, restocking alerts).
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise ValueError(f"Vendor #{vendor_id} not found.")

    # 1. Gather Vendor Catalog Inventory Metrics
    products = db.query(Product).filter(Product.vendor_id == vendor_id).all()
    if not products:
        return {
            "vendor_id": vendor_id,
            "vendor_name": vendor.vendor_name,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "advisory_reports": ["No active products found in catalog to audit."]
        }

    catalog_audit_data = []
    cutoff_date = datetime.now() - timedelta(days=14)

    for p in products:
        # Sales volume in last 14 days
        sales_14d = db.query(func.sum(Transaction.quantity)).filter(
            Transaction.product_id == p.id,
            Transaction.payment_status == "COMPLETED",
            Transaction.transaction_date >= cutoff_date
        ).scalar() or 0

        # Review score average
        avg_rating = db.query(func.avg(ProductReview.rating)).filter(ProductReview.product_id == p.id).scalar() or 0.0

        catalog_audit_data.append({
            "product_id": p.id,
            "product_name": p.product_name,
            "category": p.category or "General",
            "price": p.price,
            "stock_quantity": p.stock_quantity,
            "sales_last_14_days": sales_14d,
            "avg_rating": round(float(avg_rating), 1)
        })

    # 2. Autonomous Analysis Rules Engine
    automated_flags = []
    for item in catalog_audit_data:
        # High stock + Low sales -> Discount Advisory
        if item["stock_quantity"] >= 50 and item["sales_last_14_days"] <= 3:
            suggested_discount_price = round(item["price"] * 0.85, 2)
            automated_flags.append(
                f"ACTIONABLE DISCOUNT: '{item['product_name']}' has high inventory ({item['stock_quantity']} units) "
                f"and low 14-day velocity ({item['sales_last_14_days']} sales). Recommend reducing price from ₹{item['price']} to ₹{suggested_discount_price} (15% off) to liquidate stock."
            )
        # Low stock + High sales -> Restock Advisory
        elif item["stock_quantity"] <= 15 and item["sales_last_14_days"] >= 10:
            automated_flags.append(
                f"RESTOCK URGENCY: '{item['product_name']}' has low stock ({item['stock_quantity']} units) "
                f"but high demand ({item['sales_last_14_days']} sales in 14 days). Urgently restock to prevent stockouts."
            )

    # 3. LLM Executive Synthesis Prompt
    prompt = f"""You are an Autonomous AI Store Operations Agent for ShopSense Vendor: '{vendor.vendor_name}'.
Catalog Audit Data: {json.dumps(catalog_audit_data)}
Rule Flags Detected: {json.dumps(automated_flags)}

Task: Write a proactive weekly strategic advisory report for the vendor.
1. Highlight specific pricing, discount, and restocking recommendations.
2. Format output as clear, presentable bullet points using (•).
3. Do NOT use markdown asterisks (* or **)."""

    advisory_report = None
    if GROQ_API_KEY:
        import httpx
        for model in GROQ_CANDIDATE_MODELS:
            try:
                response = httpx.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are an autonomous e-commerce advisor. Output clean text with bullet points (•). Never output markdown asterisks."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.3,
                    },
                    timeout=15.0,
                )
                response.raise_for_status()
                advisory_report = response.json()["choices"][0]["message"]["content"].strip().replace("*", "")
                break
            except Exception as e:
                logger.warning(f"Groq Autonomous Agent call failed: {e}")
                continue

    if not advisory_report:
        advisory_report = "\n".join(automated_flags if automated_flags else [
            "• All product stock levels and sales velocities are operating within optimal parameters.",
            "• Continue monitoring daily orders and customer feedback."
        ])

    return {
        "vendor_id": vendor_id,
        "vendor_name": vendor.vendor_name,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "audit_data": catalog_audit_data,
        "advisory_report": advisory_report,
        "ai_agent_status": "COMPLETED_PROACTIVE_AUDIT"
    }
