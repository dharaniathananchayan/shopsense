# 🛒 ShopSense — AI-Powered Multi-Vendor E-Commerce Platform

ShopSense is a next-generation multi-vendor e-commerce analytics and marketplace management platform. It transforms raw transactional data into actionable business intelligence using predictive machine learning models, vector semantic search, and LLM-driven seller assistance.

---

## ✨ Key Features

### 🧠 Generative AI & Autonomous Agents
- **AI Studio**: Generate SEO-optimized product listings with taglines, structured marketing copy, highlights, hashtags, and AI SEO quality scores instantly.
- **AI Data Analyst**: Conversational BI query engine converting natural language seller questions into safe SQLite `SELECT` queries, generating interactive charts, and synthesizing executive insights.
- **RAG-Powered Shopping Assistant**: Natural language catalog chatbot grounded strictly in live inventory to answer customer queries with targeted recommendations via a floating UI.
- **Autonomous Store Diagnostics**: Proactive AI agent workflow that autonomously audits vendor inventory velocity and generates actionable pricing advisories and stockout warnings.

### 📊 Analytics & Business Intelligence
- **Vendor Benchmarking**: Performance comparison engine rating vendor revenue, order volume, AOV, and catalog size against marketplace averages.
- **Interactive Dashboards**: Real-time analytics covering category revenue distribution, sales trends, and platform performance.
- **Real-Time Sales Streams**: Asynchronous WebSocket event streams pushing live transaction notifications to the dashboard without polling.
- **Sentiment Analysis**: Multi-aspect LLM analysis extracting sentiment scores (0–100), label classifications, pros/cons, and aspect breakdowns from customer reviews.

### 📈 Machine Learning & Forecasting
- **Time-Series Demand Forecasting**: Implements **ARIMA** & **Holt's Exponential Smoothing** models to predict 14-day sales demand.
- **Inventory Intelligence**: Automated computation of Reorder Points (ROP), Safety Stock, and Stockout Urgency based on lead times and demand velocity.

### 🎯 Discovery & Personalization
- **Vector Semantic Search**: Dense TF-IDF embeddings with cosine similarity distance providing natural language semantic search.
- **Customer Taste Centroids**: Calculative vectors tracking customer purchase behavior to surface unbought high-affinity SKUs.
- **Nearest Neighbors (KNN)**: "Similar Products" discovery via multi-dimensional cosine distance across the catalog.
- **Rule-Based Recommendations**: Top in Category, Customers Also Bought (Collaborative Filtering), and Trending Velocity.

---

## 🛠 Tech Stack

**Backend:**
- **Language**: Python 3.12
- **Framework**: **FastAPI** (Async REST, WebSockets, OpenAPI)
- **Database**: **SQLAlchemy** 2.0 + SQLite
- **Security**: **PyJWT** & **Bcrypt** (RBAC)
- **AI Models**: **Groq API** (`openai`, `qwen`, `allam`)

**Frontend:**
- **Framework**: **React 19** + **Vite 8**
- **State & Routing**: **React Router DOM v7**
- **Styling**: Custom CSS properties, responsive grids, full-bleed tables.

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

### 3. Running with Docker
```bash
# Build and run containerized application via Docker Compose
docker-compose up --build
```

---

## 📂 Project Structure

```text
shop-sense/
├── .github/workflows/   # CI/CD pipelines
├── app/
│   ├── main.py          # FastAPI entry point
│   ├── models/          # SQLAlchemy database models
│   ├── routers/         # REST API endpoints
│   └── services/        # AI, ML, and Vector engines
│       ├── ai_service.py
│       ├── forecasting_service.py
│       ├── sentiment_service.py
│       ├── vector_service.py
│       ├── rag_service.py
│       └── sql_analyst_service.py
├── frontend/            # React 19 SPA
├── tests/               # Pytest unit tests
├── Dockerfile           # Multi-stage production build
└── docker-compose.yml   # Container orchestration
```
