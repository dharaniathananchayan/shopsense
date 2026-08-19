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

function RequireRole({ roles, children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="page"><p style={{color:'var(--muted)'}}>Loading…</p></div>
  if (!session?.access_token || !roles.includes(session.role)) return <Navigate to="/auth" replace />
  return children
}

function AppShell() {
  return (
    <div className="layout">
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
