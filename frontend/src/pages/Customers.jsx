import { useState, useEffect } from 'react'
import api from '../api'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/customers/')
      setCustomers(res.data || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Customer List</div>
          <div className="page-subtitle">View all registered customers in the system.</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchCustomers}>
          ↻ Refresh List
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Registered Customers Directory</div>
            <div className="card-sub">Total {customers.length} customers in database</div>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}><div className="skeleton skeleton-row" /></td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No registered customers found.</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td><strong>#{c.id}</strong></td>
                      <td>
                        <div className="td-primary">{c.first_name}</div>
                      </td>
                      <td>
                        <div className="td-primary">{c.last_name}</div>
                      </td>
                      <td>{c.email || 'N/A'}</td>
                      <td>{c.phone || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
