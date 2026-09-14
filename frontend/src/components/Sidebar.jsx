import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin  = session?.role === 'ADMIN'
  const isVendor = session?.role === 'VENDOR'
  const [catalogOpen, setCatalogOpen] = useState(true)

  const handleLogout = () => { logout(); navigate('/') }

  const link = (to, icon, label, end = false, badge = null, isSub = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      style={isSub ? { paddingLeft: 32, fontSize: 13 } : {}}
    >
      <span className="sidebar-icon">{icon}</span>
      <span>{label}</span>
      {badge && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">S</div>
        <span className="sidebar-brand-name">ShopSense</span>
      </div>

      <p className="sidebar-section-label">Workspace</p>
      <nav className="sidebar-nav">
        {link('/', '▦', 'Overview', true)}
        {isAdmin && link('/analytics', '◫', 'Analytics')}
        {link('/forecasting', '📈', 'ML Forecasting')}
        {(isAdmin || isVendor) && link('/inventory', '▤', 'Inventory')}
        {isAdmin && link('/segments', '◈', 'Segments')}
        {link('/recommendations', '✦', 'Customer Insights')}
        {isAdmin && link('/diagnostics', '✓', 'Store Diagnostics')}
      </nav>

      <div className="sidebar-divider" />
      <p className="sidebar-section-label">Catalog & AI</p>
      <nav className="sidebar-nav">
        {/* Catalog Accordion Menu */}
        {(isAdmin || isVendor) && (
          <div>
            <div
              className="sidebar-link"
              onClick={() => setCatalogOpen(!catalogOpen)}
              style={{ cursor: 'pointer', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="sidebar-icon">📑</span>
                <span style={{ fontWeight: 600 }}>Catalog</span>
              </div>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{catalogOpen ? '▼' : '▶'}</span>
            </div>

            {catalogOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2, marginBottom: 4 }}>
                {link('/products', '📦', 'Product List', false, null, true)}
                {isAdmin && link('/vendors', '🏢', 'Vendor List', false, null, true)}
                {isAdmin && link('/customers', '👥', 'Customer List', false, null, true)}
              </div>
            )}
          </div>
        )}

        {link('/sentiment', '💬', 'Sentiment AI')}
        {(isAdmin || isVendor) && link('/studio', '✧', 'AI Studio')}
        {(isAdmin || isVendor) && link('/analyst', '📊', 'AI Data Analyst')}
        {isAdmin && link('/approvals', '⊙', 'Vendor Approvals')}
      </nav>

      <div className="sidebar-footer">
        {session ? (
          <button className="sidebar-link" style={{ width: '100%', marginTop: 4 }} onClick={handleLogout}>
            <span className="sidebar-icon">↩</span>
            <span>Sign out</span>
          </button>
        ) : (
          link('/auth', '⊕', 'Sign in')
        )}
        <div className="sidebar-tip" style={{ marginTop: 10 }}>
          <strong>AI product studio</strong>
          Draft SEO-ready listings in seconds using Groq.
        </div>
      </div>
    </aside>
  )
}

