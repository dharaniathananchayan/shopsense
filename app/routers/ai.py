from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ai import (
    AIGenerateRequest,
    AIGenerateResponse,
    ProductWithAICreate,
    ShoppingAssistantRequest,
    ShoppingAssistantResponse,
    DataAnalystRequest,
    DataAnalystResponse,
    AgentWorkflowRequest,
    AgentWorkflowResponse,
)
from app.schemas.product import ProductResponse
from app.services.ai_service import generate_ai_product_content
from app.services.rag_service import run_rag_shopping_assistant
from app.services.sql_analyst_service import run_ai_data_analyst
from app.services.agent_workflow_service import run_autonomous_vendor_agent
from app.crud.product import create_product
from app.schemas.product import ProductCreate
from app.crud.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI & BI Features (GenAI, RAG, Text-to-SQL, AI Agents)"])

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


@router.post("/shopping-assistant", response_model=ShoppingAssistantResponse)
def shopping_assistant(
    request: ShoppingAssistantRequest,
    db: Session = Depends(get_db),
):
    """
    RAG-Powered AI Shopping Assistant:
    Customers can ask natural language questions (e.g., "What's the best laptop for video editing under $1000?")
    and the AI retrieves matching products from the actual catalog and generates an accurate recommendation.
    """
    return run_rag_shopping_assistant(
        db=db,
        query=request.query,
        price_max=request.price_max
    )


@router.post("/data-analyst", response_model=DataAnalystResponse)
def ai_data_analyst(
    request: DataAnalystRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "VENDOR"])),
):
    """
    AI Data Analyst (Text-to-SQL):
    Vendors & Admins can ask natural language questions about sales data (e.g., "Why did my sales drop last week?")
    and the system generates safe SQL queries, executes them, and returns analytical insights.
    """
    vendor_id = request.vendor_id
    if current_user.role == "VENDOR":
        vendor_id = current_user.vendor_id

    return run_ai_data_analyst(
        db=db,
        question=request.question,
        vendor_id=vendor_id
    )


@router.post("/agent-workflow/run", response_model=AgentWorkflowResponse)
def run_agent_workflow(
    request: AgentWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "VENDOR"])),
):
    """
    Autonomous AI Agent Workflow:
    Runs proactive weekly catalog diagnostics on a vendor's store and generates strategic advice 
    (e.g., discounting slow-moving inventory, stockout warnings).
    """
    vendor_id = request.vendor_id
    if current_user.role == "VENDOR":
        vendor_id = current_user.vendor_id

    try:
        return run_autonomous_vendor_agent(db=db, vendor_id=vendor_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


from fastapi import UploadFile, File, Form
from typing import Optional
from app.services.ai_service import analyze_product_image

@router.post("/generate-description-with-image")
async def generate_description_with_image(
    product_name: str = Form(...),
    category: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),
    target_audience: Optional[str] = Form("General customers"),
    file: UploadFile = File(...)
):
    # Analyze image
    image_bytes = await file.read()
    image_analysis = analyze_product_image(image_bytes)
    
    # Use image category if not provided
    final_category = category or image_analysis.get("category", "General")
    # Append image tags to keywords
    image_tags = image_analysis.get("tags", "")
    final_keywords = f"{keywords}, {image_tags}" if keywords else image_tags
    
    # Generate description
    result = generate_ai_product_content(
        product_name=product_name,
        category=final_category,
        keywords=final_keywords,
        target_audience=target_audience
    )
    
    result["category"] = final_category
    return result
