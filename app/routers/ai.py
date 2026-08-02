from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import AIGenerateRequest, AIGenerateResponse, ProductWithAICreate
from app.schemas.product import ProductResponse
from app.services.ai_service import generate_ai_product_content
from app.crud.product import create_product
from app.schemas.product import ProductCreate
from app.crud.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI-Powered Product Descriptions (GenAI)"])

@router.post("/generate-description", response_model=AIGenerateResponse)
def generate_description(request: AIGenerateRequest):
    """
    Generate an SEO-optimized product description, key highlights, and SEO tags 
    using GenAI (Google Gemini or Smart GenAI Engine).
    """
    return generate_ai_product_content(
        product_name=request.product_name,
        category=request.category,
        keywords=request.keywords,
        target_audience=request.target_audience
    )

@router.post("/create-product-with-ai", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product_with_ai(
    request: ProductWithAICreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["VENDOR", "ADMIN"]))
):
    """
    Vendor Endpoint: Automatically generates an SEO description & tags using GenAI,
    then saves the product directly to the database catalog!
    Requires VENDOR or ADMIN authentication token.
    """
    # Verify vendor permissions
    if current_user.role == "VENDOR" and current_user.vendor_id and current_user.vendor_id != request.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Vendors can only create products for their own vendor account."
        )

    # Generate AI Content
    ai_content = generate_ai_product_content(
        product_name=request.product_name,
        category=request.category,
        keywords=request.keywords,
        target_audience=request.target_audience
    )
    
    # Combine description and tags
    formatted_description = (
        f"{ai_content['description']}\n\n"
        f"Key Highlights:\n" + "\n".join(ai_content['highlights']) + "\n\n"
        f"Tags: {' '.join(ai_content['seo_tags'])}"
    )

    product_schema = ProductCreate(
        vendor_id=request.vendor_id,
        product_name=request.product_name,
        description=formatted_description,
        category=request.category,
        price=request.price,
        stock_quantity=request.stock_quantity
    )

    return create_product(db, product_schema, approval_status="APPROVED")
