import { useEffect, useState } from 'react'
import api from '../api'
import ChartAnalytics from '../components/ChartAnalytics'

const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Analytics() {
  const [summary, setSummary]         = useState(null)
  const [vendors, setVendors]         = useState([])
  const [products, setProducts]       = useState([])
  const [platforms, setPlatforms]     = useState([])
  const [categoryDist, setCategoryDist] = useState(null)
  const [vendorDetail, setVendorDetail] = useState(null)
  const [benchmarking, setBenchmarking] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/analytics/top-vendors'),
      api.get('/analytics/top-products'),
      api.get('/analytics/platform-summary'),
      api.get('/analytics/charts/category-distribution'),
    ])
      .then(([s, v, p, pl, cat]) => {
        setSummary(s.data); setVendors(v.data)
        setProducts(p.data); setPlatforms(pl.data)
        setCategoryDist(cat.data)
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [])

  const loadVendorDetail = async (vendorId, vendorName) => {
    setDetailLoading(true)
    setBenchmarking(null)
    try {
      const [s, sales, bm] = await Promise.all([
        api.get(`/analytics/vendors/${vendorId}/summary`),
        api.get(`/analytics/vendors/${vendorId}/sales`),
        api.get(`/analytics/vendors/${vendorId}/benchmarking`),
      ])
      setVendorDetail({ vendorId, vendorName, summary: s.data, sales: sales.data })
      setBenchmarking(bm.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleExportCSV = async (vendorId = null) => {
    try {
      const url = vendorId ? `/analytics/vendors/${vendorId}/export/sales-csv` : '/analytics/export/sales-csv'
      const response = await api.get(url, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `sales_report_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      alert('Failed to export CSV: ' + (e.response?.data?.detail || e.message))
    }
  }

  const maxSales = Math.max(...(vendorDetail?.sales || []).map(d => d.total_revenue), 1)

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Admin & BI Analytics</div>
          <div className="page-subtitle">Platform, vendor, benchmarking, and real-time report insights in one place.</div>
        </div>
        <button className="btn btn-primary" onClick={() => handleExportCSV()}>
          📥 Export CSV Report
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Interactive Chart Analytics Component */}
      <ChartAnalytics />



      {/* Platform summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Platform Summary</div>
            <div className="card-sub">Completed marketplace activity</div>
          </div>
        </div>
        <div className="card-body">
          <div className="metric-grid" style={{ marginBottom: 0 }}>
            {['total_revenue','total_vendors','total_products','total_transactions'].map((k, i) => {
              const labels = ['Revenue','Vendors','Products','Transactions']
              const val = summary ? (k === 'total_revenue' ? `₹${fmt(summary[k])}` : summary[k]) : '—'
              return (
                <div key={k} className="metric-card" style={{ boxShadow: 'none', background: 'var(--canvas)' }}>
                  <div className="metric-label">{labels[i]}</div>
                  {loading
                    ? <div className="skeleton skeleton-metric" style={{ marginTop: 8 }} />
                    : <div className="metric-value" style={{ fontSize: 22 }}>{val}</div>
                  }
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Category Distribution Breakdown Chart */}
      {categoryDist && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div>
              <div className="card-title">Category Revenue Distribution</div>
              <div className="card-sub">Marketplace revenue share by product category</div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {categoryDist.labels.map((cat, idx) => (
                <div key={cat} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 70px', gap: 10, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{cat}</span>
                  <div className="progress-bar" style={{ width: '100%' }}>
                    <div className="progress-bar-fill" style={{ width: `${categoryDist.percentages[idx]}%` }} />
                  </div>
                  <strong>₹{fmt(categoryDist.series[idx])}</strong>
                  <span style={{ color: 'var(--muted)', textAlign: 'right' }}>{categoryDist.percentages[idx]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Vendor table */}
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Vendor Summary</div><div className="card-sub">Click "View" to inspect performance & benchmarking.</div></div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Vendor</th><th>Revenue</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={3}><div className="skeleton skeleton-row" /></td></tr>
                  : vendors.length === 0 ? <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>No vendor sales.</td></tr>
                  : vendors.map(v => (
                    <tr key={v.vendor_id}>
                      <td>
                        <div className="td-primary">{v.vendor_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.total_sales} orders</div>
                      </td>
                      <td>₹{fmt(v.total_revenue)}</td>
                      <td>
                        <button className="btn btn-secondary btn-xs" onClick={() => loadVendorDetail(v.vendor_id, v.vendor_name)}>
                          View & Benchmark
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Product table */}
        <div className="card">
          <div className="card-head">
            <div><div className="card-title">Product Leaderboard</div><div className="card-sub">Highest revenue products marketplace-wide.</div></div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={3}><div className="skeleton skeleton-row" /></td></tr>
                  : products.length === 0 ? <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>No product sales.</td></tr>
                  : products.map((p, i) => (
                    <tr key={p.product_id}>
                      <td><span className="rank-num" style={{ marginRight: 8 }}>{i+1}</span>{p.product_name}</td>
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

      {/* Sales platform table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div><div className="card-title">Sales Channel Summary</div><div className="card-sub">Completed order performance by platform.</div></div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Platform</th><th>Orders</th><th>Avg order</th><th>Total revenue</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4}><div className="skeleton skeleton-row" /></td></tr>
                : platforms.length === 0 ? <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>No platform data.</td></tr>
                : platforms.map(p => (
                  <tr key={p.platform_name}>
                    <td><span className="td-primary">{p.platform_name}</span></td>
                    <td>{p.total_orders}</td>
                    <td>₹{fmt(p.avg_order_value)}</td>
                    <td>₹{fmt(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vendor detail drill-down & Benchmarking */}
      {(vendorDetail || detailLoading) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head">
            <div>
              <div className="card-title">{vendorDetail?.vendorName || '…'} — Vendor Performance & Benchmarking</div>
              <div className="card-sub">Compare vendor metrics directly against marketplace averages.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {vendorDetail && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV(vendorDetail.vendorId)}>
                  📥 Export Vendor CSV
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setVendorDetail(null)}>✕ Close</button>
            </div>
          </div>
          <div className="card-body">
            {detailLoading ? <div className="skeleton skeleton-row" />
            : vendorDetail && (
              <>
                <div className="metric-grid" style={{ marginBottom: 20 }}>
                  {[
                    ['Completed Sales', vendorDetail.summary.total_sales],
                    ['Revenue', `₹${fmt(vendorDetail.summary.total_revenue)}`],
                    ['Avg Order', `₹${fmt(vendorDetail.summary.avg_order_value)}`],
                    ['Products', vendorDetail.summary.product_count],
                  ].map(([l, v]) => (
                    <div key={l} className="metric-card" style={{ boxShadow: 'none', background: 'var(--canvas)' }}>
                      <div className="metric-label">{l}</div>
                      <div className="metric-value" style={{ fontSize: 22 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Benchmarking Comparison Box */}
                {benchmarking && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: '#166534', fontSize: 14 }}>
                        📈 Marketplace Benchmarking Metric: {benchmarking.performance_status}
                      </div>
                      <div style={{ fontSize: 12, background: '#dcfce7', padding: '4px 10px', borderRadius: 12, fontWeight: 600, color: '#15803d' }}>
                        {benchmarking.revenue_performance_ratio}x Marketplace Avg
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
                      <div>
                        <span style={{ color: '#475569' }}>Vendor Revenue:</span>
                        <div style={{ fontWeight: 600 }}>₹{fmt(benchmarking.vendor_revenue)}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Marketplace Avg: ₹{fmt(benchmarking.marketplace_avg_revenue)}</div>
                      </div>
                      <div>
                        <span style={{ color: '#475569' }}>Vendor Order Count:</span>
                        <div style={{ fontWeight: 600 }}>{benchmarking.vendor_sales_count} orders</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Marketplace Avg: {benchmarking.marketplace_avg_sales_count} orders</div>
                      </div>
                      <div>
                        <span style={{ color: '#475569' }}>Avg Order Value:</span>
                        <div style={{ fontWeight: 600 }}>₹{fmt(benchmarking.vendor_avg_order_value)}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Marketplace Avg: ₹{fmt(benchmarking.marketplace_avg_order_value)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="section-label">Daily Sales Breakdown</div>
                {vendorDetail.sales.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>No daily data available.</p>
                ) : vendorDetail.sales.map(day => (
                  <div key={day.date} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 100px', gap: 10, alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>{day.date}</span>
                    <div className="progress-bar" style={{ width: '100%' }}>
                      <div className="progress-bar-fill" style={{ width: `${Math.round(day.total_revenue / maxSales * 100)}%` }} />
                    </div>
                    <strong>₹{fmt(day.total_revenue)}</strong>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
