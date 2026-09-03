import { useState, useEffect } from 'react'
import api from '../api'

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [analyticsVendors, setAnalyticsVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [benchmarking, setBenchmarking] = useState(null)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    setLoading(true)
    setError('')
    try {
      const [vRes, aRes] = await Promise.all([
        api.get('/vendors/'),
        api.get('/analytics/top-vendors'),
      ])
      setVendors(vRes.data || [])
      setAnalyticsVendors(aRes.data || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const inspectVendor = async (v) => {
    setSelectedVendor(v)
    setBenchmarking(null)
    try {
      const res = await api.get(`/analytics/vendors/${v.id}/benchmarking`)
      setBenchmarking(res.data)
    } catch (e) {
      console.warn('Benchmarking fetch failed:', e)
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Vendor List & Marketplace Directory</div>
          <div className="page-subtitle">Inspect registered marketplace vendors, revenue performance, and status.</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchVendors}>
          ↻ Refresh List
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Registered Vendors Catalog</div>
            <div className="card-sub">Total {vendors.length} vendors in database</div>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vendor Name</th>
                  <th>Contact Email</th>
                  <th>Account Status</th>
                  <th>Total Sales Volume</th>
                  <th>Total Revenue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}><div className="skeleton skeleton-row" /></td></tr>
                ) : vendors.length === 0 ? (
                  <tr><td colSpan={7} style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No registered vendors found.</td></tr>
                ) : (
                  vendors.map((v) => {
                    const stats = analyticsVendors.find(a => a.vendor_id === v.id)
                    const rev = stats ? stats.total_revenue : 0
                    const sales = stats ? stats.total_sales : 0

                    return (
                      <tr key={v.id}>
                        <td><strong>#{v.id}</strong></td>
                        <td>
                          <div className="td-primary">{v.vendor_name}</div>
                        </td>
                        <td>{v.contact_email || 'N/A'}</td>
                        <td>
                          <span className={`badge ${v.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                            {v.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td>{sales} completed orders</td>
                        <td><strong>₹{fmt(rev)}</strong></td>
                        <td>
                          <button className="btn btn-secondary btn-xs" onClick={() => inspectVendor(v)}>
                            Inspect & Benchmark
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selected Vendor Benchmarking Modal / Detail Box */}
      {selectedVendor && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">{selectedVendor.vendor_name} — Performance Details</div>
              <div className="card-sub">Vendor ID #{selectedVendor.id} • {selectedVendor.contact_email}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedVendor(null)}>✕ Close</button>
          </div>

          <div className="card-body">
            {benchmarking ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#166534', fontSize: 14 }}>
                    📈 Performance Rating: {benchmarking.performance_status}
                  </div>
                  <div style={{ fontSize: 12, background: '#dcfce7', padding: '4px 10px', borderRadius: 12, fontWeight: 600, color: '#15803d' }}>
                    {benchmarking.revenue_performance_ratio}x Marketplace Mean
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: '#475569' }}>Vendor Total Revenue:</span>
                    <div style={{ fontWeight: 700 }}>₹{fmt(benchmarking.vendor_revenue)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Marketplace Avg: ₹{fmt(benchmarking.marketplace_avg_revenue)}</div>
                  </div>

                  <div>
                    <span style={{ color: '#475569' }}>Vendor Sales Count:</span>
                    <div style={{ fontWeight: 700 }}>{benchmarking.vendor_sales_count} orders</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Marketplace Avg: {benchmarking.marketplace_avg_sales_count} orders</div>
                  </div>

                  <div>
                    <span style={{ color: '#475569' }}>Average Order Value:</span>
                    <div style={{ fontWeight: 700 }}>₹{fmt(benchmarking.vendor_avg_order_value)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Marketplace Avg: ₹{fmt(benchmarking.marketplace_avg_order_value)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading vendor benchmarking data...</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
