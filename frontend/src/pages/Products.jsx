import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Books']

function RecCard({ rec, rank }) {
  return (
    <div className="rec-card">
      <div className="rec-rank">{rank}</div>
      <div className="rec-info">
        <div className="rec-name">{rec.product_name}</div>
        <div className="rec-reason">{rec.reason}</div>
        {rec.category && (
          <span className="badge badge-ghost" style={{ marginTop: 4, fontSize: 10 }}>{rec.category}</span>
        )}
      </div>
      <div className="rec-meta">
        <div className="rec-score">{rec.total_sold}</div>
        <div className="rec-score-label">units sold</div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>₹{Number(rec.price).toFixed(2)}</div>
      </div>
    </div>
  )
}

function VectorResultCard({ item, rank }) {
  return (
    <div className="rec-card" style={{ borderLeft: '4px solid var(--violet)' }}>
      <div className="rec-rank">#{rank}</div>
      <div className="rec-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="rec-name">{item.product_name}</span>
          <span className="badge badge-violet" style={{ fontSize: 11, fontWeight: 700 }}>
            ⚡ {item.similarity_score}% Match
          </span>
        </div>
        <div className="rec-reason" style={{ marginTop: 4, color: 'var(--text)' }}>
          {item.contextual_reason || item.affinity_reasons?.join(' • ')}
        </div>
        {item.matched_features?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {item.matched_features.map((feat, i) => (
              <span key={i} className="badge badge-ghost" style={{ fontSize: 10 }}>#{feat}</span>
            ))}
          </div>
        )}
        {item.description && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>
            {item.description.slice(0, 110)}…
          </p>
        )}
      </div>
      <div className="rec-meta">
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>₹{Number(item.price).toFixed(2)}</div>
        <span className="badge badge-ghost" style={{ marginTop: 4, fontSize: 10 }}>{item.category}</span>
      </div>
    </div>
  )
}

