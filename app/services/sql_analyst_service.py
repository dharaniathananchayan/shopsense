import re
import json
import logging
import os
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.ai_service import GROQ_API_KEY, GROQ_MODEL, GROQ_CANDIDATE_MODELS

logger = logging.getLogger("shopsense.text2sql")

DB_SCHEMA_PROMPT = """
Database Tables Schema (SQLite):
1. vendors(id INTEGER PRIMARY KEY, vendor_name TEXT, contact_email TEXT)
2. products(id INTEGER PRIMARY KEY, vendor_id INTEGER, product_name TEXT, category TEXT, price REAL, stock_quantity INTEGER, is_active BOOLEAN, approval_status TEXT)
3. customers(id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT, created_at DATETIME)
4. transactions(id INTEGER PRIMARY KEY, product_id INTEGER, customer_id INTEGER, vendor_id INTEGER, quantity INTEGER, unit_price REAL, total_amount REAL, payment_status TEXT, sales_platform TEXT, transaction_date DATETIME)
5. reviews(id INTEGER PRIMARY KEY, product_id INTEGER, customer_id INTEGER, rating INTEGER, review_text TEXT, sentiment_score REAL, created_at DATETIME)
"""

def sanitize_and_validate_sql(sql: str, vendor_id: Optional[int] = None) -> str:
    """Ensure SQL query is strictly a safe SELECT read query."""
    clean_sql = sql.strip()
    if clean_sql.startswith("```sql"):
        clean_sql = clean_sql[6:]
    if clean_sql.startswith("```"):
        clean_sql = clean_sql[3:]
    if clean_sql.endswith("```"):
        clean_sql = clean_sql[:-3]
    clean_sql = clean_sql.strip()

    upper_sql = clean_sql.upper()
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "EXEC", "PRAGMA", "ATTACH", "DETACH"]
    for word in forbidden:
        if re.search(r'\b' + word + r'\b', upper_sql):
            raise ValueError(f"Forbidden SQL operation detected: {word}. Only SELECT queries are permitted.")

    if not (upper_sql.startswith("SELECT") or upper_sql.startswith("WITH")):
        raise ValueError("Invalid SQL: Query must be a SELECT statement.")

    return clean_sql

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

