import { useState, useEffect } from 'react'
import api from '../api'

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

export default function Recommendations() {
  const [tab, setTab]           = useState('vector-search')

  // Vector Semantic Search State
  const [vectorQuery, setVectorQuery]     = useState('noise cancelling wireless headphones with long battery')
  const [vectorCat, setVectorCat]         = useState('')
  const [vectorLimit, setVectorLimit]     = useState(6)
  const [vectorResults, setVectorResults] = useState([])
  const [vectorMeta, setVectorMeta]       = useState(null)
  const [vectorLoading, setVectorLoading] = useState(false)
  const [vectorError, setVectorError]     = useState('')

  // Customer Vector Recommendations State
  const [custVecId, setCustVecId]         = useState('1')
  const [custVecRecs, setCustVecRecs]     = useState([])
  const [custVecLoading, setCustVecLoading] = useState(false)
  const [custVecError, setCustVecError]   = useState('')

  // Product Vector Neighbors State
  const [catalogProducts, setCatalogProducts] = useState([])
  const [targetPid, setTargetPid]             = useState(null)
  const [similarRecs, setSimilarRecs]         = useState([])
  const [similarLoading, setSimilarLoading]   = useState(false)
  const [similarError, setSimilarError]       = useState('')

  // Rule-based: Top-in-category
  const [category, setCategory] = useState('Electronics')
  const [topRecs, setTopRecs]   = useState([])
  const [topLoading, setTopLoading] = useState(false)
  const [topError, setTopError] = useState('')

  // Rule-based: Also-bought
  const [customerId, setCustomerId] = useState('')
  const [alsoRecs, setAlsoRecs]     = useState([])
  const [alsoLoading, setAlsoLoading] = useState(false)
  const [alsoError, setAlsoError]   = useState('')

  // Rule-based: Trending
  const [days, setDays]           = useState(30)
  const [trendRecs, setTrendRecs] = useState([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError]   = useState('')

  // Initial load for products
  useEffect(() => {
    api.get('/products', { params: { limit: 100 } })
      .then(res => {
        setCatalogProducts(res.data)
        if (res.data.length > 0) setTargetPid(res.data[0].id)
      })
      .catch(() => {})
    // Auto-run initial semantic search
    handleSemanticSearch('noise cancelling wireless headphones with long battery')
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

  const loadCustomerVectorRecs = async () => {
    if (!custVecId) return
    setCustVecLoading(true); setCustVecError('')
    try {
      const r = await api.get(`/recommendations/vector/customer/${custVecId}`, { params: { limit: 8 } })
      setCustVecRecs(r.data)
    } catch (e) {
      setCustVecError(e.response?.data?.detail || e.message)
    } finally {
      setCustVecLoading(false)
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

  const loadAlso = async () => {
    if (!customerId) return
    setAlsoLoading(true); setAlsoError('')
    try {
      const r = await api.get(`/recommendations/customers/${customerId}/also-bought`, { params: { limit: 8 } })
      setAlsoRecs(r.data)
    } catch (e) { setAlsoError(e.response?.data?.detail || e.message) }
    finally { setAlsoLoading(false) }
  }

  const loadTrend = async () => {
    setTrendLoading(true); setTrendError('')
    try {
      const r = await api.get('/recommendations/trending', { params: { days, limit: 8 } })
      setTrendRecs(r.data)
    } catch (e) { setTrendError(e.response?.data?.detail || e.message) }
    finally { setTrendLoading(false) }
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
        <div className="page-title">Recommendation & Vector Search Engine</div>
        <div className="page-subtitle">
          Next-generation semantic vector embeddings (Vector DB) & hybrid collaborative recommendation intelligence.
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'vector-search' ? ' active' : ''}`} onClick={() => setTab('vector-search')}>
          🧠 Vector Semantic Search
        </button>
        <button className={`tab-btn${tab === 'customer-vector' ? ' active' : ''}`} onClick={() => setTab('customer-vector')}>
          🎯 Contextual Customer Vector Recs
        </button>
        <button className={`tab-btn${tab === 'vector-similar' ? ' active' : ''}`} onClick={() => setTab('vector-similar')}>
          🔍 Similar Products (Vector Neighbors)
        </button>
        <button className={`tab-btn${tab === 'top-in-category' ? ' active' : ''}`} onClick={() => setTab('top-in-category')}>
          🏆 Top in Category
        </button>
        <button className={`tab-btn${tab === 'also-bought' ? ' active' : ''}`} onClick={() => setTab('also-bought')}>
          🤝 Also Bought (Co-Purchase)
        </button>
        <button className={`tab-btn${tab === 'trending' ? ' active' : ''}`} onClick={() => setTab('trending')}>
          🔥 Trending Velocity
        </button>
      </div>

      {/* TAB 1: VECTOR SEMANTIC SEARCH */}
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
              {/* Sample Pills */}
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

              {/* Search Inputs */}
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

      {/* TAB 2: CONTEXTUAL CUSTOMER VECTOR RECOMMENDATIONS */}
      {tab === 'customer-vector' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Customer Vector Profile Recommendations</div>
                <div className="card-sub">
                  Calculates customer taste centroid vector from past transactions and surfaces unbought high-affinity SKUs.
                </div>
              </div>
              <span className="badge badge-violet">Taste Vector Centroid</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Customer ID:</span>
                  <input
                    type="number" min={1} max={10}
                    value={custVecId}
                    onChange={e => setCustVecId(e.target.value)}
                    style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: 100 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(id => (
                    <button
                      key={id}
                      className={`btn ${Number(custVecId) === id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => setCustVecId(String(id))}
                    >
                      Customer #{id}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={loadCustomerVectorRecs} disabled={custVecLoading || !custVecId}>
                  {custVecLoading ? <span className="spinner" /> : '→'} Compute Vector Recs
                </button>
              </div>
            </div>
          </div>

          {custVecError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{custVecError}</div>}

          {custVecRecs.length > 0 && (
            <div className="rec-grid">
              {custVecRecs.map((item, i) => (
                <VectorResultCard key={item.product_id} item={item} rank={i + 1} />
              ))}
            </div>
          )}

          {custVecRecs.length === 0 && !custVecLoading && (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>Select a customer ID and click "Compute Vector Recs"</h3>
              <p>Generates real-time vector embeddings matching the customer's purchase behavior profile.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCT VECTOR NEAREST NEIGHBORS */}
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
                  {catalogProducts.map(p => (
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

      {/* TAB 4: TOP IN CATEGORY */}
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

      {/* TAB 5: ALSO BOUGHT */}
      {tab === 'also-bought' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Customers Also Bought</div>
                <div className="card-sub">Collaborative filtering — co-purchase frequency ranking.</div>
              </div>
              <span className="badge badge-blue">Rule: co-purchase count</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="number" min={1}
                  placeholder="Customer ID (e.g. 1)"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, width: 200 }}
                />
                <button className="btn btn-primary" onClick={loadAlso} disabled={alsoLoading || !customerId}>
                  {alsoLoading ? <span className="spinner" /> : '→'} Get Recommendations
                </button>
              </div>
            </div>
          </div>
          {alsoError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{alsoError}</div>}
          {alsoRecs.length > 0 && (
            <div className="rec-grid">
              {alsoRecs.map((r, i) => <RecCard key={r.product_id} rec={r} rank={i + 1} />)}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: TRENDING */}
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
    </div>
  )
}
