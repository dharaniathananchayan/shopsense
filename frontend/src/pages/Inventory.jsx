import { useEffect, useState } from 'react'
import api from '../api'

function stockClass(qty, threshold = 10) {
  if (qty === 0) return 'stock-danger'
  if (qty <= threshold) return 'stock-warn'
  return 'stock-ok'
}

function stockBadge(qty, threshold = 10) {
  if (qty === 0) return <span className="badge badge-red">Out of stock</span>
  if (qty <= threshold) return <span className="badge badge-amber">Low stock</span>
  return <span className="badge badge-green">In stock</span>
}

export default function Inventory() {
  const [tab, setTab]           = useState('levels')
  const [levels, setLevels]     = useState([])
  const [alerts, setAlerts]     = useState([])
  const [threshold, setThreshold] = useState(10)
  const [category, setCategory] = useState('')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [l, a] = await Promise.all([
        api.get('/products/inventory/stock-levels', { params: { category: category || undefined, limit: 200 } }),
        api.get('/products/inventory/low-stock',    { params: { threshold } }),
      ])
      setLevels(l.data); setAlerts(a.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [threshold, category]) // eslint-disable-line

  const maxStock = Math.max(...levels.map(p => p.stock_quantity), 1)
  const cats = [...new Set(levels.map(p => p.category).filter(Boolean))]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Inventory</div>
        <div className="page-subtitle">Monitor stock levels and get alerted when products run low.</div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Summary pills */}
      <div className="metric-grid" style={{ marginBottom: 20 }}>
        <div className="metric-card">
          <div className="metric-label">Total SKUs</div>
          <div className="metric-value">{levels.length}</div>
          <div className="metric-foot neutral">Active products tracked</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Low Stock</div>
          <div className="metric-value" style={{ color: 'var(--amber)' }}>{alerts.length}</div>
          <div className="metric-foot neutral">At or below threshold</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Out of Stock</div>
          <div className="metric-value" style={{ color: 'var(--red)' }}>{levels.filter(p => p.stock_quantity === 0).length}</div>
          <div className="metric-foot neutral">Needs immediate restock</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Alert Threshold</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="number" min={1} max={200}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width: 70, border: '1px solid var(--line-2)', borderRadius: 6, padding: '4px 8px', fontSize: 16, fontWeight: 700, fontFamily: 'Manrope' }}
            />
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>units</span>
          </div>
          <div className="metric-foot neutral">Adjust to change alerts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'levels' ? ' active' : ''}`} onClick={() => setTab('levels')}>
          Stock Levels ({levels.length})
        </button>
        <button className={`tab-btn${tab === 'alerts' ? ' active' : ''}`} onClick={() => setTab('alerts')}>
          Low-Stock Alerts {alerts.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 6 }}>{alerts.length}</span>}
        </button>
      </div>

      {/* Filters */}
      {tab === 'levels' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <select
            className="field select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '7px 12px', fontSize: 13 }}
          >
            <option value="">All categories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      )}

      {/* Stock Levels Table */}
      {tab === 'levels' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visual</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1,2,3,4,5].map(i => <tr key={i}><td colSpan={6}><div className="skeleton skeleton-row" /></td></tr>)
                  ) : levels.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0' }}>No products found.</td></tr>
                  ) : levels.map(p => {
                    const cls = stockClass(p.stock_quantity, threshold)
                    return (
                      <tr key={p.product_id}>
                        <td><span className="td-primary">{p.product_name}</span></td>
                        <td>{p.category || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td>₹{Number(p.price).toFixed(2)}</td>
                        <td style={{ fontFamily: 'Manrope', fontWeight: 700 }}>{p.stock_quantity}</td>
                        <td>
                          <div className={`stock-bar ${cls}`}>
                            <div className="stock-bar-fill" style={{ width: `${Math.min(100, Math.round(p.stock_quantity / maxStock * 100))}%` }} />
                          </div>
                        </td>
                        <td>{stockBadge(p.stock_quantity, threshold)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Low-Stock Alerts Table */}
      {tab === 'alerts' && (
        <div className="card">
          {alerts.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No low-stock alerts</h3>
              <p>All products are above the threshold of {threshold} units.</p>
            </div>
          ) : (
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Product</th><th>Category</th><th>Stock</th><th>Threshold</th><th>Urgency</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [1,2,3].map(i => <tr key={i}><td colSpan={5}><div className="skeleton skeleton-row" /></td></tr>)
                    ) : alerts.map(p => (
                      <tr key={p.product_id}>
                        <td><span className="td-primary">{p.product_name}</span></td>
                        <td>{p.category || '—'}</td>
                        <td style={{ fontFamily: 'Manrope', fontWeight: 800, color: p.stock_quantity === 0 ? 'var(--red)' : 'var(--amber)' }}>
                          {p.stock_quantity}
                        </td>
                        <td>{p.threshold}</td>
                        <td>
                          {p.stock_quantity === 0
                            ? <span className="badge badge-red">🚨 Out of stock</span>
                            : <span className="badge badge-amber">⚠️ Low stock</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
