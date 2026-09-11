import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Products() {
  const { session } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [updating, setUpdating] = useState(false)

  const handleView = (p) => {
    setSelectedProduct(p)
    setIsEditing(false)
    setEditData({ ...p })
  }

  const handleUpdate = async () => {
    setUpdating(true)
    try {
      const payload = {
        product_name: editData.product_name,
        category: editData.category,
        description: editData.description,
        price: parseFloat(editData.price),
        stock_quantity: parseInt(editData.stock_quantity, 10),
        is_active: editData.is_active,
      }
      const response = await api.put(`/products/${selectedProduct.id}`, payload)
      setProducts(products.map(p => p.id === response.data.id ? response.data : p))
      setSelectedProduct(response.data)
      setIsEditing(false)
    } catch (e) {
      alert(e.response?.data?.detail || e.message)
    } finally {
      setUpdating(false)
    }
  }
  useEffect(() => {
    api.get('/products/', { params: { limit: 200 } })
      .then(r => setProducts(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [])

  const cats = [...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = products.filter(p => {
    const s = search.toLowerCase()
    const matchS = !s || p.product_name.toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s)
    const matchC = !catFilter || p.category === catFilter
    return matchS && matchC
  })

  const statusBadge = (p) => {
    if (!p.is_active) return <span className="badge badge-ghost">Inactive</span>
    if (p.approval_status === 'APPROVED') return <span className="badge badge-green">Active</span>
    if (p.approval_status === 'PENDING')  return <span className="badge badge-amber">Pending</span>
    return <span className="badge badge-red">Rejected</span>
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Product Catalog</div>
        <div className="page-subtitle">
          {session?.role === 'VENDOR' ? 'Listings assigned to your vendor account.' : 'Marketplace-wide catalog.'}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 220 }}
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        >
          <option value="">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
          {filtered.length} products
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}><td colSpan={6}><div className="skeleton skeleton-row" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                      No products found. Create your first AI listing in the Studio.
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="td-primary">{p.product_name}</div>
                      {p.description && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td>{p.category || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td style={{ fontFamily: 'Manrope', fontWeight: 600 }}>₹{Number(p.price).toFixed(2)}</td>
                    <td>
                      <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: p.stock_quantity === 0 ? 'var(--red)' : p.stock_quantity < 10 ? 'var(--amber)' : 'var(--ink)' }}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td>{statusBadge(p)}</td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleView(p)}>
                        View Product
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedProduct && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">{isEditing ? 'Edit Product' : 'Product Details'}</div>
              <button className="btn btn-secondary" onClick={() => setSelectedProduct(null)} style={{ padding: '4px 8px' }}>✕</button>
            </div>
            <div className="card-body">
              {selectedProduct.image_url && !isEditing && (
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <img src={`http://127.0.0.1:8000${selectedProduct.image_url}`} alt="Product" style={{ maxWidth: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 8 }} />
                </div>
              )}
              
              {isEditing ? (
                <div className="form-grid">
                  <div className="field">
                    <label>Product Name</label>
                    <input value={editData.product_name || ''} onChange={e => setEditData({...editData, product_name: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <input value={editData.category || ''} onChange={e => setEditData({...editData, category: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>Price</label>
                      <input type="number" step="0.01" value={editData.price || 0} onChange={e => setEditData({...editData, price: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>Stock</label>
                      <input type="number" value={editData.stock_quantity || 0} onChange={e => setEditData({...editData, stock_quantity: e.target.value})} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea rows={5} value={editData.description || ''} onChange={e => setEditData({...editData, description: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={handleUpdate} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</button>
                    <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><strong>Name:</strong> {selectedProduct.product_name}</div>
                  <div><strong>Category:</strong> {selectedProduct.category || 'N/A'}</div>
                  <div><strong>Price:</strong> ₹{Number(selectedProduct.price).toFixed(2)}</div>
                  <div><strong>Stock:</strong> {selectedProduct.stock_quantity}</div>
                  {selectedProduct.tags && <div><strong>Tags:</strong> {selectedProduct.tags}</div>}
                  <div><strong>Description:</strong> <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{selectedProduct.description}</div></div>
                  
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Product</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
