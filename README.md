# 🛒 ShopSense — Multi-Vendor E-Commerce Analytics & Intelligence Platform

ShopSense is an AI-powered multi-vendor e-commerce analytics and marketplace management platform. It transforms raw transactional data into actionable business intelligence using predictive machine learning models, vector semantic search, and LLM-driven seller assistance.

---

## 🛠 Tech Stack

### Backend Infrastructure & Data Models
- **Language**: Python 3.12
- **Framework**: **FastAPI** 0.110+ (Async RESTful endpoints & auto OpenAPI documentation)
- **Database & ORM**: **SQLAlchemy** 2.0 + SQLite (ACID compliant transactional database)
- **Authentication**: **PyJWT** (JSON Web Tokens) with **Passlib & Bcrypt** for Role-Based Access Control (RBAC)
- **Validation**: **Pydantic** v2 for request/response schema validation

### AI, Machine Learning & Analytics Stack
- **Generative AI & LLMs**: **Groq API** (`openai/gpt-oss-20b`, `qwen/qwen3.6-27b`, `allam-2-7b`, `groq/compound-mini`) via `httpx` with structured JSON output enforcement and local fallback engines.
- **Machine Learning & Time-Series Forecasting**: **`statsmodels`** & **`scikit-learn`**
  - **Models**: ARIMA(1,0,1) with Linear Trend, Holt's Exponential Smoothing, Adaptive Moving Average.
  - **Metrics & Safety Stock**: MAE, RMSE, MAPE evaluation metrics; Reorder Point (ROP) & Safety Stock calculation ($Z = 1.65$ for 95% service level).
- **Vector Database & Semantic Search**:
  - **Embeddings**: In-Memory Vector Engine using **`scikit-learn`** `TfidfVectorizer` ($1\text{--}2$ n-grams, 1024 max features).
  - **Similarity**: Cosine Similarity distance (`sklearn.metrics.pairwise.cosine_similarity`).
  - **Algorithms**: Natural Language Semantic Search, Customer Taste Centroid Vectors ($\vec{v}_{\text{cust}} = \frac{1}{N} \sum \vec{v}_{\text{sku}}$), and KNN Nearest Neighbors.
- **Data Manipulation**: **Pandas** & **NumPy**.

### Frontend Dashboard UI
- **Framework**: **React 19** + **Vite 8**
- **Routing & HTTP**: **React Router DOM v7**, **Axios** (interceptors for Bearer token management)
- **UI Design System**: Responsive CSS with CSS Custom Properties, cards, badges, and full-bleed data tables.

---

## 🎯 Milestones & Features Implemented

### 🚩 Milestone 1: Marketplace Foundation & Vendor Analytics (Weeks 1–2)
**Objective:** Establish core database architecture, marketplace CRUD operations, and basic vendor management workflows.

- ✅ **Base Requirements**:
  - **Database Schema**: Designed and implemented SQLAlchemy models for `Vendors`, `Products`, `Transactions`, `Customers`, `Users`, and `Reviews`.
  - **Vendor APIs**: REST endpoints for Vendor registration, profile retrieval, updates, and account lifecycle management (`/api/v1/vendors`).
  - **Sales & Revenue Aggregations**: Built analytical SQL endpoints for total vendor sales volume, revenue summary, top products, and daily performance metrics (`/api/v1/analytics`).
  - **Input Validation**: Strict schema validation using Pydantic models and database-level constraints.

- ✅ **Advanced / Optional Features**:
  - **Authentication & Authorization**: Implemented JWT authentication (`/api/v1/auth/login`, `/api/v1/auth/register`) supporting Role-Based Access Control (**Admin**, **Vendor**, **Customer**).
  - **AI-Powered Product Descriptions (GenAI)**: Integrated Groq LLM API to generate SEO-optimized product listings with taglines, structured marketing copy, highlights, hashtags, and AI SEO quality scores (includes offline fallback generator).

---

### 🚩 Milestone 2: Inventory Intelligence & Customer Analytics (Weeks 3–4)
**Objective:** Introduce predictive analytics, AI review intelligence, inventory forecasting, and vector-based recommendations.

- ✅ **Base Requirements**:
  - **Inventory Tracking APIs**: Real-time stock level monitoring, threshold alerts, out-of-stock badges, and restock tracking (`/api/v1/forecasting/inventory-alerts`, `/api/v1/products`).
  - **Customer Segmentation**: SQL-driven customer segmentation categorizing buyers into **VIP** ($\ge$ ₹10,000 spent), **Regular** (₹1,000–₹9,999), and **Occasional** (< ₹1,000) segments (`/api/v1/customers/segmentation`).
  - **Rule-Based Recommendations**: Implemented baseline recommendation endpoints:
    - *Top in Category* (ranked by units sold)
    - *Customers Also Bought* (co-purchase frequency matrix)
    - *Trending Velocity* (sales volume within configurable $N$-day window)
  - **Analytical Validation**: Validated metrics and sales series against historical transaction benchmarks.

