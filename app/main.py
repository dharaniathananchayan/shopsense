from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.config import APP_TITLE, APP_VERSION, APP_DESCRIPTION
from app.database import engine, Base, apply_sqlite_migrations
from app.routers import vendors, products, customers, transactions, analytics, auth, ai

# Create all tables
Base.metadata.create_all(bind=engine)
apply_sqlite_migrations()

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api/v1 prefix
app.include_router(vendors.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(transactions.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to ShopSense API", "docs": "/docs", "version": APP_VERSION}

@app.get("/dashboard", include_in_schema=False)
def dashboard():
    return FileResponse(Path(__file__).resolve().parent.parent / "dashboard.html")
