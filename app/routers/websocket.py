import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.ws_manager import manager
from app.database import get_db
from app.models import Product, Vendor, Customer, Transaction

router = APIRouter(tags=["Real-Time WebSockets"])

@router.websocket("/ws/sales")
async def websocket_sales_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint pushing real-time sales notifications to connected client dashboards.
    """
    await manager.connect(websocket)
    try:
        # Send initial welcome message
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to ShopSense Real-Time Sales Notification Stream",
            "timestamp": datetime.now().isoformat()
        })
        while True:
            # Keep connection open and receive ping messages if any
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "PONG", "timestamp": datetime.now().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@router.post("/ws/simulate-sale")
async def simulate_realtime_sale(db: Session = Depends(get_db)):
    """
    Utility endpoint to trigger/simulate a real-time sale notification across WebSockets.
    """
    product = db.query(Product).first()
    vendor = db.query(Vendor).filter(Vendor.id == product.vendor_id).first() if product else None
    customer = db.query(Customer).first()

    prod_name = product.product_name if product else "Wireless Noise-Canceling Headphones"
    vend_name = vendor.vendor_name if vendor else "TechGadgets Pro"
    cust_name = f"{customer.first_name} {customer.last_name}" if customer else "Alex Johnson"
    price = product.price if product else 2499.0

    qty = random.randint(1, 3)
    total_amount = round(qty * price, 2)
    sales_platform = random.choice(["ShopSense Direct", "Amazon", "Flipkart", "Myntra"])

    event_payload = {
        "type": "NEW_SALE",
        "data": {
            "transaction_id": random.randint(10000, 99999),
            "product_name": prod_name,
            "vendor_name": vend_name,
            "customer_name": cust_name,
            "quantity": qty,
            "total_amount": total_amount,
            "sales_platform": sales_platform,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }

    await manager.broadcast(event_payload)
    return {"status": "broadcast_sent", "event": event_payload}

