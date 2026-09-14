import { useState } from 'react'
import api from '../api'

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
  const [tab, setTab]           = useState('customer-vector')

  // Customer Vector Recommendations State
  const [custVecId, setCustVecId]         = useState('1')
  const [custVecRecs, setCustVecRecs]     = useState([])
  const [custVecLoading, setCustVecLoading] = useState(false)
  const [custVecError, setCustVecError]   = useState('')

  // Rule-based: Also-bought
  const [customerId, setCustomerId] = useState('')
  const [alsoRecs, setAlsoRecs]     = useState([])
  const [alsoLoading, setAlsoLoading] = useState(false)
  const [alsoError, setAlsoError]   = useState('')

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

  const loadAlso = async () => {
    if (!customerId) return
    setAlsoLoading(true); setAlsoError('')
    try {
      const r = await api.get(`/recommendations/customers/${customerId}/also-bought`, { params: { limit: 8 } })
      setAlsoRecs(r.data)
    } catch (e) { setAlsoError(e.response?.data?.detail || e.message) }
    finally { setAlsoLoading(false) }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Customer Insights</div>
        <div className="page-subtitle">
          Customer-specific insights using taste vector centroids and collaborative filtering.
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === 'customer-vector' ? ' active' : ''}`} onClick={() => setTab('customer-vector')}>
          🎯 Contextual Customer Vector Recs
        </button>
        <button className={`tab-btn${tab === 'also-bought' ? ' active' : ''}`} onClick={() => setTab('also-bought')}>
          🤝 Also Bought (Co-Purchase)
        </button>
      </div>

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
    </div>
  )
}
