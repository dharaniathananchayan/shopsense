import re
import json
import logging
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Product, Vendor, ProductReview
from app.services.ai_service import GROQ_API_KEY, GROQ_MODEL, GROQ_CANDIDATE_MODELS

logger = logging.getLogger("shopsense.rag")

def _parse_max_price(query: str) -> Optional[float]:
    """Extract numeric budget/price limit from user query (e.g., 'under $1000', 'under 5000', 'below ₹2000')."""
    match = re.search(r'(?:under|below|less than|max|budget)\s*(?:[\$₹Rs\.]*\s*)(\d+(?:\.\d+)?)', query, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None

def retrieve_relevant_products(db: Session, query: str, price_max: Optional[float] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """Retrieve top catalog products matching keywords, categories, and price constraints."""
    query_lower = query.lower()
    extracted_price = _parse_max_price(query)
    effective_max_price = price_max if price_max is not None else extracted_price

    all_products = db.query(Product).filter(Product.is_active == True, Product.approval_status == "APPROVED").all()
    if not all_products:
        # Fallback to any products if none explicitly marked APPROVED
        all_products = db.query(Product).all()

    scored_products = []
    keywords = [w.strip() for w in re.findall(r'\w+', query_lower) if len(w) > 2]

    for p in all_products:
        # Skip if above requested price cap
        if effective_max_price and p.price > effective_max_price:
            continue

        score = 0
        p_name = p.product_name.lower()
        p_desc = (p.description or "").lower()
        p_cat = (p.category or "").lower()

        # Score matching keywords
        for kw in keywords:
            if kw in p_name:
                score += 5
            if kw in p_cat:
                score += 3
            if kw in p_desc:
                score += 1

        scored_products.append((score, p))

    # Sort by relevance score desc, then price asc
    scored_products.sort(key=lambda x: (x[0], -x[1].price), reverse=True)
    top_matches = [p for _, p in scored_products[:limit]]

    results = []
    for p in top_matches:
        vendor_name = p.vendor.vendor_name if p.vendor else "Unknown Vendor"
        results.append({
            "product_id": p.id,
            "product_name": p.product_name,
            "category": p.category or "General",
            "price": p.price,
            "stock_quantity": p.stock_quantity,
            "vendor_name": vendor_name,
            "description": p.description or "High quality product.",
        })
    return results

def clean_markdown_formatting(text: str) -> str:
    """Remove raw markdown asterisks and normalize bullet points for clean UI display."""
    if not text:
        return ""
    # Remove markdown bold/italic asterisks: **text** -> text, *text* -> text
    cleaned = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    # Remove any remaining isolated asterisks
    cleaned = cleaned.replace("*", "")
    # Normalize dash or asterisk bullet points at the start of lines to standard bullet •
    cleaned = re.sub(r'^\s*[\-\*]\s+', '• ', cleaned, flags=re.MULTILINE)
    return cleaned.strip()

def run_rag_shopping_assistant(db: Session, query: str, price_max: Optional[float] = None) -> Dict[str, Any]:
    """
    RAG Pipeline:
    1. Retrieval: Query product catalog database for matching products.
    2. Context Formatting: Format retrieved products as context.
    3. Generation: Call LLM (Groq / fallback) to answer query using catalog context.
    """
    retrieved_products = retrieve_relevant_products(db, query, price_max=price_max, limit=5)

    if not retrieved_products:
        return {
            "query": query,
            "answer": "I searched our product catalog, but couldn't find products matching your criteria or budget. Please try broadening your query or raising your budget cap.",
            "recommended_products": [],
            "ai_provider": "ShopSense RAG Retriever"
        }

    catalog_context_str = "\n".join([
        f"- ID: {p['product_id']} | Name: '{p['product_name']}' | Category: {p['category']} | Price: ₹{p['price']} | Vendor: {p['vendor_name']} | Stock: {p['stock_quantity']}\n  Description: {p['description'][:150]}"
        for p in retrieved_products
    ])

    prompt = f"""You are the official AI Shopping Assistant for ShopSense E-Commerce.
Customer Query: "{query}"

Available Product Catalog Context (RAG Retrieved):
{catalog_context_str}

Instructions:
1. Answer the customer's query directly and recommend the best matching product(s) strictly from the retrieved catalog above.
2. Explain WHY the recommended product fits their request (highlight price, category, key features).
3. Do not invent products outside the provided catalog.
4. Keep the response polite, helpful, and concise (2-3 paragraphs).
5. FORMATTING RULE: Do NOT use any markdown asterisks (no ** or *). Use clean plain text and standard bullet points (•)."""

    if GROQ_API_KEY:
        import httpx
        for model in GROQ_CANDIDATE_MODELS:
            try:
                response = httpx.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": "You are a helpful e-commerce shopping assistant using RAG product retrieval. Never output markdown asterisks (* or **). Use bullet symbol (•) and clean plain text headers."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.4,
                    },
                    timeout=20.0,
                )
                response.raise_for_status()
                raw_answer = response.json()["choices"][0]["message"]["content"].strip()
                cleaned_answer = clean_markdown_formatting(raw_answer)
                return {
                    "query": query,
                    "answer": cleaned_answer,
                    "recommended_products": retrieved_products,
                    "ai_provider": f"Groq RAG ({model})"
                }
            except Exception as e:
                logger.warning(f"Groq RAG failed with model {model}: {e}")
                continue

    # Local fallback generator if LLM is unavailable
    top = retrieved_products[0]
    fallback_answer = (
        f"Based on our catalog, I highly recommend the {top['product_name']} offered by {top['vendor_name']} for ₹{top['price']:,.2f}.\n\n"
        f"Key Highlights:\n"
        f"• Category: {top['category']}\n"
        f"• Description: {top['description'][:120]}...\n"
        f"• Available Stock: {top['stock_quantity']} units\n\n"
        f"This product best satisfies your query '{query}' based on available specs and price positioning."
    )

    return {
        "query": query,
        "answer": clean_markdown_formatting(fallback_answer),
        "recommended_products": retrieved_products,
        "ai_provider": "ShopSense Local RAG Engine"
    }