def run_ai_data_analyst(db: Session, question: str, vendor_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Text-to-SQL AI Data Analyst:
    1. Generates SQLite SELECT query based on natural language question.
    2. Validates SQL safety.
    3. Executes query against database.
    4. Passes results to LLM to summarize underlying causes/insights.
    """
    vendor_context = f"Filter all queries specifically for vendor_id = {vendor_id}." if vendor_id else "This is a platform-wide query."

    prompt_gen_sql = f"""You are an expert SQL Data Analyst for ShopSense.
{DB_SCHEMA_PROMPT}

User Question: "{question}"
Context: {vendor_context}

Task: Write a valid SQLite SELECT query to answer this question.
Rules:
- Output ONLY the raw SQL query string inside a single block, with no explanations.
- Filter completed transactions using `payment_status = 'COMPLETED'`.
- If dates are mentioned like 'last week' or 'recent', use datetime functions or query recent transaction dates.
- ALWAYS JOIN tables properly when referencing columns across tables (e.g. JOIN products p ON t.product_id = p.id to get p.category).
- Keep query concise and limited to 20 rows.
"""

    generated_sql = None
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
                            {"role": "system", "content": "You output pure SQLite SELECT queries without commentary."},
                            {"role": "user", "content": prompt_gen_sql},
                        ],
                        "temperature": 0.1,
                    },
                    timeout=15.0,
                )
                response.raise_for_status()
                raw_sql = response.json()["choices"][0]["message"]["content"]
                generated_sql = sanitize_and_validate_sql(raw_sql, vendor_id)
                break
            except Exception as e:
                logger.warning(f"Groq Text-to-SQL failed with model {model}: {e}")
                continue

    # Fallback SQL generator if LLM is unavailable or failed
    if not generated_sql:
        q_lower = question.lower()
        if "drop" in q_lower or "decrease" in q_lower or "decline" in q_lower or "sales" in q_lower:
            if vendor_id:
                generated_sql = f"SELECT DATE(transaction_date) as sales_date, COUNT(id) as total_orders, SUM(total_amount) as daily_revenue FROM transactions WHERE vendor_id = {vendor_id} AND payment_status = 'COMPLETED' GROUP BY DATE(transaction_date) ORDER BY sales_date DESC LIMIT 14;"
            else:
                generated_sql = "SELECT DATE(transaction_date) as sales_date, COUNT(id) as total_orders, SUM(total_amount) as daily_revenue FROM transactions WHERE payment_status = 'COMPLETED' GROUP BY DATE(transaction_date) ORDER BY sales_date DESC LIMIT 14;"
        elif "categor" in q_lower:
            if vendor_id:
                generated_sql = f"SELECT p.category, SUM(t.total_amount) as total_revenue FROM transactions t JOIN products p ON t.product_id = p.id WHERE t.vendor_id = {vendor_id} AND t.payment_status = 'COMPLETED' GROUP BY p.category ORDER BY total_revenue DESC LIMIT 5;"
            else:
                generated_sql = "SELECT p.category, SUM(t.total_amount) as total_revenue FROM transactions t JOIN products p ON t.product_id = p.id WHERE t.payment_status = 'COMPLETED' GROUP BY p.category ORDER BY total_revenue DESC LIMIT 5;"
        elif "product" in q_lower or "top" in q_lower:
            if vendor_id:
                generated_sql = f"SELECT p.product_name, SUM(t.quantity) as total_units, SUM(t.total_amount) as total_revenue FROM transactions t JOIN products p ON t.product_id = p.id WHERE t.vendor_id = {vendor_id} AND t.payment_status = 'COMPLETED' GROUP BY p.id, p.product_name ORDER BY total_revenue DESC LIMIT 5;"
            else:
                generated_sql = "SELECT p.product_name, SUM(t.quantity) as total_units, SUM(t.total_amount) as total_revenue FROM transactions t JOIN products p ON t.product_id = p.id WHERE t.payment_status = 'COMPLETED' GROUP BY p.id, p.product_name ORDER BY total_revenue DESC LIMIT 5;"
        else:
            if vendor_id:
                generated_sql = f"SELECT sales_platform, COUNT(id) as order_count, SUM(total_amount) as channel_revenue FROM transactions WHERE vendor_id = {vendor_id} AND payment_status = 'COMPLETED' GROUP BY sales_platform ORDER BY channel_revenue DESC;"
            else:
                generated_sql = "SELECT sales_platform, COUNT(id) as order_count, SUM(total_amount) as channel_revenue FROM transactions WHERE payment_status = 'COMPLETED' GROUP BY sales_platform ORDER BY channel_revenue DESC;"

    # Execute SQL safely
    query_results = []
    try:
        sql_result = db.execute(text(generated_sql))
        keys = list(sql_result.keys())
        rows = sql_result.fetchall()
        query_results = [dict(zip(keys, [float(val) if isinstance(val, (int, float)) else str(val) for val in row])) for row in rows]
    except Exception as exec_err:
        logger.error(f"SQL execution failed: {exec_err}")
        return {
            "question": question,
            "generated_sql": generated_sql,
            "query_results": [],
            "analysis_insight": f"Failed to execute generated query: {exec_err}",
            "ai_provider": "Error"
        }

    # Pass query results back to LLM for analytical insight synthesis
    prompt_synthesis = f"""You are an executive BI Data Analyst.
User Question: "{question}"
Executed SQL: `{generated_sql}`
SQL Query Results: {json.dumps(query_results)}

Task: Provide clear, concise analytical insights explaining the findings and root causes (e.g. why sales changed, channel performance, or top drivers).
CRITICAL FORMATTING RULE: Do NOT use any markdown asterisks (no ** or *). Write clean plain text with standard bullet points (•) and clean headings."""

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
                            {"role": "system", "content": "You synthesize database query results into clear business intelligence insights. Never output markdown asterisks (* or **). Use bullet symbol (•) and clean text headers."},
                            {"role": "user", "content": prompt_synthesis},
                        ],
                        "temperature": 0.3,
                    },
                    timeout=15.0,
                )
                response.raise_for_status()
                raw_insight = response.json()["choices"][0]["message"]["content"].strip()
                cleaned_insight = clean_markdown_formatting(raw_insight)
                chart_type = None
                q_lower = question.lower()
                if "pie" in q_lower:
                    chart_type = "pie"
                elif "bar" in q_lower:
                    chart_type = "bar"
                elif "line" in q_lower:
                    chart_type = "line"

                return {
                    "question": question,
                    "generated_sql": generated_sql,
                    "query_results": query_results,
                    "analysis_insight": cleaned_insight,
                    "ai_provider": f"Groq Text-to-SQL ({model})",
                    "chart_type": chart_type
                }
            except Exception as e:
                continue

    # Fallback analytical synthesis
    if query_results:
        summary_lines = [f"• Evaluated {len(query_results)} data records matching your question."]
        if "daily_revenue" in query_results[0] or "total_revenue" in query_results[0] or "channel_revenue" in query_results[0]:
            top_rec = query_results[0]
            val = top_rec.get("daily_revenue") or top_rec.get("total_revenue") or top_rec.get("channel_revenue")
            key_name = top_rec.get("sales_date") or top_rec.get("product_name") or top_rec.get("sales_platform")
            summary_lines.append(f"• Top performing metric segment: '{key_name}' with total revenue of ₹{float(val):,.2f}.")
        summary_lines.append("• Sales variation reflects demand fluctuation and distribution across sales channels.")
        fallback_insight = "\n".join(summary_lines)
    else:
        fallback_insight = "No matching records found for the requested time frame or criteria."

    chart_type = None
    q_lower = question.lower()
    if "pie" in q_lower:
        chart_type = "pie"
    elif "bar" in q_lower:
        chart_type = "bar"
    elif "line" in q_lower:
        chart_type = "line"

    return {
        "question": question,
        "generated_sql": generated_sql,
        "query_results": query_results,
        "analysis_insight": clean_markdown_formatting(fallback_insight),
        "ai_provider": "ShopSense Local Text-to-SQL Engine",
        "chart_type": chart_type
    }
