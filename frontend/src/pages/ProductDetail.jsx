import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useCompare } from '../context/CompareContext'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { toggleCompare, compareItems } = useCompare()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [addingToWishlist, setAddingToWishlist] = useState(null)
  const [wishlists, setWishlists] = useState([])
  const [newListName, setNewListName] = useState('')

  // Review Form State
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [reviewText, setReviewText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchProductData()
    api.get('/wishlists').then(res => setWishlists(res.data)).catch(() => {})
  }, [id])

  const saveToWishlist = async (wishlistId, productId) => {
    try {
      await api.post(`/wishlists/${wishlistId}/items`, { product_id: productId })
      alert("Added to wishlist!")
      setAddingToWishlist(null)
    } catch (e) {
      alert("Failed to add to wishlist")
    }
  }

  const createAndSaveToWishlist = async () => {
    if (!newListName.trim()) return
    try {
      const res = await api.post('/wishlists', { name: newListName })
      await saveToWishlist(res.data.id, addingToWishlist.id)
      const wRes = await api.get('/wishlists')
      setWishlists(wRes.data)
      setNewListName('')
    } catch (e) {
      alert("Failed to create wishlist")
    }
  }

  const fetchProductData = async () => {
    try {
      setLoading(true)
      const pRes = await api.get(`/products/${id}`)
      setProduct(pRes.data)

      const rRes = await api.get(`/reviews/product/${id}`)
      setReviews(rRes.data)

      try {
        const sRes = await api.get(`/reviews/product/${id}/summary`)
        setSummary(sRes.data)
      } catch (err) {
        console.warn("Could not fetch sentiment summary", err)
      }

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load product details")
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const session = JSON.parse(localStorage.getItem('shopsense_session')) || {}
      await api.post('/reviews', {
        product_id: parseInt(id),
        rating: parseInt(rating),
        reviewer_name: session.full_name || session.email || "Verified Customer",
        title,
        review_text: reviewText
      })
      
      setShowReviewForm(false)
      setTitle("")
      setReviewText("")
      setRating(5)
      fetchProductData() // Refresh reviews and summary
    } catch (err) {
      alert("Failed to submit review: " + (err.response?.data?.detail || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const getImageUrl = (url) => {
    if (url) {
      if (url.startsWith('http')) return url;
      return `http://127.0.0.1:8000${url}?t=${Date.now()}`;
    }
    return null;
  }

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', padding: '100px 0' }}>
      <span className="spinner" /> Loading product...
    </div>
  )

  if (error || !product) return (
    <div className="page">
      <div className="alert alert-error">{error || "Product not found"}</div>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>&larr; Go Back</button>
    </div>
  )

  return (
    <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>&larr; Back</button>
      
      {/* Product Detail Top */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 40, padding: 32, marginBottom: 32 }}>
        <div style={{ flex: '1 1 400px', maxWidth: 500, height: 400, background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {getImageUrl(product.image_url) ? (
            <img src={getImageUrl(product.image_url)} alt={product.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 60, opacity: 0.1 }}>📦</span>
          )}
        </div>
        
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
          <div className="badge badge-ghost" style={{ alignSelf: 'flex-start', marginBottom: 16 }}>{product.category}</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink)', marginBottom: 16, lineHeight: 1.2 }}>{product.product_name}</h1>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--violet)', marginBottom: 24 }}>₹{Number(product.price).toFixed(2)}</div>
          
          <div style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 32, flex: 1 }}>
            {product.description || "No description available for this product."}
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: 18, flex: 1 }} onClick={() => addToCart(product)}>
              Add to Cart
            </button>
            <button className="btn btn-secondary" style={{ padding: '0 20px', fontSize: 24 }} title="Save to Wishlist" onClick={() => setAddingToWishlist(product)}>
              ❤️
            </button>
            <button className={`btn ${compareItems?.find(c => c.id === product.id) ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0 20px', fontSize: 24 }} title="Compare" onClick={() => toggleCompare(product)}>
              ⇄
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Customer Reviews</h2>
            <div style={{ color: 'var(--muted)', marginTop: 8 }}>See what others are saying about this product.</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowReviewForm(!showReviewForm)}>
            {showReviewForm ? "Cancel Review" : "Write a Review"}
          </button>
        </div>

        {showReviewForm && (
          <form onSubmit={submitReview} style={{ background: 'var(--canvas)', padding: 24, borderRadius: 12, marginBottom: 32, border: '1px solid var(--line)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Write a Review</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Rating</label>
              <select className="input" value={rating} onChange={e => setRating(e.target.value)} style={{ width: 120 }}>
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Average</option>
                <option value={2}>2 - Poor</option>
                <option value={1}>1 - Terrible</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Headline</label>
              <input type="text" className="input" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} required placeholder="What's most important to know?" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Review</label>
              <textarea className="input" style={{ width: '100%', height: 120, resize: 'vertical' }} value={reviewText} onChange={e => setReviewText(e.target.value)} required placeholder="What did you like or dislike?" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Analyzing & Submitting..." : "Submit Review"}
            </button>
          </form>
        )}

        {/* AI Summary Widget */}
        {summary && summary.review_count > 0 && (
          <div style={{ background: 'var(--violet-light)', padding: 24, borderRadius: 12, marginBottom: 40, border: '1px solid rgba(91,80,240,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>✨</span>
              <h3 style={{ margin: 0, color: 'var(--violet-2)' }}>AI Review Summary</h3>
            </div>
            <p style={{ margin: 0, color: 'var(--navy-2)', lineHeight: 1.6, fontSize: 15, fontWeight: 500 }}>
              {summary.consensus_summary}
            </p>
            <div style={{ display: 'flex', gap: 40, marginTop: 24, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ display: 'block', marginBottom: 8, color: 'var(--green)' }}>Top Pros</strong>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--navy-2)', fontSize: 14 }}>
                  {summary.top_pros.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: 8, color: 'var(--red)' }}>Top Cons</strong>
                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--navy-2)', fontSize: 14 }}>
                  {summary.top_cons.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Review List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {reviews.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: 'var(--canvas)', borderRadius: 12 }}>
              No reviews yet. Be the first to review this product!
            </div>
          ) : (
            reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--line-2)', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff' }}>
                    {r.reviewer_name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.reviewer_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ color: '#fbbf24', fontSize: 18, letterSpacing: 2 }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{r.title}</div>
                </div>
                
                <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink)' }}>{r.review_text}</p>
                
                {/* AI Extracted Aspect Badges */}
                {r.sentiment_label && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <span className={`badge ${r.sentiment_label === 'POSITIVE' ? 'badge-green' : r.sentiment_label === 'NEGATIVE' ? 'badge-red' : 'badge-ghost'}`}>
                      AI Sentiment: {r.sentiment_label}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Wishlist Modal */}
      {addingToWishlist && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,27,45,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 400, padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Add to Wishlist</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Select a wishlist to save <strong>{addingToWishlist.product_name}</strong>.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {wishlists.map(w => (
                <button key={w.id} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => saveToWishlist(w.id, addingToWishlist.id)}>
                  ❤️ {w.name}
                </button>
              ))}
            </div>
            
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', gap: 8 }}>
              <input type="text" className="input" placeholder="New list name..." value={newListName} onChange={e => setNewListName(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => createAndSaveToWishlist()}>Create</button>
            </div>
            
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button className="btn btn-ghost" onClick={() => setAddingToWishlist(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
