import { useEffect, useState } from 'react'
import api from '../api'

const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const SEG_CONFIG = {
  VIP:        { cls: 'seg-vip',     color: 'var(--violet)', desc: 'Spent ₹10,000+' },
  Regular:    { cls: 'seg-regular', color: 'var(--blue)',   desc: 'Spent ₹1,000 – ₹9,999' },
  Occasional: { cls: 'seg-occ',     color: 'var(--amber)',  desc: 'Spent under ₹1,000' },
}

const segBadge = (seg) => {
  const map = { VIP: 'badge-violet', Regular: 'badge-blue', Occasional: 'badge-amber' }
  return <span className={`badge ${map[seg] || 'badge-ghost'}`}>{seg}</span>
}

export default function Segments() {
  const [customers, setCustomers]   = useState([])
  const [filter, setFilter]         = useState('All')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    api.get('/analytics/customer-segments')
      .then(r => setCustomers(r.data))
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false))
  }, [])

  const counts = customers.reduce((acc, c) => {
    acc[c.segment] = (acc[c.segment] || 0) + 1; return acc
  }, {})

  const filtered = customers.filter(c => {
    const matchSeg    = filter === 'All' || c.segment === filter
    const matchSearch = !search || `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
    return matchSeg && matchSearch
  })

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Customer Segments</div>
        <div className="page-subtitle">SQL-based segmentation by total spend — VIP, Regular, and Occasional tiers.</div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Segment summary cards */}
      <div className="segment-grid">
        {['VIP','Regular','Occasional'].map(seg => {
          const cfg = SEG_CONFIG[seg]
          return (
            <div key={seg} className={`segment-card ${cfg.cls}`} style={{ cursor: 'pointer', borderColor: filter === seg ? cfg.color : 'var(--line)' }} onClick={() => setFilter(filter === seg ? 'All' : seg)}>
              <div className="segment-label">{seg}</div>
              <div className="segment-count">{loading ? '—' : (counts[seg] || 0)}</div>
              <div className="segment-desc">{cfg.desc}</div>
            </div>
          )
        })}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 240 }}
        />
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: 4 }}>
          {['All','VIP','Regular','Occasional'].map(seg => (
            <button
              key={seg}
              className={`tab-btn${filter === seg ? ' active' : ''}`}
              onClick={() => setFilter(seg)}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >{seg}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>
          {filtered.length} customers
        </div>
      </div>

      {/* Customers table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Customer</th><th>Email</th><th>Orders</th><th>Total spent</th><th>Segment</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => <tr key={i}><td colSpan={6}><div className="skeleton skeleton-row" /></td></tr>)
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
                    No customers found{filter !== 'All' ? ` in the ${filter} segment` : ''}.
                  </td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.customer_id}>
                    <td><span className="rank-num">{i + 1}</span></td>
                    <td><span className="td-primary">{c.first_name} {c.last_name}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.email}</td>
                    <td>{c.order_count}</td>
                    <td style={{ fontFamily: 'Manrope', fontWeight: 700 }}>₹{fmt(c.total_spent)}</td>
                    <td>{segBadge(c.segment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Threshold info */}
      <div className="alert alert-info" style={{ marginTop: 20 }}>
        <span>ℹ️</span>
        <span>
          <strong>Segmentation thresholds:</strong>{' '}
          VIP ≥ ₹10,000 · Regular ₹1,000–₹9,999 · Occasional &lt; ₹1,000. Click a segment card to filter the table.
        </span>
      </div>
    </div>
  )
}
