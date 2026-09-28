# 🛒 ShopSense — AI-Powered Multi-Vendor E-Commerce Platform

ShopSense is an enterprise-grade multi-vendor e-commerce platform and analytics engine. It combines an intuitive customer shopping experience with vendor catalog tools, time-series demand forecasting, vector semantic search, and an autonomous generative AI intelligence suite.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🌟 Architecture & Core Modules

ShopSense provides dedicated interfaces tailored for three distinct user roles: **Customers**, **Vendors**, and **Administrators**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ShopSense React 19 Frontend                      │
├────────────────────┬──────────────────────┬────────────────────────────┤
│   Customer Store   │    Vendor Portal     │     Admin / Analytics      │
│  • Browse & Search │  • Catalog & Images  │  • Platform Health         │
│  • Cart & Checkout │  • Inventory & ROP   │  • Vendor Approvals        │
│  • Orders & Alerts │  • Benchmarks        │  • AI Data Analyst (SQL)   │
│  • Wishlist & Comp │  • AI Listing Gen    │  • Real-Time WS Stream     │
└─────────┬──────────┴──────────┬───────────┴─────────────┬──────────────┘
          │                     │                         │
          ▼                     ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FastAPI REST & WebSocket API                     │
├────────────────────┬──────────────────────┬────────────────────────────┤
│   Authentication   │    AI & LLM Services │     Machine Learning       │
│  • JWT RBAC        │  • Vision AI Lab     │  • ARIMA & Holt Smoothing  │
│  • Multi-Tab Sync  │  • RAG Chatbot       │  • TF-IDF Vector Search    │
│  • Role Guards     │  • Sentiment Aspects │  • Taste Centroids (KNN)   │
└─────────┬──────────┴──────────┬───────────┴─────────────┬──────────────┘
          │                     │                         │
          ▼                     ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SQLite / SQLAlchemy 2.0 Database                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Feature Breakdown

### 🛍️ 1. Customer Shopping Experience
- **Interactive Storefront (`/shop`)**: Multi-faceted product catalog featuring category filters, price range sliders, instant search, and grid/list view toggles.
- **Product Detail View (`/product/:id`)**: High-res image display, stock availability indicators, customer review breakdowns, and direct cart/wishlist integration.
- **Shopping Cart & Checkout Simulator (`/cart`)**: Persistent cart management with live item quantity updates, subtotal and tax computations, and one-click mock checkout.
- **Order Management & Tracking (`/orders`)**: Comprehensive order history displaying order statuses (`PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`), delivery details, and self-service order cancellation.
- **Themed Wishlists & Price Drop Alerts (`/wishlists`)**: Group saved items across custom wishlists, track real-time price reductions, and toggle active email/notification alerts.
- **Product Comparison Engine (`/compare`)**: Side-by-side comparison matrix with automated attribute matching, pricing contrast, and LLM-generated **AI Consensus** summaries.
- **Personalized "You Might Like" (`/you-might-like`)**: Machine learning recommendation feed powered by customer taste centroids and collaborative purchasing patterns.

### 🏪 2. Vendor Catalog & Operations
- **Product Catalog Management (`/products`)**: Filter by vendor, edit product specifications in-place, and upload or remove high-resolution product media.
- **Vision AI Studio (`/ai-studio`)**: Upload raw product photos to automatically detect categories, write SEO-optimized marketing copy, extract bullet highlights, generate hashtags, and calculate AI listing quality scores.
- **Vendor Benchmarking**: Gauge individual vendor performance against platform averages across revenue, order velocity, Average Order Value (AOV), and catalog size.
- **Inventory Intelligence**: Dynamic calculation of **Reorder Points (ROP)**, safety stock thresholds, and stockout urgency warnings based on historical lead times and sales velocity.

### 🧠 3. Autonomous AI & Analytics Suite
- **AI Data Analyst (`/analyst`)**: Conversational business intelligence engine converting natural language questions into safe, parameterized SQLite `SELECT` queries, accompanied by interactive charts and executive insights.
- **RAG-Powered Shopping Assistant**: Catalog chatbot grounded strictly in live inventory data using Retrieval-Augmented Generation to assist shoppers directly via a floating chat widget.
- **Autonomous Store Diagnostics**: Proactive audit workflow identifying dormant inventory, negative margin items, and imminent stockout risks with recommended pricing adjustments.
- **Review Sentiment Engine**: Multi-aspect LLM analysis scoring customer feedback (0–100), detecting overall sentiment labels, and isolating product pros and cons.
- **Real-Time Sales Stream (`/ws/sales`)**: Asynchronous WebSocket event broadcasting live sales transactions directly to dashboard subscriber cards.

