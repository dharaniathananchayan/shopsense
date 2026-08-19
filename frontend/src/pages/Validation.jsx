import { useState } from 'react'
import api from '../api'

const CHECK_ICONS = { pass: '✓', fail: '✕' }

export default function Validation() {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const runValidation = async () => {
    setLoading(true); setError(''); setReport(null)
    try {
      const r = await api.get('/analytics/validate-historical')
      setReport(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  const passed = report?.checks.filter(c => c.passed).length ?? 0
  const total  = report?.checks.length ?? 0

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Historical Data Validation</div>
        <div className="page-subtitle">
          Cross-check analytical outputs against raw transaction history. Four integrity checks run against the live database.
        </div>
      </div>

      {/* Run button + overall status */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Run Data Integrity Check</div>
            <div className="card-sub">Validates revenue math, stock levels, referential integrity, and aggregate consistency.</div>
          </div>
          {report && (
            <span className={`badge ${report.overall_passed ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 13, padding: '5px 12px' }}>
              {report.overall_passed ? '✓ All checks passed' : `✕ ${total - passed} check(s) failed`}
            </span>
          )}
        </div>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-primary" onClick={runValidation} disabled={loading} style={{ minWidth: 180 }}>
            {loading ? <><span className="spinner" /> Running checks…</> : '▶ Run Validation'}
          </button>
          {report && (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {passed}/{total} checks passed
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Check results */}
      {report && (
        <>
          {/* Progress summary */}
          <div className="metric-grid" style={{ marginBottom: 20 }}>
            <div className="metric-card">
              <div className="metric-label">Checks Run</div>
              <div className="metric-value">{total}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Passed</div>
              <div className="metric-value" style={{ color: 'var(--green)' }}>{passed}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Failed</div>
              <div className="metric-value" style={{ color: total - passed > 0 ? 'var(--red)' : 'var(--ink)' }}>{total - passed}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Overall</div>
              <div className="metric-value" style={{ fontSize: 18, color: report.overall_passed ? 'var(--green)' : 'var(--red)' }}>
                {report.overall_passed ? '✓ PASS' : '✕ FAIL'}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Check Results</div>
            </div>
            <div style={{ marginTop: 4 }}>
              {report.checks.map((check) => (
                <div key={check.check_name} className="check-row">
                  <div className={`check-icon ${check.passed ? 'pass' : 'fail'}`}>
                    {CHECK_ICONS[check.passed ? 'pass' : 'fail']}
                  </div>
                  <div className="check-content">
                    <div className="check-name">{check.check_name}</div>
                    <div className="check-detail">{check.detail}</div>
                    {check.anomalies?.length > 0 && (
                      <div className="anomaly-list">
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>
                          {check.anomalies.length} anomal{check.anomalies.length === 1 ? 'y' : 'ies'} found:
                        </div>
                        {check.anomalies.slice(0, 5).map((a, i) => (
                          <div key={i} className="anomaly-item">
                            {Object.entries(a).map(([k, v]) => `${k}: ${typeof v === 'number' ? Number(v).toFixed(2) : v}`).join(' · ')}
                          </div>
                        ))}
                        {check.anomalies.length > 5 && (
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>…and {check.anomalies.length - 5} more</div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${check.passed ? 'badge-green' : 'badge-red'}`} style={{ flexShrink: 0 }}>
                    {check.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="alert alert-info" style={{ marginTop: 20 }}>
            <span>ℹ️</span>
            <span>
              Validation runs directly against the live SQLite database.
              Re-run after bulk imports or schema changes to confirm data integrity.
            </span>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🔬</div>
          <h3>No report yet</h3>
          <p>Click "Run Validation" to cross-check all historical transaction data.</p>
        </div>
      )}
    </div>
  )
}
