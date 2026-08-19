import json
import logging
import os
import re
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger("shopsense.sentiment")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_CANDIDATE_MODELS = [GROQ_MODEL, "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "allam-2-7b", "groq/compound-mini"]


def _groq_sentiment_analysis(
    text: str,
    product_name: str = "Product",
    category: str = "General",
) -> Dict[str, Any]:
    """Call Groq API to extract sentiment score, pros, cons, and vendor insights."""
    prompt = f"""You are an expert e-commerce customer sentiment and product intelligence analyst.
Analyze the following customer review text for product '{product_name}' (Category: {category}):

Review Text:
\"\"\"{text}\"\"\"

Provide an objective sentiment evaluation. Return ONLY a valid JSON object with exactly these keys:
- sentiment_score: float/int from 0 (extremely negative) to 100 (extremely positive)
- sentiment_label: exactly one of ["POSITIVE", "NEUTRAL", "NEGATIVE"]
- pros: a list of 2 to 4 concise bullet points describing what the customer liked
- cons: a list of 1 to 4 concise bullet points describing flaws, issues, or pain points (or empty list if completely flawless)
- summary: a 2-sentence executive summary summarizing customer sentiment and sentiment drivers
- aspect_scores: a JSON object with integer scores from 0 to 100 for:
    "quality": (build/craftsmanship score)
    "value": (price-to-value score)
    "usability": (ease of use/comfort score)
    "durability": (longevity/reliability score)
- vendor_action_items: a list of 2 to 3 actionable recommendations for the vendor to improve sales or fix customer pain points.
"""

    last_exc = None
    used_model = GROQ_MODEL
    # Filter unique candidate models
    candidates = list(dict.fromkeys(GROQ_CANDIDATE_MODELS))

    for model in candidates:
        try:
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a specialized e-commerce review sentiment extraction engine. Always output pure JSON without extra markdown backticks."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
                timeout=25.0,
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"]
            # Clean markdown codeblocks if returned
            clean_json = raw.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.startswith("```"):
                clean_json = clean_json[3:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            parsed = json.loads(clean_json.strip())
            used_model = model
            break
        except Exception as e:
            last_exc = e
            continue
    else:
        raise last_exc or ValueError("All Groq model candidates failed")

    score = max(0.0, min(100.0, float(parsed.get("sentiment_score", 75.0))))
    label = parsed.get("sentiment_label", "POSITIVE" if score >= 65 else ("NEGATIVE" if score <= 40 else "NEUTRAL"))
    if label not in ["POSITIVE", "NEUTRAL", "NEGATIVE"]:
        label = "POSITIVE" if score >= 60 else "NEGATIVE"

    return {
        "sentiment_score": round(score, 1),
        "sentiment_label": label,
        "pros": [str(p).strip() for p in parsed.get("pros", []) if str(p).strip()][:5],
        "cons": [str(c).strip() for c in parsed.get("cons", []) if str(c).strip()][:5],
        "summary": str(parsed.get("summary", "Customer review analyzed successfully.")),
        "aspect_scores": {
            "quality": int(parsed.get("aspect_scores", {}).get("quality", int(score))),
            "value": int(parsed.get("aspect_scores", {}).get("value", int(score))),
            "usability": int(parsed.get("aspect_scores", {}).get("usability", int(score))),
            "durability": int(parsed.get("aspect_scores", {}).get("durability", int(score))),
        },
        "vendor_action_items": [str(a).strip() for a in parsed.get("vendor_action_items", []) if str(a).strip()][:4],
        "ai_provider": f"Groq ({GROQ_MODEL})",
    }


def _local_fallback_sentiment(
    text: str,
    product_name: str = "Product",
    category: str = "General",
) -> Dict[str, Any]:
    """Rule-based NLP fallback when Groq API key is not present or network times out."""
    pos_words = {"great", "excellent", "superb", "love", "good", "amazing", "quality", "durable", "fast", "comfortable", "perfect", "worth", "smooth", "clear"}
    neg_words = {"bad", "poor", "broken", "stop", "stopped", "fail", "failed", "slow", "terrible", "worst", "wobble", "cheap", "flimsy", "delay", "issue", "problem", "disappointed", "glitch"}

    words = re.findall(r"\w+", text.lower())
    pos_count = sum(1 for w in words if w in pos_words)
    neg_count = sum(1 for w in words if w in neg_words)

    if pos_count == 0 and neg_count == 0:
        score = 65.0
        label = "POSITIVE"
    else:
        total = pos_count + neg_count
        ratio = pos_count / total
        score = round(max(10.0, min(98.0, ratio * 100)), 1)
        label = "POSITIVE" if score >= 60 else ("NEGATIVE" if score <= 40 else "NEUTRAL")

    pros = []
    cons = []
    if "battery" in text.lower() and "long" in text.lower():
        pros.append("Long-lasting battery life")
    if "sound" in text.lower() or "audio" in text.lower():
        pros.append("High fidelity audio output")
    if "comfort" in text.lower() or "fit" in text.lower():
        pros.append("Comfortable ergonomic design")
    if "build" in text.lower() or "sturdy" in text.lower() or "leather" in text.lower():
        pros.append("Solid material build quality")
    if not pros:
        pros = ["Satisfactory performance for intended use", "Matches advertised specifications"]

    if "cable" in text.lower() or "charging" in text.lower() or "stopped" in text.lower():
        cons.append("Potential hardware charging contact or durability concern")
    if "stand" in text.lower() or "wobble" in text.lower():
        cons.append("Stand stability could be improved")
    if "expensive" in text.lower() or "price" in text.lower():
        cons.append("Priced on the higher end of the spectrum")
    if not cons and label != "POSITIVE":
        cons = ["Minor design refinements requested by user"]

    return {
        "sentiment_score": score,
        "sentiment_label": label,
        "pros": pros[:4],
        "cons": cons[:3],
        "summary": f"Customer evaluation for {product_name} indicates overall {label.lower()} sentiment with satisfaction in core functionality.",
        "aspect_scores": {
            "quality": int(score),
            "value": int(max(20, score - 5)),
            "usability": int(min(98, score + 4)),
            "durability": int(max(20, score - 3)),
        },
        "vendor_action_items": [
            f"Highlight top praised features in {product_name} marketing materials.",
            "Monitor recurring customer feedback points for future batch improvements.",
        ],
        "ai_provider": "ShopSense Local NLP Sentiment Engine",
    }


def analyze_review_text(
    text: str,
    product_name: str = "Product",
    category: str = "General",
) -> Dict[str, Any]:
    """Public function: Analyze single or batch review text with Groq (with local fallback)."""
    if not text or not text.strip():
        raise ValueError("Review text cannot be empty")

    if GROQ_API_KEY:
        try:
            return _groq_sentiment_analysis(text, product_name, category)
        except Exception as exc:
            logger.warning("Groq sentiment analysis error (%s); utilizing fallback analyzer.", exc)

    return _local_fallback_sentiment(text, product_name, category)


def aggregate_product_sentiment(
    product_id: int,
    product_name: str,
    category: str,
    reviews: List[Any],
) -> Dict[str, Any]:
    """Aggregate all reviews for a product and generate a unified LLM intelligence summary."""
    if not reviews:
        return {
            "product_id": product_id,
            "product_name": product_name,
            "category": category,
            "total_reviews": 0,
            "avg_rating": 0.0,
            "overall_sentiment_score": 75.0,
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "top_pros": ["No customer reviews submitted yet."],
            "top_cons": [],
            "executive_summary": "No review feedback has been logged yet for this product.",
            "aspect_breakdown": {"quality": 80, "value": 80, "usability": 80, "durability": 80},
            "vendor_recommendations": ["Encourage verified buyers to submit early feedback."],
            "ai_provider": f"Groq ({GROQ_MODEL})" if GROQ_API_KEY else "ShopSense Local Engine",
        }

    total = len(reviews)
    avg_rating = round(sum(r.rating for r in reviews) / total, 2)
    scores = [r.sentiment_score if r.sentiment_score is not None else (r.rating * 20.0) for r in reviews]
    overall_sentiment = round(sum(scores) / total, 1)

    dist = {"positive": 0, "neutral": 0, "negative": 0}
    all_pros = []
    all_cons = []
    q_scores, v_scores, u_scores, d_scores = [], [], [], []

    for r in reviews:
        lbl = (r.sentiment_label or "POSITIVE").lower()
        if lbl in dist:
            dist[lbl] += 1
        else:
            dist["positive"] += 1

        if r.pros:
            try:
                p_list = json.loads(r.pros) if isinstance(r.pros, str) else r.pros
                all_pros.extend(p_list)
            except Exception:
                pass

        if r.cons:
            try:
                c_list = json.loads(r.cons) if isinstance(r.cons, str) else r.cons
                all_cons.extend(c_list)
            except Exception:
                pass

        if r.aspect_scores:
            try:
                asp = json.loads(r.aspect_scores) if isinstance(r.aspect_scores, str) else r.aspect_scores
                if isinstance(asp, dict):
                    if "quality" in asp: q_scores.append(asp["quality"])
                    if "value" in asp: v_scores.append(asp["value"])
                    if "usability" in asp: u_scores.append(asp["usability"])
                    if "durability" in asp: d_scores.append(asp["durability"])
            except Exception:
                pass

    # Deduplicate pros & cons while keeping frequency ranking
    unique_pros = list(dict.fromkeys(all_pros))[:5]
    unique_cons = list(dict.fromkeys(all_cons))[:4]

    # Combine review texts for Groq multi-review summary if available
    combined_texts = "\n---\n".join([f"Rating {r.rating}/5: {r.review_text}" for r in reviews[:8]])

    # If Groq is available, run holistic multi-review summary
    if GROQ_API_KEY and len(reviews) >= 2:
        try:
            holistic = _groq_sentiment_analysis(combined_texts, product_name, category)
            return {
                "product_id": product_id,
                "product_name": product_name,
                "category": category,
                "total_reviews": total,
                "avg_rating": avg_rating,
                "overall_sentiment_score": holistic["sentiment_score"],
                "sentiment_distribution": dist,
                "top_pros": holistic["pros"] or unique_pros,
                "top_cons": holistic["cons"] or unique_cons,
                "executive_summary": holistic["summary"],
                "aspect_breakdown": holistic["aspect_scores"],
                "vendor_recommendations": holistic["vendor_action_items"],
                "ai_provider": holistic["ai_provider"],
            }
        except Exception as exc:
            logger.warning("Groq holistic aggregation failed (%s); building local summary.", exc)

    aspects = {
        "quality": int(sum(q_scores) / len(q_scores)) if q_scores else int(overall_sentiment),
        "value": int(sum(v_scores) / len(v_scores)) if v_scores else int(overall_sentiment - 3),
        "usability": int(sum(u_scores) / len(u_scores)) if u_scores else int(overall_sentiment + 2),
        "durability": int(sum(d_scores) / len(d_scores)) if d_scores else int(overall_sentiment - 2),
    }

    return {
        "product_id": product_id,
        "product_name": product_name,
        "category": category,
        "total_reviews": total,
        "avg_rating": avg_rating,
        "overall_sentiment_score": overall_sentiment,
        "sentiment_distribution": dist,
        "top_pros": unique_pros or ["High customer satisfaction", "Solid build quality"],
        "top_cons": unique_cons or ["Packaging could be enhanced"],
        "executive_summary": f"Based on {total} customer reviews, {product_name} enjoys a {overall_sentiment}/100 sentiment score with strong satisfaction in core performance.",
        "aspect_breakdown": aspects,
        "vendor_recommendations": [
            f"Capitalize on positive customer feedback for {product_name} in promotional campaigns.",
            "Address noted cons in the next product revision to elevate overall satisfaction.",
        ],
        "ai_provider": "ShopSense Sentiment Intelligence",
    }
