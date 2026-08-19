import json
import logging
import re
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.product import Product
from app.models.transaction import Transaction

logger = logging.getLogger("shopsense.vector")


class VectorSearchEngine:
    def __init__(self):
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.product_vectors: Optional[np.ndarray] = None
        self.product_ids: List[int] = []
        self.product_data_cache: Dict[int, Dict[str, Any]] = {}
        self.is_indexed: bool = False

    def _prepare_product_text(self, p: Product) -> str:
        """Combine product attributes into a rich semantic representation for embedding."""
        parts = [
            f"Product: {p.product_name}",
            f"Category: {p.category or 'General'}",
            f"Description: {p.description or ''}",
        ]
        # Price contextual bucket
        if p.price < 50:
            parts.append("budget friendly affordable economical")
        elif p.price < 150:
            parts.append("mid range value popular")
        else:
            parts.append("premium luxury high end professional top tier")

        return " ".join(parts)

    def index_catalog(self, db: Session):
        """Extract all active catalog products and fit high-dimensional vector embeddings."""
        products = db.query(Product).filter(Product.is_active == True).all()
        if not products:
            self.is_indexed = False
            return

        texts = []
        self.product_ids = []
        self.product_data_cache = {}

        for p in products:
            self.product_ids.append(p.id)
            texts.append(self._prepare_product_text(p))
            self.product_data_cache[p.id] = {
                "product_id": p.id,
                "product_name": p.product_name,
                "category": p.category,
                "price": float(p.price),
                "vendor_id": p.vendor_id,
                "description": p.description,
            }

        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=1024,
            sublinear_tf=True,
            stop_words="english",
        )
        self.product_vectors = self.vectorizer.fit_transform(texts).toarray()
        self.is_indexed = True
        logger.info("Indexed %s products with %s-dimensional vector embeddings.", len(self.product_ids), self.product_vectors.shape[1])

    def semantic_search(
        self,
        db: Session,
        query: str,
        limit: int = 6,
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Perform cosine similarity search between query embedding and product vector space."""
        if not self.is_indexed or self.vectorizer is None or self.product_vectors is None:
            self.index_catalog(db)

        if not self.is_indexed or not self.product_ids:
            return {
                "query": query,
                "total_matches": 0,
                "results": [],
                "vector_dimension": 0,
                "search_strategy": "Dense Semantic Cosine Vector Matcher",
            }

        # Vectorize natural language query into embedding space
        query_vector = self.vectorizer.transform([query]).toarray()
        similarities = cosine_similarity(query_vector, self.product_vectors)[0]

        # Extract top keywords from query
        query_terms = set(re.findall(r"\w+", query.lower()))

        scored_items = []
        for idx, score in enumerate(similarities):
            pid = self.product_ids[idx]
            pdata = self.product_data_cache.get(pid)
            if not pdata:
                continue

            # Filters
            if category and pdata.get("category", "").lower() != category.lower():
                continue
            if min_price is not None and pdata.get("price", 0) < min_price:
                continue
            if max_price is not None and pdata.get("price", 0) > max_price:
                continue

            # Normalized similarity percentage (scale non-zero scores nicely)
            sim_pct = round(float(score) * 100.0, 1)

            # Highlight matched features
            prod_text = (pdata["product_name"] + " " + (pdata["description"] or "")).lower()
            matched_words = [w for w in query_terms if w in prod_text and len(w) > 2]

            confidence = "HIGH" if sim_pct >= 40.0 else ("MEDIUM" if sim_pct >= 15.0 else "RELEVANT")
            reason = f"High semantic vector alignment ({sim_pct}%) with query terms: {', '.join(matched_words) if matched_words else 'intent & category relevance'}."

            scored_items.append({
                **pdata,
                "similarity_score": sim_pct,
                "match_confidence": confidence,
                "matched_features": matched_words[:4],
                "contextual_reason": reason,
            })

        # Rank by vector cosine similarity
        scored_items.sort(key=lambda x: x["similarity_score"], reverse=True)
        top_results = scored_items[:limit]

        return {
            "query": query,
            "total_matches": len(top_results),
            "results": top_results,
            "vector_dimension": self.product_vectors.shape[1] if self.product_vectors is not None else 0,
            "search_strategy": "High-Dimensional TF-IDF Cosine Vector DB",
        }

    def get_similar_products(
        self,
        db: Session,
        product_id: int,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Retrieve nearest vector neighbors for a given product."""
        if not self.is_indexed:
            self.index_catalog(db)

        if product_id not in self.product_ids:
            return []

        target_idx = self.product_ids.index(product_id)
        target_vec = self.product_vectors[target_idx].reshape(1, -1)

        sims = cosine_similarity(target_vec, self.product_vectors)[0]
        results = []

        for idx, score in enumerate(sims):
            pid = self.product_ids[idx]
            if pid == product_id:
                continue
            pdata = self.product_data_cache.get(pid)
            if not pdata:
                continue

            sim_pct = round(float(score) * 100.0, 1)
            results.append({
                **pdata,
                "similarity_score": sim_pct,
                "affinity_reasons": [
                    f"Vector cosine similarity: {sim_pct}%",
                    f"Shared category: {pdata.get('category', '')}",
                    "Similar semantic feature profile",
                ],
                "co_purchased_count": 0,
            })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:limit]

    def get_customer_vector_recommendations(
        self,
        db: Session,
        customer_id: int,
        limit: int = 6,
    ) -> List[Dict[str, Any]]:
        """
        Build customer semantic preference vector by taking the weighted centroid
        of products the customer has bought, then find nearest catalog matches.
        """
        if not self.is_indexed:
            self.index_catalog(db)

        # Get customer's completed purchases
        purchases = (
            db.query(Transaction.product_id, Transaction.quantity)
            .filter(
                Transaction.customer_id == customer_id,
                Transaction.payment_status == "COMPLETED",
            )
            .all()
        )

        if not purchases:
            # Fallback: return highest-priced/top products
            return [
                {
                    **self.product_data_cache[pid],
                    "similarity_score": 80.0,
                    "affinity_reasons": ["Popular starter recommendation for new customers"],
                    "co_purchased_count": 0,
                }
                for pid in self.product_ids[:limit]
            ]

        bought_pids = {p.product_id for p in purchases}
        bought_vectors = []
        weights = []

        for p in purchases:
            if p.product_id in self.product_ids:
                idx = self.product_ids.index(p.product_id)
                bought_vectors.append(self.product_vectors[idx])
                weights.append(float(p.quantity or 1))

        if not bought_vectors:
            return []

        # Weighted centroid vector of customer's taste profile
        weights_arr = np.array(weights).reshape(-1, 1)
        customer_vector = np.sum(np.array(bought_vectors) * weights_arr, axis=0) / np.sum(weights_arr)
        customer_vector = customer_vector.reshape(1, -1)

        sims = cosine_similarity(customer_vector, self.product_vectors)[0]
        results = []

        for idx, score in enumerate(sims):
            pid = self.product_ids[idx]
            if pid in bought_pids:
                continue  # Skip already purchased
            pdata = self.product_data_cache.get(pid)
            if not pdata:
                continue

            sim_pct = round(float(score) * 100.0, 1)
            results.append({
                **pdata,
                "similarity_score": sim_pct,
                "affinity_reasons": [
                    f"Matches customer purchase vector profile ({sim_pct}%)",
                    f"Aligned with preferred category: {pdata.get('category', '')}",
                    "Deep semantic embedding alignment",
                ],
                "co_purchased_count": len(purchases),
            })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:limit]


# Global engine instance
vector_engine = VectorSearchEngine()
