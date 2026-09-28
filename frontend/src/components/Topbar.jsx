import { useState } from 'react'
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
  const isCustomer = session?.role === 'CUSTOMER'

  const [priceDropAlert, setPriceDropAlert] = useState(null)

  const simulatePriceDrop = async () => {
    try {
      const apiModule = (await import('../api')).default
      const res = await apiModule.get('/wishlists')
      const wishlists = res.data

      let alertedItem = null
      let wishlistName = ''
      for (const w of wishlists) {
        const item = w.items.find(i => i.alerts_enabled)
        if (item) {
          alertedItem = item
          wishlistName = w.name
          break
        }
      }
      
      if (alertedItem) {
        const oldPrice = Number(alertedItem.price)
        const drop = Math.floor(oldPrice * 0.2) // 20% drop
        const newPrice = oldPrice - drop
        setPriceDropAlert({
          product_name: alertedItem.product_name,
          wishlist: wishlistName,
          oldPrice,
          newPrice,
          drop
        })
        setTimeout(() => setPriceDropAlert(null), 5000)
      } else {
        alert("Enable 'Price Alerts' on at least one item in your Wishlist to see this simulation!")
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <header className="topbar">
      {priceDropAlert && (
        <div style={{ position: 'fixed', top: 70, right: 20, background: 'var(--green)', color: '#fff', padding: '20px 24px', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 9999, minWidth: 300, animation: 'slideIn 0.3s ease-out' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>📉 Price Drop Alert!</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            Good news! <strong>{priceDropAlert.product_name}</strong> from your <em>{priceDropAlert.wishlist}</em> list just went on sale.
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>₹{priceDropAlert.oldPrice.toFixed(2)}</span>
            <span style={{ fontSize: 24, fontWeight: 900 }}>₹{priceDropAlert.newPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="topbar-breadcrumb">
        <strong>ShopSense</strong>
        <span style={{ color: 'var(--line-2)' }}>/</span>
        <span>{title}</span>
      </div>
      <div className="topbar-right">
        {session ? (
          <>
            {isCustomer && (
              <button
                className="btn btn-secondary btn-xs"
                onClick={simulatePriceDrop}
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', borderColor: 'var(--green)', background: 'rgba(34, 197, 94, 0.1)' }}
                title="Simulate a price drop alert notification"
              >
                <span>🔔</span> Simulate Price Drop
              </button>
            )}
            {!isCustomer && (
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
            )}
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
