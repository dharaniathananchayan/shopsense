import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TITLES = {
  '/':               'Overview',
  '/analytics':      'Analytics',
  '/inventory':      'Inventory',
  '/segments':       'Customer Segments',
  '/recommendations':'Recommendations',
  '/validation':     'Data Validation',
  '/products':       'Products',
  '/studio':         'AI Studio',
  '/auth':           'Sign in',
  '/approvals':      'Vendor Approvals',
}

export default function Topbar() {
  const { session, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = TITLES[pathname] ?? 'ShopSense'
  const initial = session ? (session.full_name || session.email || '?')[0].toUpperCase() : null

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <strong>ShopSense</strong>
        <span style={{ color: 'var(--line-2)' }}>/</span>
        <span>{title}</span>
      </div>
      <div className="topbar-right">
        {session ? (
          <>
            <button
              className="btn btn-secondary btn-xs"
              onClick={async () => {
                try {
                  const apiModule = (await import('../api')).default
                  await apiModule.post('/ws/simulate-sale')
                } catch (e) {
                  console.error(e)
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              title="Simulate a real-time sale transaction over WebSockets"
            >
              <span>⚡</span> Simulate Sale
            </button>
            <div className="topbar-avatar">{initial}</div>
            <div className="topbar-user">
              <strong>{session.full_name || session.email}</strong>
              <small>{session.role?.toLowerCase()}</small>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/') }}>
              Sign out
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
