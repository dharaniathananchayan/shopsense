import React, { useEffect, useState } from 'react'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'

export default function Wishlists() {
  const [wishlists, setWishlists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListName, setNewListName] = useState('')
  const { addToCart } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    fetchWishlists()
  }, [])

  const fetchWishlists = async () => {
    try {
      setLoading(true)
      const res = await api.get('/wishlists')
      setWishlists(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async (e) => {
    e.preventDefault()
    if (!newListName.trim()) return
    try {
      await api.post('/wishlists', { name: newListName })
      setNewListName('')
      fetchWishlists()
    } catch (e) {
      alert("Failed to create wishlist")
    }
  }

  const handleDeleteList = async (id) => {
    if (!window.confirm("Are you sure you want to delete this wishlist?")) return
    try {
      await api.delete(`/wishlists/${id}`)
      fetchWishlists()
    } catch (e) {
      alert("Failed to delete wishlist")
    }
  }

  const handleRemoveItem = async (listId, productId) => {
    try {
      await api.delete(`/wishlists/${listId}/items/${productId}`)
      fetchWishlists()
    } catch (e) {
      alert("Failed to remove item")
    }
  }

  const toggleAlerts = async (itemId, current) => {
    try {
      await api.put(`/wishlists/items/${itemId}/alerts`, { alerts_enabled: !current })
      fetchWishlists()
    } catch (e) {
      alert("Failed to toggle alerts")
    }
  }

  const getImageUrl = (url) => {
    if (url) {
      if (url.startsWith('http')) return url;
      return `http://127.0.0.1:8000${url}?t=${Date.now()}`;
    }
    return null;
  }

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', padding: '100px 0' }}><span className="spinner"/></div>
  }

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title">My Wishlists</div>
          <div className="page-subtitle">Manage your favorite items and track price drops.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
          <form onSubmit={handleCreateList} style={{ display: 'flex', gap: 8 }}>
            <input 
              type="text" 
              className="input" 
              placeholder="New list name..." 
              value={newListName} 
              onChange={e => setNewListName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Create List</button>
          </form>
        </div>
      </div>

      {wishlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">❤️</div>
          <h3>No wishlists yet</h3>
          <p>Create a wishlist above to start saving your favorite items.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 32, alignItems: 'start' }}>
          {wishlists.map(list => (
            <div key={list.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', background: 'var(--canvas)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{list.name}</h3>
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteList(list.id)}>Delete List</button>
              </div>
              <div className="card-body" style={{ padding: 24 }}>
                {list.items.length === 0 ? (
                  <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>This list is empty.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {list.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, border: '1px solid var(--line)', borderRadius: 8, padding: 16, alignItems: 'center' }}>
                        <div 
                          style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#fff', border: '1px solid var(--line-2)', cursor: 'pointer' }}
                          onClick={() => navigate(`/product/${item.product_id}`)}
                        >
                          {getImageUrl(item.image_url) ? (
                            <img src={getImageUrl(item.image_url)} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : <div style={{ fontSize: 24, textAlign: 'center', lineHeight: '80px', opacity: 0.2 }}>📦</div>}
                        </div>
                        <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                          <div 
                            style={{ fontWeight: 700, fontSize: 16, color: 'var(--blue)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            onClick={() => navigate(`/product/${item.product_id}`)}
                          >
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{item.category}</div>
                          <div style={{ fontWeight: 800, color: 'var(--violet)' }}>₹{Number(item.price).toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flex: '1 1 auto' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: item.alerts_enabled ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                            <input 
                              type="checkbox" 
                              checked={item.alerts_enabled} 
                              onChange={() => toggleAlerts(item.id, item.alerts_enabled)} 
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                            {item.alerts_enabled ? "🔔 Price Alerts On" : "🔕 Price Alerts Off"}
                          </label>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleRemoveItem(list.id, item.product_id)}>Remove</button>
                            <button className="btn btn-primary btn-sm" onClick={() => addToCart({ id: item.product_id, product_name: item.product_name, price: item.price, image_url: item.image_url })}>Add to Cart</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
