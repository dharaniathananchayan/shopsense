import { useEffect, useState } from 'react'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useCompare } from '../context/CompareContext'

export default function Shop() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  
  const [addingToWishlist, setAddingToWishlist] = useState(null)
  const [wishlists, setWishlists] = useState([])
  const [newListName, setNewListName] = useState('')
  
  const { addToCart } = useCart()
  const { toggleCompare, compareItems } = useCompare()

  useEffect(() => {
    // Fetch all products (scoped appropriately on backend)
    api.get('/products/', { params: { limit: 200 } })
      .then(res => setProducts(res.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))

    // Fetch user wishlists
    api.get('/wishlists').then(res => setWishlists(res.data)).catch(() => {})
  }, [])

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
      // refresh wishlists
      const wRes = await api.get('/wishlists')
      setWishlists(wRes.data)
      setNewListName('')
    } catch (e) {
      alert("Failed to create wishlist")
    }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = products.filter(p => {
    if (!p.is_active || p.approval_status !== 'APPROVED') return false
    const s = search.toLowerCase()
    const matchS = !s || p.product_name.toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s)
    const matchC = !category || p.category === category
    return matchS && matchC
  })
  
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
        <div className="page-title">ShopSense Direct Shopping</div>
        <div className="page-subtitle">
          Browse our entire marketplace catalog. All vendors, one place.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '10px 14px', fontSize: 14, minWidth: 260, flex: 1, maxWidth: 400 }}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
          {filtered.length} items available
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <span className="spinner" style={{ marginRight: 8 }} /> Loading catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-icon">🛍️</div>
          <h3>No products found</h3>
          <p>Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="rec-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map(p => (
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
                  <button className="btn btn-secondary" title="Save for Later" style={{ padding: '0 12px' }} onClick={() => setAddingToWishlist(p)}>
                    ❤️
                  </button>
                  <button 
                    className={`btn ${compareItems.find(c => c.id === p.id) ? 'btn-primary' : 'btn-secondary'}`} 
                    title="Compare" 
                    style={{ padding: '0 12px' }} 
                    onClick={() => toggleCompare(p)}
                  >
                    ⇄
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
