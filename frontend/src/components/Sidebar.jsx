import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin  = session?.role === 'ADMIN'
  const isVendor = session?.role === 'VENDOR'

  const handleLogout = () => { logout(); navigate('/') }

  const link = (to, icon, label, end = false, badge = null) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
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
        {link('/recommendations', '✦', 'Recommendations')}
        {isAdmin && link('/validation', '✓', 'Validation')}
      </nav>

      <div className="sidebar-divider" />
      <p className="sidebar-section-label">Catalog & AI</p>
      <nav className="sidebar-nav">
        {(isAdmin || isVendor) && link('/products', '□', 'Products')}
        {link('/sentiment', '💬', 'Sentiment AI')}
        {(isAdmin || isVendor) && link('/studio', '✧', 'AI Studio')}
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
