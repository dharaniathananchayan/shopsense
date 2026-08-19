import { useEffect, useState } from 'react'
import api from '../api'

export default function Approvals() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)

  const loadApprovals = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/vendors/pending-users')
      setVendors(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load pending vendor accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [])

  const handleReview = async (userId, status) => {
    setNotice(null)
    try {
      await api.patch(`/vendors/users/${userId}/approval`, {
        approval_status: status,
      })
      setNotice({
        type: 'success',
        message: `Vendor user account ${status.toLowerCase()} successfully.`,
      })
      loadApprovals()
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Failed to update vendor status.',
      })
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Vendor Approvals</div>
        <div className="page-subtitle">
          Review and approve newly registered vendor accounts before they can publish listings.
        </div>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type}`} style={{ marginBottom: 16 }}>
          {notice.message}
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor User</th>
                  <th>Email</th>
                  <th>Vendor ID</th>
                  <th>Registered Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={5}>
                        <div className="skeleton skeleton-row" />
                      </td>
                    </tr>
                  ))
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted)' }}>
                      No vendor accounts currently waiting for review.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <span className="td-primary">{v.full_name || 'Vendor User'}</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{v.email}</td>
                      <td>
                        <span className="badge badge-ghost">ID: {v.vendor_id}</span>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleReview(v.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => handleReview(v.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
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
