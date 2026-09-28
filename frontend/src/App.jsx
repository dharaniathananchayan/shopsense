import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
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
import Vendors         from './pages/Vendors'
import Customers       from './pages/Customers'
import Studio          from './pages/Studio'
import Sentiment       from './pages/Sentiment'
import Auth            from './pages/Auth'
import Approvals       from './pages/Approvals'
import Analyst         from './pages/Analyst'
import Shop            from './pages/Shop'
import YouMightLike    from './pages/YouMightLike'
import Cart            from './pages/Cart'
import Orders          from './pages/Orders'
import Wishlists       from './pages/Wishlists'
import ProductDetail   from './pages/ProductDetail'
import Compare         from './pages/Compare'
import { CompareProvider, useCompare } from './context/CompareContext'
import ShoppingAssistant from './components/ShoppingAssistant'

function RequireRole({ roles, children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="page"><p style={{color:'var(--muted)'}}>Loading…</p></div>
  if (!session?.access_token || !roles.includes(session.role)) return <Navigate to="/auth" replace />
  return children
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="page"><p style={{color:'var(--muted)'}}>Loading…</p></div>
  if (!session?.access_token) return <Navigate to="/auth" replace />
  return children
}

function AppShell() {
  const { session } = useAuth()
  const location = useLocation()
  const [saleNotification, setSaleNotification] = useState(null)

  const showSidebar = location.pathname !== '/auth'

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
    <div className={`layout ${!showSidebar ? 'no-sidebar' : ''}`}>
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

      {showSidebar && <Sidebar />}
      <div className="main-content">
        <Topbar />
        <Routes>
          <Route path="/"               element={<RequireRole roles={['ADMIN', 'VENDOR']}><Overview /></RequireRole>} />
          <Route path="/auth"           element={<Auth />} />
          <Route path="/recommendations" element={<RequireRole roles={['ADMIN', 'VENDOR']}><Recommendations /></RequireRole>} />
          <Route path="/sentiment"      element={<RequireRole roles={['ADMIN', 'VENDOR']}><Sentiment /></RequireRole>} />
          <Route path="/forecasting"    element={<RequireRole roles={['ADMIN', 'VENDOR']}><Forecasting /></RequireRole>} />
          <Route path="/analytics"      element={<RequireRole roles={['ADMIN']}><Analytics /></RequireRole>} />
          <Route path="/inventory"      element={<RequireRole roles={['ADMIN','VENDOR']}><Inventory /></RequireRole>} />
          <Route path="/segments"       element={<RequireRole roles={['ADMIN']}><Segments /></RequireRole>} />
          <Route path="/diagnostics"    element={<RequireRole roles={['ADMIN']}><Validation /></RequireRole>} />
          <Route path="/products"       element={<RequireRole roles={['ADMIN','VENDOR']}><Products /></RequireRole>} />
          <Route path="/vendors"        element={<RequireRole roles={['ADMIN']}><Vendors /></RequireRole>} />
          <Route path="/customers"      element={<RequireRole roles={['ADMIN']}><Customers /></RequireRole>} />
          <Route path="/studio"         element={<RequireRole roles={['ADMIN','VENDOR']}><Studio /></RequireRole>} />
          <Route path="/analyst"        element={<RequireRole roles={['ADMIN','VENDOR']}><Analyst /></RequireRole>} />
          <Route path="/approvals"      element={<RequireRole roles={['ADMIN']}><Approvals /></RequireRole>} />
          <Route path="/shop"           element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><Shop /></RequireRole>} />
          <Route path="/you-might-like" element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><YouMightLike /></RequireRole>} />
          <Route path="/cart"           element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><Cart /></RequireRole>} />
          <Route path="/orders"         element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><Orders /></RequireRole>} />
          <Route path="/wishlists"      element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><Wishlists /></RequireRole>} />
          <Route path="/product/:id"    element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><ProductDetail /></RequireRole>} />
          <Route path="/compare"        element={<RequireRole roles={['ADMIN', 'CUSTOMER']}><Compare /></RequireRole>} />
          <Route path="*"               element={<Navigate to={session?.role === 'CUSTOMER' ? '/shop' : '/'} replace />} />
        </Routes>
      </div>

      {/* Floating RAG AI Shopping Assistant - hide for customers for now, or maybe they can use it? Assuming hiding if they are a customer just in case it's for vendors/admins. The prompt didn't specify, but it's a "Shopping Assistant". Let's leave it. */}
      {location.pathname !== '/auth' && <ShoppingAssistant />}
    </div>
  )
}


function CompareDock() {
  const { compareItems, clearCompare } = useCompare()
  const navigate = useNavigate()
  
  if (compareItems.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 40, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 999 }}>
      <div style={{ fontWeight: 600 }}>{compareItems.length} / 4 Products to Compare</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={clearCompare}>Clear</button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/compare')}>Compare Now</button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CompareProvider>
            <AppShell />
            <CompareDock />
          </CompareProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
