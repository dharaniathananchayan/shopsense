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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}><td colSpan={5}><div className="skeleton skeleton-row" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