- ✅ **Advanced / Optional Features**:
  - **Machine Learning Forecasting**: Time-series demand forecasting using **ARIMA** & **Holt's Exponential Smoothing** to predict 14-day sales demand, computing Reorder Points (ROP), Safety Stock, and Stockout Urgency (`/api/v1/forecasting/product/{id}`).
  - **LLM Sentiment Analysis**: Multi-aspect LLM analysis pipeline ([`sentiment_service.py`](file:///c:/Users/DHARANIA/OneDrive/Desktop/shop-sense/app/services/sentiment_service.py)) extracting sentiment scores (0–100), label classifications, pros/cons, aspect breakdowns (**Quality, Value, Usability, Durability**), and vendor action items.
  - **Vector Search Recommendations**: Dense TF-IDF vector embeddings with cosine similarity distance providing natural language semantic search, customer taste profile centroid recommendations, and KNN vector neighbors (`/api/v1/recommendations/semantic-search`).

### 🚩 Milestone 3: Advanced APIs & Reporting (Weeks 5–6)
**Objective:** Build out reporting infrastructure, Business Intelligence (BI) capabilities, real-time event streams, and RAG/Text-to-SQL GenAI assistance.

- ✅ **Base Requirements**:
  - **Frontend Chart Analytics Endpoints**: Standardized REST endpoints (`/api/v1/analytics/charts/sales-trends`, `/api/v1/analytics/charts/category-distribution`, `/api/v1/analytics/charts/vendor-performance`) serving pre-aggregated time-series and category revenue structures for frontend line, bar, and donut charts.
  - **Vendor Benchmarking Metrics**: Performance comparison endpoint (`/api/v1/analytics/vendors/{id}/benchmarking`) rating vendor revenue, order volume, AOV, and catalog size against marketplace means with performance ratio badging (*Outperforming*, *On Par*, *Underperforming*).
  - **CSV Data Export**: Streaming CSV generation (`/api/v1/analytics/export/sales-csv`, `/api/v1/analytics/vendors/{id}/export/sales-csv`) for instant one-click transaction report downloads (`text/csv`).

- ✅ **Advanced / Optional Features**:
  - **Real-Time Dashboards (WebSockets)**: Asynchronous FastAPI WebSocket subscription engine (`WS /api/v1/ws/sales`) and broadcast triggers (`POST /api/v1/ws/simulate-sale`) pushing live sales event notifications to React dashboard toasts without polling.
  - **RAG-Powered AI Shopping Assistant**: Natural language catalog chatbot API (`/api/v1/ai/shopping-assistant`) using SQLite retrieval and Groq/LLM generation to answer customer queries with recommendations grounded strictly in catalog inventory via a floating frontend drawer (`ShoppingAssistant.jsx`).
  - **AI Data Analyst (Text-to-SQL)**: Conversational BI query engine (`/api/v1/ai/data-analyst`) converting natural language seller questions into safe SQLite `SELECT` queries, executing them, and synthesizing executive business insights with clean formatted typography (`AIDataAnalyst.jsx`).

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
# Clone the workspace
cd shop-sense

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate   # Windows

# Install Python dependencies
pip install -r requirements.txt

# (Optional) Set up Environment Variables
# Create a .env file with your GROQ_API_KEY
GROQ_API_KEY=your_groq_api_key_here

# Seed initial database
python -m app.seed

# Launch backend server
uvicorn app.main:app --reload
```
Swagger UI docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies and build
npm install
npm run build

# Launch dev server
npm run dev
```
Vite frontend dev server will launch at [http://localhost:5173](http://localhost:5173).

---

## 📂 Project Structure

```text
shop-sense/
├── app/
│   ├── main.py                  # FastAPI entry point & route registration
│   ├── database.py              # SQLAlchemy engine & SQLite migration setup
│   ├── config.py                # Environment configuration
│   ├── models/                  # Database models (User, Vendor, Product, Customer, Transaction, Review)
│   ├── schemas/                 # Pydantic validation schemas
│   ├── crud/                    # Database query abstraction layer
│   ├── routers/                 # API Endpoints (auth, products, recommendations, forecasting, sentiment, websocket, etc.)
│   └── services/                # AI, ML & Vector engines
│       ├── ai_service.py        # Groq GenAI SEO listing generator
│       ├── forecasting_service.py # ARIMA & Holt Exponential Smoothing forecasting
│       ├── sentiment_service.py # LLM multi-aspect review sentiment analysis
│       ├── vector_service.py    # TF-IDF Cosine Vector DB & KNN Search
│       ├── ws_manager.py        # WebSocket ConnectionManager real-time sales stream
│       ├── rag_service.py       # Catalog RAG Shopping Assistant retriever & prompt engine
│       └── sql_analyst_service.py # Text-to-SQL query generator & business analyst
├── frontend/                    # React 19 + Vite dashboard application
│   ├── src/
│   │   ├── pages/               # Dashboard pages (Overview, Analytics, Inventory, Forecasting, Recommendations, etc.)
│   │   ├── components/          # Topbar, Sidebar, AIDataAnalyst, ShoppingAssistant components
│   │   └── index.css            # Responsive layout & design system
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```
