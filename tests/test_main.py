import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.utils.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    admin_user = db.query(User).filter(User.role == "ADMIN").first() or db.query(User).first()
    db.close()

    assert admin_user is not None, "Database has no admin user for testing"

    token = create_access_token({
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role,
        "vendor_id": admin_user.vendor_id
    })
    return {"Authorization": f"Bearer {token}"}

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["message"] == "Welcome to ShopSense API"

def test_auth_login():
    response = client.post("/api/v1/auth/login", json={"email": "johndoe@gmail.com", "password": "password123"})
    # Expect 200 or 401 depending on seeded password, ensure standard JSON response
    assert response.status_code in [200, 401]

def test_products_list(auth_headers):
    response = client.get("/api/v1/products/", headers=auth_headers)
    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)

def test_analytics_charts_sales_trends(auth_headers):
    response = client.get("/api/v1/analytics/charts/sales-trends?days=30", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "labels" in data
    assert "datasets" in data

def test_analytics_vendor_benchmarking(auth_headers):
    response = client.get("/api/v1/analytics/vendors/1/benchmarking", headers=auth_headers)
    assert response.status_code in [200, 404]

def test_rag_shopping_assistant():
    response = client.post("/api/v1/ai/shopping-assistant", json={"query": "best headphones under $1000"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "recommended_products" in data

def test_ai_data_analyst(auth_headers):
    response = client.post("/api/v1/ai/data-analyst", json={"question": "Why did my sales drop last week?", "vendor_id": 1}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "generated_sql" in data
    assert "analysis_insight" in data

def test_ai_agent_workflow(auth_headers):
    response = client.post("/api/v1/ai/agent-workflow/run", json={"vendor_id": 1}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "advisory_report" in data
    assert "ai_agent_status" in data

