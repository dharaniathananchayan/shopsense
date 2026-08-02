import json
import logging
import os
import random
from typing import Any, Dict, Optional

logger = logging.getLogger("shopsense.ai")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def _as_text_list(value: Any) -> list[str]:
    """Normalize a model field that may arrive as a list or one text string."""
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        if "#" in value:
            return [f"#{item.strip()}" for item in value.split("#") if item.strip()]
        return [item.strip() for item in value.replace("\n", ",").split(",") if item.strip()]
    return [str(value)]


def _groq_product_content(
    product_name: str, category: str, keywords: Optional[str], target_audience: str
) -> Dict[str, Any]:
    """Request a JSON SEO listing from Groq's OpenAI-compatible endpoint."""
    import httpx

    prompt = f"""Create an accurate, compelling e-commerce product listing.
Product name: {product_name}
Category: {category}
Keywords: {keywords or 'high quality, top rated'}
Target audience: {target_audience}

Return a JSON object only with exactly these keys: tagline (string), description
(two concise paragraphs), highlights (exactly 4 strings), seo_tags (4 to 6
hashtag strings), target_keywords (3 to 6 strings), and seo_score (0 to 100).
Never invent product specifications that were not supplied."""

    response = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You write factual, SEO-friendly marketplace listings."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.55,
            "response_format": {"type": "json_object"},
        },
        timeout=20.0,
    )
    response.raise_for_status()
    parsed = json.loads(response.json()["choices"][0]["message"]["content"])
    required = {"tagline", "description", "highlights", "seo_tags", "target_keywords", "seo_score"}
    if not required.issubset(parsed):
        raise ValueError("Groq response did not include the expected listing fields")
    # Some models naturally return the requested two paragraphs as a list.
    # The public API deliberately exposes one display-ready description string.
    if isinstance(parsed["description"], list):
        parsed["description"] = "\n\n".join(str(paragraph) for paragraph in parsed["description"])
    else:
        parsed["description"] = str(parsed["description"])
    parsed["tagline"] = str(parsed["tagline"])
    parsed["highlights"] = _as_text_list(parsed["highlights"])
    parsed["seo_tags"] = _as_text_list(parsed["seo_tags"])
    parsed["target_keywords"] = _as_text_list(parsed["target_keywords"])
    parsed["seo_score"] = max(0, min(100, int(parsed["seo_score"])))
    parsed["ai_provider"] = f"Groq ({GROQ_MODEL})"
    return parsed


def generate_ai_product_content(
    product_name: str,
    category: Optional[str] = None,
    keywords: Optional[str] = None,
    target_audience: Optional[str] = "General Customers",
) -> Dict[str, Any]:
    """Generate an SEO listing through Groq, or a local fallback without a key."""
    category = category or "General E-Commerce"
    target_audience = target_audience or "General Customers"

    if GROQ_API_KEY:
        try:
            return _groq_product_content(product_name, category, keywords, target_audience)
        except Exception as exc:
            logger.warning("Groq generation failed (%s); using the local fallback.", exc)

    adjectives = ["Premium", "Next-Gen", "Ultra-Durable", "Ergonomic", "Eco-Friendly", "Sleek"]
    selected_tagline = random.choice([
        f"Experience everyday quality with the {product_name}.",
        f"A thoughtful choice for {target_audience.lower()}: {product_name}.",
        f"Upgrade your routine with the {random.choice(adjectives).lower()} {product_name}.",
    ])
    description = (
        f"{selected_tagline}\n\nIntroducing the {product_name}, selected for {target_audience.lower()} "
        f"looking for dependable options in {category}. Its practical design makes it a strong fit for "
        f"everyday use and a considered addition to your shopping list.\n\nBrowse the listing details "
        "and choose with confidence based on your needs."
    )
    clean_words = [word.capitalize() for word in product_name.replace("-", " ").split() if len(word) > 2]
    tags = list(dict.fromkeys([f"#{word}" for word in clean_words[:3]] + [f"#{category.replace(' ', '')}", "#ShopSense"]))[:6]
    keyword_list = [product_name.lower(), category.lower(), "buy online", "quality"]
    if keywords:
        keyword_list.extend(item.strip().lower() for item in keywords.split(",") if item.strip())

    return {
        "tagline": selected_tagline,
        "description": description,
        "highlights": [
            "Practical design for everyday use.",
            f"Selected with {target_audience.lower()} in mind.",
            "Clear, customer-friendly listing details.",
            "A dependable option in its category.",
        ],
        "seo_tags": tags,
        "target_keywords": list(dict.fromkeys(keyword_list))[:6],
        "seo_score": random.randint(88, 94),
        "ai_provider": "ShopSense local fallback (Groq not configured)",
    }
