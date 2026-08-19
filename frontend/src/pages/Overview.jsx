import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function MetricCard({ label, value, foot, loading }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      {loading
        ? <div className="skeleton skeleton-metric" style={{ marginTop: 8 }} />
        : <div className="metric-value">{value}</div>
      }
      <div className="metric-foot neutral">{foot}</div>
    </div>
  )
}

export default function Overview() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary]     = useState(null)
  const [vendors, setVendors]     = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!session) { setLoading(false); return }
    setLoading(true)
    const calls = [
      api.get('/analytics/summary'),
      api.get('/analytics/top-products'),
    ]
    if (session.role === 'ADMIN') calls.push(api.get('/analytics/top-vendors'))
    Promise.all(calls)
      .then(([s, p, v]) => {
        setSummary(s.data)
        setProducts(p.data)
        if (v) setVendors(v.data)
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [session])

  const topRevenue = vendors[0]?.total_revenue || 1

  return (
    <div className="page">
      <div className="hero">
        <h1>Marketplace Intelligence</h1>
        <p>Real-time analytics, inventory signals, and AI-driven insights for your ShopSense marketplace.</p>
      </div>

      {!session && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <span>Sign in to unlock analytics, inventory tracking, and AI-powered features.</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
            Sign in
          </button>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="metric-grid">
        <MetricCard label="Marketplace Revenue" value={summary ? `₹${fmt(summary.total_revenue)}` : '—'} foot="Completed orders only" loading={loading && !!session} />
        <MetricCard label="Active Vendors"      value={summary?.total_vendors ?? '—'}     foot="Marketplace partners"  loading={loading && !!session} />
        <MetricCard label="Products Listed"     value={summary?.total_products ?? '—'}    foot="Across all catalogs"   loading={loading && !!session} />
        <MetricCard label="Transactions"        value={summary?.total_transactions ?? '—'} foot="Sales recorded"       loading={loading && !!session} />
      </div>

      <div className="two-col">
        {session?.role === 'ADMIN' && (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Vendor Leaderboard</div>
                <div className="card-sub">Top marketplace performance by revenue</div>
              </div>
              <span className="badge badge-violet">Admin view</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Vendor</th><th>Orders</th><th>Revenue</th><th>Share</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5}><div className="skeleton skeleton-row" /></td></tr>
                    ) : vendors.length === 0 ? (
                      <tr><td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No vendor sales yet.</td></tr>
                    ) : vendors.map((v, i) => (
                      <tr key={v.vendor_id}>
                        <td><span className="rank-num">{i + 1}</span></td>
                        <td><span className="td-primary">{v.vendor_name}</span></td>
                        <td>{v.total_sales}</td>
                        <td>₹{fmt(v.total_revenue)}</td>
                        <td>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${Math.round(v.total_revenue / topRevenue * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Product Leaderboard</div>
              <div className="card-sub">
                {session?.role === 'VENDOR' ? 'Top-selling products in your catalog' : 'Top-selling products marketplace-wide'}
              </div>
            </div>
            <span className="badge badge-green">Live data</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Product</th><th>Units sold</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4}><div className="skeleton skeleton-row" /></td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={4} style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>No product sales yet.</td></tr>
                  ) : products.map((p, i) => (
                    <tr key={p.product_id}>
                      <td><span className="rank-num">{i + 1}</span></td>
                      <td><span className="td-primary">{p.product_name}</span></td>
                      <td>{p.total_sold}</td>
                      <td>₹{fmt(p.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
