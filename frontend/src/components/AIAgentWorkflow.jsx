import { useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const formatReportText = (text) => {
  if (!text) return null
  const clean = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/\*/g, '')
  const lines = clean.split('\n').filter(l => l.trim().length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()

        // 1. Major Section Banners (e.g. "Pricing & Discount Strategy", "Restocking & Inventory Management", "Marketing & Promotion Tactics", "Performance Tracking")
        const isSectionBanner = !trimmed.startsWith('-') && !trimmed.startsWith('•') && (
          trimmed.endsWith(':') || 
          trimmed.includes('Strategy') || 
          trimmed.includes('Management') || 
          trimmed.includes('Tactics') || 
          trimmed.includes('Tracking') || 
          trimmed.includes('Advisories') ||
          trimmed.includes('Recommendations')
        )

        if (isSectionBanner) {
          const bannerText = trimmed.replace(/^[\-\•]\s*/, '').replace(/:$/, '')
          let icon = '📌'
          if (bannerText.toLowerCase().includes('pricing') || bannerText.toLowerCase().includes('discount')) icon = '🏷️'
          else if (bannerText.toLowerCase().includes('restock') || bannerText.toLowerCase().includes('inventory')) icon = '📦'
          else if (bannerText.toLowerCase().includes('marketing') || bannerText.toLowerCase().includes('promotion')) icon = '📢'
          else if (bannerText.toLowerCase().includes('tracking') || bannerText.toLowerCase().includes('performance')) icon = '📊'

          return (
            <div
              key={idx}
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#065f46',
                background: '#d1fae5',
                padding: '6px 12px',
                borderRadius: 6,
                marginTop: idx > 0 ? 12 : 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderLeft: '4px solid #059669'
              }}
            >
              <span>{icon}</span>
              <span>{bannerText}</span>
            </div>
          )
        }

        // 2. Item Sub-headers starting with "-" (e.g., "- Yoga Mat Premium: Inventory 73 units...")
        if (trimmed.startsWith('-')) {
          const itemText = trimmed.replace(/^[\-\s]+/, '')
          const parts = itemText.split(':')

          if (parts.length > 1) {
            return (
              <div
                key={idx}
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#1e293b',
                  marginTop: 6,
                  borderLeft: '3px solid #10b981',
                  background: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: 4
                }}
              >
                <span style={{ color: '#047857', fontWeight: 700 }}>🔹 {parts[0].trim()}:</span>
                <span style={{ color: '#475569', marginLeft: 6 }}>{parts.slice(1).join(':').trim()}</span>
              </div>
            )
          }

          return (
            <div
              key={idx}
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: '#1e293b',
                marginTop: 6,
                borderLeft: '3px solid #10b981',
                background: '#f8fafc',
                padding: '6px 10px',
                borderRadius: 4
              }}
            >
              🔹 {itemText}
            </div>
          )
        }

        // 3. Bullet action points starting with "•"
        if (trimmed.startsWith('•')) {
          const actionText = trimmed.replace(/^[\•\s]+/, '')
          const parts = actionText.split(':')

          if (parts.length > 1 && parts[0].length < 40) {
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  paddingLeft: 18,
                  fontSize: 12.5,
                  color: '#334155',
                  lineHeight: 1.55
                }}
              >
                <span style={{ color: '#059669', fontWeight: 800 }}>→</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#0f172a' }}>{parts[0].trim()}:</strong> {parts.slice(1).join(':').trim()}
                </div>
              </div>
            )
          }

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                paddingLeft: 18,
                fontSize: 12.5,
                color: '#334155',
                lineHeight: 1.55
              }}
            >
              <span style={{ color: '#059669', fontWeight: 800 }}>→</span>
              <span style={{ flex: 1 }}>{actionText}</span>
            </div>
          )
        }

        // Default paragraph
        return (
          <div key={idx} style={{ fontSize: 13, color: '#334155', paddingLeft: 10, lineHeight: 1.5 }}>
            {trimmed}
          </div>
        )
      })}
    </div>
  )
}

export default function AIAgentWorkflow() {
  const { session } = useAuth()
  const [vendorId, setVendorId] = useState(session?.vendor_id || 1)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  const handleRunAgent = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)

    try {
      const vId = session?.role === 'VENDOR' ? session.vendor_id : parseInt(vendorId, 10)
      const res = await api.post('/ai/agent-workflow/run', { vendor_id: vId })
      setReport(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to execute autonomous AI agent.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🤖</span> Autonomous Store Diagnostics AI Agent
          </div>
          <div className="card-sub">
            Runs weekly automated store audits on catalog stock levels & 14-day sales velocity to generate proactive pricing and inventory advisories.
          </div>
        </div>

        <form onSubmit={handleRunAgent} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {session?.role === 'ADMIN' && (
            <input
              type="number"
              min="1"
              className="input"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="Vendor ID"
              style={{ width: 100, padding: '6px 10px', fontSize: 13 }}
            />
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" /> Running Diagnostics Agent...
              </>
            ) : (
              '⚡ Run Autonomous Agent Audit'
            )}
          </button>
        </form>
      </div>

      <div className="card-body">
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {!report && !loading && (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-icon">🤖</div>
            <h3>Autonomous Agent Ready</h3>
            <p>Click "Run Autonomous Agent Audit" above to launch store diagnostics and proactive inventory advisory generation.</p>
          </div>
        )}

        {report && (
          <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: 16 }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#065f46', fontSize: 15 }}>
                  Store Audit Advisory Report — {report.vendor_name}
                </div>
                <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                  Audit Timestamp: {report.timestamp}
                </div>
              </div>
              <span className="badge badge-green" style={{ fontSize: 11 }}>
                Status: {report.ai_agent_status}
              </span>
            </div>

            {/* Proactive Advisory Section */}
            <div style={{ background: '#ffffff', borderRadius: 6, padding: 14, marginBottom: 16, border: '1px solid #a7f3d0' }}>
              <div style={{ fontWeight: 700, color: '#047857', marginBottom: 8, fontSize: 13 }}>
                📢 Proactive AI Strategic Advisories:
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                {formatReportText(report.advisory_report)}
              </div>
            </div>

            {/* Audited Products Table */}
            {report.audit_data && report.audit_data.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
                  Audited Catalog Products & Inventory Velocity ({report.audit_data.length} SKUs):
                </div>
                <div className="table-wrap" style={{ maxHeight: 200, overflowY: 'auto', background: '#fff', borderRadius: 6 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price (₹)</th>
                        <th>Current Stock</th>
                        <th>14-Day Sales</th>
                        <th>Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.audit_data.map((p) => (
                        <tr key={p.product_id}>
                          <td><strong>{p.product_name}</strong></td>
                          <td>{p.category}</td>
                          <td>₹{p.price.toFixed(2)}</td>
                          <td>
                            <span style={{ color: p.stock_quantity <= 15 ? '#dc2626' : p.stock_quantity >= 50 ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                              {p.stock_quantity} units
                            </span>
                          </td>
                          <td>{p.sales_last_14_days} units</td>
                          <td>⭐ {p.avg_rating > 0 ? p.avg_rating : 'N/A'}</td>
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
    </div>
  )
}
