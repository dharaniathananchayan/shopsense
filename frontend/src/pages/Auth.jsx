import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('login')
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [registerData, setRegisterData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'VENDOR',
    vendor_id: '',
  })

  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setNotice(null)
    setLoading(true)
    try {
      await login(loginData.email, loginData.password)
      navigate('/')
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Login failed. Please check credentials.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setNotice(null)
    setLoading(true)
    try {
      const payload = {
        full_name: registerData.full_name,
        email: registerData.email,
        password: registerData.password,
        role: registerData.role,
      }
      if (registerData.role === 'VENDOR') {
        payload.vendor_id = parseInt(registerData.vendor_id, 10)
      }
      await register(payload)
      setTab('login')
      setLoginData({ email: registerData.email, password: '' })
      setNotice({
        type: 'success',
        message: 'Account created successfully! You can now sign in.',
      })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Registration failed.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="auth-wall">
        <h2>Welcome to ShopSense</h2>
        <p className="card-sub">
          {tab === 'login'
            ? 'Sign in to access your dashboard, catalog, and analytics.'
            : 'Create an account to manage your listings.'}
        </p>

        <div className="tabs">
          <button
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login')
              setNotice(null)
            }}
          >
            Sign In
          </button>
          <button
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register')
              setNotice(null)
            }}
          >
            Create Account
          </button>
        </div>

        {notice && (
          <div className={`alert alert-${notice.type}`} style={{ marginBottom: 18 }}>
            {notice.message}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="form-grid">
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={loginData.email}
                onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={loginData.password}
                onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" /> : 'Sign In Securely'}
            </button>

          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="form-grid">
            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={registerData.full_name}
                onChange={(e) => setRegisterData((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={registerData.email}
                onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={registerData.password}
                onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Role</label>
              <select
                value={registerData.role}
                onChange={(e) => setRegisterData((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="VENDOR">Vendor</option>
                <option value="ADMIN">Administrator (Initial setup only)</option>
              </select>
            </div>

            {registerData.role === 'VENDOR' && (
              <div className="field">
                <label>Vendor ID</label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="e.g. 1"
                  value={registerData.vendor_id}
                  onChange={(e) => setRegisterData((prev) => ({ ...prev, vendor_id: e.target.value }))}
                />
                <span className="field-help">Your marketplace admin provides this Vendor ID.</span>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
