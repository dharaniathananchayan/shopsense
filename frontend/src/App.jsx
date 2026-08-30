import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Overview        from './pages/Overview'
import Analytics       from './pages/Analytics'
import Inventory       from './pages/Inventory'
import Forecasting     from './pages/Forecasting'
import Segments        from './pages/Segments'
import Recommendations from './pages/Recommendations'
import Validation      from './pages/Validation'
import Products        from './pages/Products'
import Studio          from './pages/Studio'
import Sentiment       from './pages/Sentiment'
import Auth            from './pages/Auth'
import Approvals       from './pages/Approvals'
import ShoppingAssistant from './components/ShoppingAssistant'

function RequireRole({ roles, children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="page"><p style={{color:'var(--muted)'}}>Loading…</p></div>
  if (!session?.access_token || !roles.includes(session.role)) return <Navigate to="/auth" replace />
  return children
}

function AppShell() {
  const [saleNotification, setSaleNotification] = useState(null)

  useEffect(() => {
    // Establish WebSocket connection for real-time sales stream
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/ws/sales`
    let ws = null

    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'NEW_SALE') {
            setSaleNotification(msg.data)
            setTimeout(() => setSaleNotification(null), 6000)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }
    } catch (e) {
      console.warn('WebSocket connection failed:', e)
    }

    return () => {
      if (ws) ws.close()
    }
  }, [])

  return (
    <div className="layout">
      {/* Real-time WebSocket Sales Toast Notification */}
      {saleNotification && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 10000,
            background: '#064e3b',
            color: '#ecfdf5',
            padding: '12px 18px',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '1px solid #10b981',
            animation: 'fadeIn 0.3s'
          }}
        >
          <span style={{ fontSize: 20 }}>🛒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#34d399' }}>
              Real-Time Sale Notification!
            </div>
            <div style={{ fontSize: 12 }}>
              <strong>{saleNotification.product_name}</strong> ({saleNotification.quantity}x) sold for <strong>₹{saleNotification.total_amount?.toFixed(2)}</strong> via {saleNotification.sales_platform}
            </div>
            <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
              Vendor: {saleNotification.vendor_name} • {saleNotification.timestamp}
            </div>
          </div>
          <button
            onClick={() => setSaleNotification(null)}
            style={{ background: 'transparent', border: 'none', color: '#a7f3d0', cursor: 'pointer', fontSize: 14, marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      <Sidebar />
      <div className="main-content">
        <Topbar />
        <Routes>
          <Route path="/"               element={<Overview />} />
          <Route path="/auth"           element={<Auth />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/sentiment"      element={<Sentiment />} />
          <Route path="/forecasting"    element={<Forecasting />} />
          <Route path="/analytics"      element={<RequireRole roles={['ADMIN']}><Analytics /></RequireRole>} />
          <Route path="/inventory"      element={<RequireRole roles={['ADMIN','VENDOR']}><Inventory /></RequireRole>} />
          <Route path="/segments"       element={<RequireRole roles={['ADMIN']}><Segments /></RequireRole>} />
          <Route path="/validation"     element={<RequireRole roles={['ADMIN']}><Validation /></RequireRole>} />
          <Route path="/products"       element={<RequireRole roles={['ADMIN','VENDOR']}><Products /></RequireRole>} />
          <Route path="/studio"         element={<RequireRole roles={['ADMIN','VENDOR']}><Studio /></RequireRole>} />
          <Route path="/approvals"      element={<RequireRole roles={['ADMIN']}><Approvals /></RequireRole>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Floating RAG AI Shopping Assistant */}
      <ShoppingAssistant />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  )
}