### 🔍 4. Discovery & Recommendation Models
- **Vector Semantic Search**: Dense TF-IDF vector embeddings with cosine similarity distance matching natural language shopper intent beyond keyword matching.
- **Taste Centroids**: Vectorized customer affinity profiles generated from previous order history to surface high-affinity catalog items.
- **Collaborative Filtering & Velocity**: "Customers Also Bought" co-occurrence recommendations and high-velocity trending products.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.12, **FastAPI**, SQLAlchemy 2.0, Pydantic v2, Uvicorn, SQLite |
| **Frontend** | **React 19**, **Vite 6**, React Router DOM v7, Axios, Lucide Icons, Custom Design System |
| **Generative AI** | **Groq API** (`openai`, `qwen`, `allam`), Vision AI Models, RAG Pipelines |
| **Forecasting & ML** | Statsmodels (**ARIMA**, **Holt's Exponential Smoothing**), Scikit-Learn (TF-IDF, Cosine Similarity) |
| **Auth & Security** | JWT (PyJWT), Passlib (Bcrypt), Cross-tab storage listeners, RBAC Role Dependencies |
| **DevOps & Containers**| Docker, Docker Compose, GitHub Actions |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+** (Python 3.12 recommended)
- **Node.js 18+** & **npm**
- *(Optional)* **Groq API Key** for AI features

---

### 1. Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/dharaniathananchayan/shopsense.git
cd shopsense

# 2. Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Copy sample env or create a .env file:
cp .env.example .env
```

Ensure your `.env` contains:
```env
DATABASE_URL=sqlite:///./shopsense.db
JWT_SECRET_KEY=replace-with-a-long-random-secret
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

```bash
# 5. Seed the database with products, reviews, and test users
python -m app.seed
python scripts/seed_janedoe.py
python scripts/seed_customer.py

# 6. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The application will launch at [http://localhost:5173](http://localhost:5173).

---

### 3. Preconfigured Demo Accounts

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `johndoe@gmail.com` | `admin123` | Full dashboard, AI Analyst, vendor approvals, platform metrics |
| **Vendor** | `janedoe@gmail.com` | `password123` | Catalog editing, image upload, AI Studio, store diagnostics, ROP |
| **Customer** | `firstcustomer@gmail.com` | `password123` | Storefront, cart, checkout, order history, wishlists, compare |

---

### 4. Running with Docker Compose

To spin up both frontend and backend in isolated production containers:

```bash
docker-compose up --build
```
Access the application at [http://localhost:8000](http://localhost:8000).

---

## 📂 Repository Structure

```text
shopsense/
├── app/
│   ├── main.py                  # FastAPI application entry point & CORS
│   ├── config.py                # App configuration & environment loader
│   ├── database.py              # SQLAlchemy engine & session factory
│   ├── models/                  # Database schemas (User, Product, Order, Wishlist, etc.)
│   ├── schemas/                 # Pydantic request & response validation schemas
│   ├── routers/                 # Modular API endpoints
│   │   ├── auth.py              # JWT login, registration & /me profile
│   │   ├── products.py          # Catalog CRUD, image uploads & inventory metrics
│   │   ├── orders.py            # Customer order lifecycle & history
│   │   ├── wishlists.py         # Multi-wishlist & price alert toggles
│   │   ├── ai.py                # AI Studio, diagnostics & natural language prompts
│   │   ├── analytics.py         # Vendor benchmarking & executive summaries
│   │   ├── recommendations.py   # Vector search & centroid personalization
│   │   └── websocket.py         # Live sales notification streams
│   ├── services/                # Core AI, ML, and Vector algorithms
│   │   ├── ai_service.py        # Vision AI & product copy generator
│   │   ├── forecasting_service.py # ARIMA & Holt demand forecaster
│   │   ├── sentiment_service.py # Aspect-based review sentiment extractor
│   │   ├── vector_service.py    # TF-IDF embeddings & cosine similarity
│   │   ├── rag_service.py       # Inventory-grounded RAG shopping assistant
│   │   └── sql_analyst_service.py # Text-to-SQL business analyst engine
│   └── static/images/           # Product media assets & uploads
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routes & role-guarded views
│   │   ├── api.js               # Axios client with JWT interceptor
│   │   ├── context/             # Global Auth, Cart, and Compare state providers
│   │   ├── components/          # Topbar, Sidebar, Chatbot, Modals
│   │   └── pages/               # Views: Shop, ProductDetail, Cart, Orders,
│   │                            # Wishlists, Compare, YouMightLike, Products,
│   │                            # AIStudio, Analyst, Inventory, Analytics
│   ├── vite.config.js           # Vite server & API proxy config
│   └── package.json
├── scripts/                     # Seeders & data migration utilities
├── requirements.txt             # Python backend dependencies
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Multi-container orchestration
└── README.md
```

---

## 🧪 Testing

Run test suites for the backend services:

```bash
# Run pytest across all test modules
pytest tests/ -v
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
