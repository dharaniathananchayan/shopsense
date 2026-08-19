from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from app.config import APP_TITLE, APP_VERSION, APP_DESCRIPTION
from app.database import engine, Base, apply_sqlite_migrations
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
)

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
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
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

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

@app.get("/", tags=["Root"])
def root():
    return {"message": "Welcome to ShopSense API", "docs": "/docs", "version": APP_VERSION, "dashboard": "/dashboard"}

@app.get("/dashboard", include_in_schema=False)
def dashboard():
    react_index = frontend_dist / "index.html"
    if react_index.exists():
        return FileResponse(react_index)
    return {"message": "Frontend not built yet. Please run 'npm run build' inside the frontend directory, or run 'npm run dev' to launch the Vite dev server at http://localhost:5173."}
