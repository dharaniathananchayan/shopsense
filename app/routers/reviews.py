import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.product import Product
from app.models.review import ProductReview
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewAnalyzeRequest,
    ReviewAnalyzeResponse,
    ProductSentimentSummaryResponse,
)
from app.services.sentiment_service import (
    analyze_review_text,
    aggregate_product_sentiment,
)

router = APIRouter(prefix="/reviews", tags=["LLM Sentiment Analysis & Reviews"])


def _format_review_model(r: ProductReview) -> dict:
    """Safely convert database ProductReview to dictionary with decoded JSON fields."""
    pros = []
    cons = []
    aspects = {}
    if r.pros:
        try:
            pros = json.loads(r.pros) if isinstance(r.pros, str) else r.pros
        except Exception:
            pros = [r.pros]
    if r.cons:
        try:
            cons = json.loads(r.cons) if isinstance(r.cons, str) else r.cons
        except Exception:
            cons = [r.cons]
    if r.aspect_scores:
        try:
            aspects = json.loads(r.aspect_scores) if isinstance(r.aspect_scores, str) else r.aspect_scores
        except Exception:
            aspects = {}

    return {
        "id": r.id,
        "product_id": r.product_id,
        "vendor_id": r.vendor_id,
        "customer_id": r.customer_id,
        "reviewer_name": r.reviewer_name or "Verified Customer",
        "rating": r.rating,
        "title": r.title,
        "review_text": r.review_text,
        "sentiment_score": r.sentiment_score,
        "sentiment_label": r.sentiment_label,
        "pros": pros,
        "cons": cons,
        "aspect_scores": aspects,
        "summary": r.summary,
        "created_at": r.created_at,
    }


@router.post("/analyze", response_model=ReviewAnalyzeResponse)
def analyze_text(request: ReviewAnalyzeRequest):
    """
    Live LLM Sentiment Pipeline:
    Analyzes raw review text using Groq (Llama-3.1-8b-instant), extracting sentiment score,
    top pros, top cons, aspect breakdown, and actionable vendor recommendations.
    """
    try:
        return analyze_review_text(
            text=request.text,
            product_name=request.product_name or "Product",
            category=request.category or "General",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM Sentiment extraction failed: {str(exc)}")


@router.get("/product/{product_id}/summary", response_model=ProductSentimentSummaryResponse)
def get_product_sentiment_summary(product_id: int, db: Session = Depends(get_db)):
    """
    Returns aggregated LLM customer sentiment analysis, top pros/cons, and vendor actions for a product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    reviews = db.query(ProductReview).filter(ProductReview.product_id == product_id).all()
    return aggregate_product_sentiment(
        product_id=product.id,
        product_name=product.product_name,
        category=product.category or "General",
        reviews=reviews,
    )


@router.get("/product/{product_id}", response_model=List[ReviewResponse])
def get_product_reviews(
    product_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all customer reviews for a given product with parsed pros, cons, and sentiment scores."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    reviews = (
        db.query(ProductReview)
        .filter(ProductReview.product_id == product_id)
        .order_by(ProductReview.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_format_review_model(r) for r in reviews]


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_review(request: ReviewCreate, db: Session = Depends(get_db)):
    """
    Submit a new customer review. Automatically passes the review through the Groq LLM
    pipeline to extract sentiment score, sentiment label, pros, cons, aspect ratings, and summary.
    """
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Run AI sentiment extraction
    ai_result = analyze_review_text(
        text=f"{request.title or ''}. {request.review_text}",
        product_name=product.product_name,
        category=product.category or "General",
    )

    review = ProductReview(
        product_id=product.id,
        vendor_id=product.vendor_id,
        rating=request.rating,
        reviewer_name=request.reviewer_name or "Verified Customer",
        title=request.title,
        review_text=request.review_text,
        sentiment_score=ai_result["sentiment_score"],
        sentiment_label=ai_result["sentiment_label"],
        pros=json.dumps(ai_result["pros"]),
        cons=json.dumps(ai_result["cons"]),
        aspect_scores=json.dumps(ai_result["aspect_scores"]),
        summary=ai_result["summary"],
    )

    db.add(review)
    db.commit()
    db.refresh(review)
    return _format_review_model(review)
