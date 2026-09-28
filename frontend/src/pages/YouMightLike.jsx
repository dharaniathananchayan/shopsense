import { useEffect, useState } from 'react'
import api from '../api'
import { useCart } from '../context/CartContext'

export default function YouMightLike() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { addToCart, saveForLater } = useCart()

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const session = JSON.parse(localStorage.getItem('shopsense_session')) || {}
        let url = '/recommendations/trending?days=30&limit=12'
        
        if (session.role === 'CUSTOMER' && session.user_id) {
            url = `/recommendations/vector/customer/${session.user_id}?limit=12`
        }
        
        const r = await api.get(url)
        const topRecs = r.data
        if (topRecs.length === 0) {
           setProducts([])
           return
        }
        
        const fullProducts = await Promise.all(
          topRecs.map(rec => api.get(`/products/${rec.product_id}`).then(res => res.data).catch(() => null))
        )
        
        setProducts(fullProducts.filter(Boolean))
      } catch (e) {
        setError(e.response?.data?.detail || e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchRecommendations()
  }, [])

  const getImageUrl = (p) => {
    if (p.image_url) {
      if (p.image_url.startsWith('http')) return p.image_url;
      return `http://127.0.0.1:8000${p.image_url}`;
    }
    return null; // Don't use random images
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">You Might Like</div>
        <div className="page-subtitle">
          Personalized recommendations based on what's trending and popular.
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <span className="spinner" style={{ marginRight: 8 }} /> Finding recommendations...
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-icon">✨</div>
          <h3>Check back later!</h3>
          <p>We are still gathering data to find the best products for you.</p>
        </div>
      ) : (
        <div className="rec-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--line-2)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
              <div 
                style={{ height: 220, borderBottom: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderTopLeftRadius: 10, borderTopRightRadius: 10, cursor: 'pointer' }}
                onClick={() => window.location.href = `/product/${p.id}`}
              >
                {getImageUrl(p) ? (
                  <img
                    src={getImageUrl(p)}
                    alt={p.product_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ color: 'var(--muted)', fontSize: 40, opacity: 0.2 }}>🛒</div>
                )}
              </div>
              
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ink)', lineHeight: 1.3 }}>{p.product_name}</h3>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--violet)' }}>₹{Number(p.price).toFixed(2)}</div>
                </div>
                
                {p.category && <div className="badge badge-ghost" style={{ alignSelf: 'flex-start', marginBottom: 12 }}>{p.category}</div>}
                
                {p.description && (
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description}
                  </p>
                )}
                
                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => addToCart(p)}>
                    Add to Cart
                  </button>
                  <button className="btn btn-secondary" title="Save for Later" style={{ padding: '0 12px' }} onClick={() => saveForLater(p)}>
                    🔖
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