export default function Products() {
  const { session } = useAuth()
  const [tab, setTab] = useState('catalog')

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [updating, setUpdating] = useState(false)

  // Vector Semantic Search State
  const [vectorQuery, setVectorQuery]     = useState('noise cancelling wireless headphones with long battery')
  const [vectorCat, setVectorCat]         = useState('')
  const [vectorLimit, setVectorLimit]     = useState(6)
  const [vectorResults, setVectorResults] = useState([])
  const [vectorMeta, setVectorMeta]       = useState(null)
  const [vectorLoading, setVectorLoading] = useState(false)
  const [vectorError, setVectorError]     = useState('')

  // Product Vector Neighbors State
  const [targetPid, setTargetPid]             = useState(null)
  const [similarRecs, setSimilarRecs]         = useState([])
  const [similarLoading, setSimilarLoading]   = useState(false)
  const [similarError, setSimilarError]       = useState('')

  // Rule-based: Top-in-category
  const [category, setCategory] = useState('Electronics')
  const [topRecs, setTopRecs]   = useState([])
  const [topLoading, setTopLoading] = useState(false)
  const [topError, setTopError] = useState('')

  // Rule-based: Trending
  const [days, setDays]           = useState(30)
  const [trendRecs, setTrendRecs] = useState([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError]   = useState('')

  useEffect(() => {
    api.get('/products/', { params: { limit: 200 } })
      .then(r => {
        setProducts(r.data)
        if (r.data.length > 0) setTargetPid(r.data[0].id)
      })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSemanticSearch = async (queryToRun) => {
    const q = queryToRun || vectorQuery
    if (!q.trim()) return
    setVectorLoading(true); setVectorError('')
    try {
      const r = await api.post('/recommendations/semantic-search', {
        query: q,
        limit: vectorLimit,
        category: vectorCat || undefined,
      })
      setVectorResults(r.data.results)
      setVectorMeta(r.data)
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || ''
      if (!msg.toLowerCase().includes('status code')) {
        setVectorError(msg)
      }
    } finally {
      setVectorLoading(false)
    }
  }

  const loadSimilarProducts = async () => {
    if (!targetPid) return
    setSimilarLoading(true); setSimilarError('')
    try {
      const r = await api.get(`/recommendations/vector/similar/${targetPid}`, { params: { limit: 6 } })
      setSimilarRecs(r.data)
    } catch (e) {
      setSimilarError(e.response?.data?.detail || e.message)
    } finally {
      setSimilarLoading(false)
    }
  }

  const loadTop = async () => {
    setTopLoading(true); setTopError('')
    try {
      const r = await api.get('/recommendations/top-in-category', { params: { category, limit: 8 } })
      setTopRecs(r.data)
    } catch (e) { setTopError(e.response?.data?.detail || e.message) }
    finally { setTopLoading(false) }
  }

  const loadTrend = async () => {
    setTrendLoading(true); setTrendError('')
    try {
      const r = await api.get('/recommendations/trending', { params: { days, limit: 8 } })
      setTrendRecs(r.data)
    } catch (e) { setTrendError(e.response?.data?.detail || e.message) }
    finally { setTrendLoading(false) }
  }

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

  const sampleSearchQueries = [
    "noise cancelling wireless headphones with long battery",
    "mechanical gaming keyboard with rgb for programming",
    "genuine leather jacket tailored warm winter",
    "silent HEPA air purifier for bedroom allergies",
    "carbon fiber tennis racket for top spin control",
    "hands on data science book with practical python",
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Product Catalog & Discovery</div>
        <div className="page-subtitle">
          {session?.role === 'VENDOR' ? 'Listings assigned to your vendor account.' : 'Marketplace-wide catalog.'} Browse items, semantic search, and trending velocity.
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'catalog' ? ' active' : ''}`} onClick={() => setTab('catalog')}>
          📦 Catalog List
        </button>
        <button className={`tab-btn${tab === 'vector-search' ? ' active' : ''}`} onClick={() => setTab('vector-search')}>
          🧠 Vector Semantic Search
        </button>
        <button className={`tab-btn${tab === 'vector-similar' ? ' active' : ''}`} onClick={() => setTab('vector-similar')}>
          🔍 Similar Products
        </button>
        <button className={`tab-btn${tab === 'top-in-category' ? ' active' : ''}`} onClick={() => setTab('top-in-category')}>
          🏆 Top in Category
        </button>
        <button className={`tab-btn${tab === 'trending' ? ' active' : ''}`} onClick={() => setTab('trending')}>
          🔥 Trending Velocity
        </button>
      </div>

      {tab === 'catalog' && (
        <>
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
        </>
      )}

      {tab === 'vector-search' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Natural Language Vector Search</div>
                <div className="card-sub">
                  Maps natural language buyer queries into high-dimensional semantic vector space and computes cosine similarity.
                </div>
              </div>
              <span className="badge badge-violet">Vector DB Cosine Search</span>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Try Semantic Example Queries:
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sampleSearchQueries.map((q, i) => (
                    <button
                      key={i}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        setVectorQuery(q)
                        handleSemanticSearch(q)
                      }}
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="field"
                  placeholder="Type any natural language query (e.g., lightweight comfortable shoes for summer)..."
                  value={vectorQuery}
                  onChange={e => setVectorQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
                  style={{ flex: 1, minWidth: 280, border: '1px solid var(--line-2)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}
                />
                <select
                  value={vectorCat}
                  onChange={e => setVectorCat(e.target.value)}
                  style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => handleSemanticSearch()} disabled={vectorLoading || !vectorQuery.trim()}>
                  {vectorLoading ? <><span className="spinner" /> Searching…</> : '⚡ Semantic Vector Search'}
                </button>
              </div>
            </div>
          </div>

          {vectorError && !vectorError.toLowerCase().includes('status code') && <div className="alert alert-error" style={{ marginBottom: 12 }}>{vectorError}</div>}

          {vectorMeta && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span>Showing <strong>{vectorResults.length}</strong> semantic nearest matches for query: <em>"{vectorMeta.query}"</em></span>
              <span className="badge badge-ghost">Embedding Dimension: {vectorMeta.vector_dimension}d</span>
            </div>
          )}

          {vectorResults.length > 0 && (
            <div className="rec-grid">
              {vectorResults.map((item, i) => (
                <VectorResultCard key={item.product_id} item={item} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'vector-similar' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Vector Nearest Neighbors (More Like This)</div>
                <div className="card-sub">
                  Finds catalog products with closest vector cosine proximity to the selected item.
                </div>
              </div>
              <span className="badge badge-blue">KNN Vector Space</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={targetPid || ''}
                  onChange={e => setTargetPid(Number(e.target.value))}
                  style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 280 }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.product_name} ({p.category})</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={loadSimilarProducts} disabled={similarLoading || !targetPid}>
                  {similarLoading ? <span className="spinner" /> : '→'} Find Nearest Neighbors
                </button>
              </div>
            </div>
          </div>

          {similarError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{similarError}</div>}

          {similarRecs.length > 0 && (
            <div className="rec-grid">
              {similarRecs.map((item, i) => (
                <VectorResultCard key={item.product_id} item={item} rank={i + 1} />
              ))}
            </div>
          )}

          {similarRecs.length === 0 && !similarLoading && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>Choose a product to find its semantic vector nearest neighbors</h3>
              <p>Computes multi-dimensional cosine distance across all indexed catalog embeddings.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'top-in-category' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Top Sellers by Category</div>
                <div className="card-sub">Products ranked by total units sold within a selected category.</div>
              </div>
              <span className="badge badge-violet">Rule: units sold</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="btn btn-primary" onClick={loadTop} disabled={topLoading}>
                  {topLoading ? <span className="spinner" /> : '→'} Get Recommendations
                </button>
              </div>
            </div>
          </div>
          {topError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{topError}</div>}
          {topRecs.length > 0 && (
            <div className="rec-grid">
              {topRecs.map((r, i) => <RecCard key={r.product_id} rec={r} rank={i + 1} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'trending' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Trending Products</div>
                <div className="card-sub">Highest sales velocity within a configurable look-back window.</div>
              </div>
              <span className="badge badge-green">Rule: sales velocity</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Last</span>
                  <input
                    type="number" min={1} max={365} value={days}
                    onChange={e => setDays(Number(e.target.value))}
                    style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: 80 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>days</span>
                </div>
                {[7, 14, 30, 90].map(d => (
                  <button
                    key={d}
                    className={`btn ${days === d ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setDays(d)}
                  >{d}d</button>
                ))}
                <button className="btn btn-primary" onClick={loadTrend} disabled={trendLoading}>
                  {trendLoading ? <span className="spinner" /> : '→'} Get Trending
                </button>
              </div>
            </div>
          </div>
          {trendError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{trendError}</div>}
          {trendRecs.length > 0 && (
            <div className="rec-grid">
              {trendRecs.map((r, i) => <RecCard key={r.product_id} rec={r} rank={i + 1} />)}
            </div>
          )}
        </div>
      )}

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
