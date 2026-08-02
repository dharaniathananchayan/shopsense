# ShopSense API — Multi-Vendor E-Commerce Analytics Platform

ShopSense API transforms raw e-commerce data into actionable business intelligence. It provides a robust, scalable backend for managing multi-vendor marketplace data, enabling advanced analytics, sales tracking, and platform performance monitoring.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Python | Core language |
| FastAPI | Web Framework |
| SQLAlchemy | ORM |
| SQLite| Database |
| Uvicorn | ASGI Server |

## Getting Started

1. **Clone repo**
   ```bash
   git clone <repository_url>
   cd shopsense
   ```

2. **Create virtual environment** (Windows)
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Groq (optional, enables live AI descriptions)**
   Copy `.env.example` to `.env`, then add your key:
   ```powershell
   Copy-Item .env.example .env
   ```
   You can also set `GROQ_MODEL`; the default is `llama-3.1-8b-instant`.
   If no key is set, ShopSense uses a local fallback generator.

5. **Start server**
   ```bash
   uvicorn app.main:app --reload
   ```

6. **Seed sample data**
   ```bash
   python -m app.seed
   ```

6. **Open Swagger docs**
   Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) in your browser.

## API Endpoints

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| Vendors | POST | `/api/v1/vendors/` | Create a vendor |
| Vendors | GET | `/api/v1/vendors/` | List all vendors |
| Vendors | GET | `/api/v1/vendors/{vendor_id}` | Get vendor details |
| Vendors | PUT | `/api/v1/vendors/{vendor_id}` | Update a vendor |
| Vendors | DELETE | `/api/v1/vendors/{vendor_id}` | Delete a vendor |
| Products | POST | `/api/v1/products/` | Create a product |
| Products | GET | `/api/v1/products/` | List all products |
| Products | GET | `/api/v1/products/{product_id}` | Get product details |
| Products | PUT | `/api/v1/products/{product_id}` | Update a product |
| Products | DELETE | `/api/v1/products/{product_id}` | Delete a product |
| Customers| POST | `/api/v1/customers/` | Create a customer |
| Customers| GET | `/api/v1/customers/` | List all customers |
| Customers| GET | `/api/v1/customers/{customer_id}` | Get customer details |
| Customers| PUT | `/api/v1/customers/{customer_id}` | Update a customer |
| Customers| DELETE | `/api/v1/customers/{customer_id}` | Delete a customer |
| Transactions| POST | `/api/v1/transactions/` | Create a transaction |
| Transactions| GET | `/api/v1/transactions/` | List transactions |
| Transactions| GET | `/api/v1/transactions/{id}` | Get transaction details |
| Analytics| GET | `/api/v1/analytics/vendors/{id}/summary` | Vendor summary stats |
| Analytics| GET | `/api/v1/analytics/vendors/{id}/sales` | Vendor daily sales |
| Analytics| GET | `/api/v1/analytics/top-vendors` | Top vendors by revenue |
| Analytics| GET | `/api/v1/analytics/top-products` | Top products by quantity |
| Analytics| GET | `/api/v1/analytics/summary` | Overall platform summary |

## Database Schema

- **Vendor**: Represents marketplace sellers, tracks status and name.
- **Product**: Items sold by vendors, includes stock and pricing.
- **Customer**: Platform buyers, stores contact info.
- **Transaction**: Records of sales, linking customer, product, and vendor, with payment status.

## Project Structure

```text
shopsense/
├── app/
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── vendors.py
│   │   ├── products.py
│   │   ├── customers.py
│   │   ├── transactions.py
│   │   └── analytics.py
│   ├── crud/
│   ├── models/
│   ├── schemas/
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   └── seed.py
├── requirements.txt
└── README.md
```
