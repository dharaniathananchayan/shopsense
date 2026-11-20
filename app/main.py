from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.config import APP_TITLE, APP_VERSION, APP_DESCRIPTION
from app.database import engine, Base, apply_sqlite_migrations, SessionLocal
from app.routers import (
    vendors,
    products,
    customers,
    transactions,
    analytics,
    auth,
    ai,
    recommendations,
    forecasting,
    reviews,
    websocket,
    orders,
    wishlists,
)

# Create all tables
Base.metadata.create_all(bind=engine)
apply_sqlite_migrations()

# Auto-seed initial data and default users if missing
try:
    from app.models import Product, Vendor
    from app.models.user import User
    from app.seed import seed_data
    from app.utils.security import hash_password
    with SessionLocal() as db:
        if db.query(Product).count() == 0:
            seed_data()
        else:
            first_vendor = db.query(Vendor).first()
            v_id = first_vendor.id if first_vendor else None
            default_users = [
                ("johndoe@gmail.com", "John Doe", "ADMIN", None, "admin123"),
                ("janedoe@gmail.com", "Jane Doe", "VENDOR", v_id, "password123"),
                ("firstcustomer@gmail.com", "First Customer", "CUSTOMER", None, "password123"),
            ]
            for email, name, role, vendor_id, pwd in default_users:
                if not db.query(User).filter_by(email=email).first():
                    db.add(User(
                        email=email,
                        hashed_password=hash_password(pwd),
                        full_name=name,
                        role=role,
                        vendor_id=vendor_id,
                        approval_status="APPROVED",
                    ))
            db.commit()
except Exception as e:
    print(f"Auto-seed check notice: {e}")

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://shopsense-ebon.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Include routers with /api/v1 prefix
app.include_router(vendors.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(forecasting.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(wishlists.router, prefix="/api/v1")


frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

# Serve product images
import os
os.makedirs("app/static/images", exist_ok=True)
app.mount("/static/images", StaticFiles(directory="app/static/images"), name="images")

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to ShopSense API", "docs": "/docs", "version": APP_VERSION, "dashboard": "/dashboard"}

@app.get("/dashboard", include_in_schema=False)
def dashboard():
    react_index = frontend_dist / "index.html"
    if react_index.exists():
        return FileResponse(react_index)
    return {"message": "Frontend not built yet. Please run 'npm run build' inside the frontend directory, or run 'npm run dev' to launch the Vite dev server at http://localhost:5173."}
