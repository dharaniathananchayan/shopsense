from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.product import Product
from app.models.transaction import Transaction
from app.schemas.recommendation import RecommendedProductResponse
from app.schemas.vector import (
    SemanticSearchRequest,
    SemanticSearchResponse,
    VectorRecommendationItem,
)
from app.services.vector_service import vector_engine

router = APIRouter(prefix="/recommendations", tags=["Recommendations & Vector Search Engine"])


# ---------------------------------------------------------------------------
# Endpoint 1: Top-selling products in a category
# ---------------------------------------------------------------------------

@router.get("/top-in-category", response_model=list[RecommendedProductResponse])
def top_in_category(
    category: str = Query(..., description="Product category to query"),
    limit: int = Query(5, ge=1, le=50, description="Max number of recommendations"),
    db: Session = Depends(get_db),
):
    """Return the top-selling products (by units sold) within a given category.

    Rule: rank by total quantity sold across all completed transactions.
    """
    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.product_name,
            Product.category,
            Product.price,
            Product.vendor_id,
            func.coalesce(func.sum(Transaction.quantity), 0).label("total_sold"),
        )
        .outerjoin(Transaction, Product.id == Transaction.product_id)
        .filter(
            Product.category == category,
            Product.is_active == True,
            (Transaction.payment_status == "COMPLETED") | (Transaction.id == None),
        )
        .group_by(
            Product.id,
            Product.product_name,
            Product.category,
            Product.price,
            Product.vendor_id,
        )
        .order_by(func.coalesce(func.sum(Transaction.quantity), 0).desc())
        .limit(limit)
        .all()
    )

    return [
        RecommendedProductResponse(
            product_id=r.product_id,
            product_name=r.product_name,
            category=r.category,
            price=r.price,
            vendor_id=r.vendor_id,
            total_sold=r.total_sold,
            score=float(r.total_sold),
            reason=f"Top selling product in the '{category}' category",
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Endpoint 2: "Customers who bought X also bought …" (collaborative filtering)
# ---------------------------------------------------------------------------

@router.get("/customers/{customer_id}/also-bought", response_model=list[RecommendedProductResponse])
def also_bought(
    customer_id: int,
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Collaborative-filtering recommendations via pure SQL.

    Rule:
      1. Find all products this customer has bought.
      2. Find other customers who bought those same products.
      3. Return the products those peer-customers bought (excluding what the
         target customer already has), ranked by co-purchase frequency.
    """
    # Step 1 – products the target customer has already purchased
    bought_subq = (
        db.query(Transaction.product_id)
        .filter(
            Transaction.customer_id == customer_id,
            Transaction.payment_status == "COMPLETED",
        )
        .subquery()
        .select()
    )

    # Step 2 – peer customers who bought those products
    peer_subq = (
        db.query(Transaction.customer_id)
        .filter(
            Transaction.product_id.in_(bought_subq),
            Transaction.customer_id != customer_id,
            Transaction.payment_status == "COMPLETED",
        )
        .distinct()
        .subquery()
        .select()
    )

    # Step 3 – products bought by peers that the target customer hasn't bought
    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.product_name,
            Product.category,
            Product.price,
            Product.vendor_id,
            func.count(Transaction.id).label("co_purchase_count"),
            func.coalesce(func.sum(Transaction.quantity), 0).label("total_sold"),
        )
        .join(Transaction, Product.id == Transaction.product_id)
        .filter(
            Transaction.customer_id.in_(peer_subq),
            Transaction.payment_status == "COMPLETED",
            Product.is_active == True,
            ~Product.id.in_(bought_subq),
        )
        .group_by(
            Product.id,
            Product.product_name,
            Product.category,
            Product.price,
            Product.vendor_id,
        )
        .order_by(func.count(Transaction.id).desc())
        .limit(limit)
        .all()
    )

    return [
        RecommendedProductResponse(
            product_id=r.product_id,
            product_name=r.product_name,
            category=r.category,
            price=r.price,
            vendor_id=r.vendor_id,
            total_sold=r.total_sold,
            score=float(r.co_purchase_count),
            reason=f"Customers who share your purchase history also bought this ({r.co_purchase_count} co-purchases)",
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Endpoint 3: Trending products by recent sales velocity
# ---------------------------------------------------------------------------

@router.get("/trending", response_model=list[RecommendedProductResponse])
def trending(
    days: int = Query(7, ge=1, le=365, description="Look-back window in days"),
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Return products with the highest sales velocity in the last N days.

    Rule: rank by total units sold within the look-back window.
    """
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.product_name,
            Product.category,
            Product.price,
            Product.vendor_id,
            func.coalesce(func.sum(Transaction.quantity), 0).label("total_sold"),
        )
        .join(Transaction, Product.id == Transaction.product_id)
        .filter(
            Transaction.payment_status == "COMPLETED",
            Transaction.transaction_date >= since,
            Product.is_active == True,
        )
        .group_by(
            Product.id,
            Product.product_name,
            Product.category,
            Product.price,
            Product.vendor_id,
        )
        .order_by(func.coalesce(func.sum(Transaction.quantity), 0).desc())
        .limit(limit)
        .all()
    )

    return [
        RecommendedProductResponse(
            product_id=r.product_id,
            product_name=r.product_name,
            category=r.category,
            price=r.price,
            vendor_id=r.vendor_id,
            total_sold=r.total_sold,
            score=float(r.total_sold),
            reason=f"Trending: {r.total_sold} units sold in the last {days} day(s)",
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Endpoint 4: Vector Semantic Search (Natural Language Embeddings)
# ---------------------------------------------------------------------------

@router.post("/semantic-search", response_model=SemanticSearchResponse)
def semantic_search(
    request: SemanticSearchRequest,
    db: Session = Depends(get_db),
):
    """
    AI Vector Embeddings Search:
    Converts natural language query into a high-dimensional semantic embedding vector
    and computes cosine similarity against all indexed catalog products in the Vector DB.
    """
    return vector_engine.semantic_search(
        db=db,
        query=request.query,
        limit=request.limit or 6,
        category=request.category,
        min_price=request.min_price,
        max_price=request.max_price,
    )


# ---------------------------------------------------------------------------
# Endpoint 5: Similar Products by Vector Distance (Nearest Neighbors)
# ---------------------------------------------------------------------------

@router.get("/vector/similar/{product_id}", response_model=list[VectorRecommendationItem])
def vector_similar_products(
    product_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Finds nearest vector neighbors for a product in semantic embedding space.
    """
    return vector_engine.get_similar_products(db=db, product_id=product_id, limit=limit)


# ---------------------------------------------------------------------------
# Endpoint 6: Customer Vector Recommendations (Taste Profile Centroid)
# ---------------------------------------------------------------------------

@router.get("/vector/customer/{customer_id}", response_model=list[VectorRecommendationItem])
def vector_customer_recommendations(
    customer_id: int,
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Computes customer's semantic preference vector centroid based on purchase history
    and queries the Vector DB for unpurchased high-affinity products.
    """
    return vector_engine.get_customer_vector_recommendations(db=db, customer_id=customer_id, limit=limit)


# ---------------------------------------------------------------------------
# Endpoint 7: Re-index Product Vector DB
# ---------------------------------------------------------------------------

@router.post("/reindex")
def reindex_vectors(db: Session = Depends(get_db)):
    """Rebuilds high-dimensional vector embeddings for all active catalog items."""
    vector_engine.index_catalog(db)
    return {
        "status": "success",
        "message": f"Successfully indexed {len(vector_engine.product_ids)} products into Vector DB.",
        "vector_dimension": vector_engine.product_vectors.shape[1] if vector_engine.product_vectors is not None else 0,
    }
