import { useState, useEffect } from 'react'
import api from '../api'

function riskBadge(risk) {
  if (risk === 'CRITICAL') return <span className="badge badge-red">🚨 Critical Stockout Risk</span>
  if (risk === 'HIGH') return <span className="badge badge-red">⚠️ High Stockout Risk</span>
  if (risk === 'MODERATE') return <span className="badge badge-amber">⚡ Approaching Reorder Point</span>
  return <span className="badge badge-green">✓ Healthy Buffer</span>
}

function SvgForecastChart({ historical = [], forecast = [], productName = '' }) {
  // Combine all points to calculate dimensions
  const allPoints = [
    ...historical.map(h => ({ ...h, isForecast: false })),
    ...forecast.map(f => ({ ...f, isForecast: true }))
  ]

  if (allPoints.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>No historical sales points available.</div>
  }

  const maxVal = Math.max(
    ...historical.map(h => h.actual || 0),
    ...forecast.map(f => f.upper_bound || f.forecast || 0),
    4
  ) * 1.2

  const width = 850
  const height = 280
  const padLeft = 45
  const padRight = 30
  const padTop = 25
  const padBottom = 35
  const graphWidth = width - padLeft - padRight
  const graphHeight = height - padTop - padBottom

  const getX = (index) => padLeft + (index / Math.max(allPoints.length - 1, 1)) * graphWidth
  const getY = (val) => padTop + graphHeight - (Math.max(0, val || 0) / maxVal) * graphHeight

  // Historical path
  const histIndices = historical.map((_, i) => i)
  const histPath = histIndices.map((idx, i) => `${i === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(historical[i].actual)}`).join(' ')

  // Forecast path & confidence band
  const splitIndex = historical.length - 1
  const fcPoints = [
    { x: getX(splitIndex), y: getY(historical[historical.length - 1]?.actual || 0), lb: getY(historical[historical.length - 1]?.actual || 0), ub: getY(historical[historical.length - 1]?.actual || 0) },
    ...forecast.map((f, i) => ({
      x: getX(historical.length + i),
      y: getY(f.forecast),
      lb: getY(f.lower_bound),
      ub: getY(f.upper_bound),
      date: f.date,
      forecast: f.forecast,
    }))
  ]

  const fcPath = fcPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Upper bound line forward, Lower bound line backward to make polygon
  const upperPath = fcPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.ub}`).join(' ')
  const lowerPath = [...fcPoints].reverse().map((p) => `L ${p.x} ${p.lb}`).join(' ')
  const confidencePolygon = `${upperPath} ${lowerPath} Z`

  // Y-axis gridlines
  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal]

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: 'var(--surface-2)', borderRadius: 12, padding: '16px 8px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: 600 }}>
        <defs>
          <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="histAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y-Axis Grid */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={padLeft} y1={getY(tick)} x2={width - padRight} y2={getY(tick)} stroke="var(--line-2)" strokeDasharray="3,3" />
            <text x={padLeft - 8} y={getY(tick) + 4} fill="var(--muted)" fontSize="10" textAnchor="end" fontFamily="monospace">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {/* Vertical Split Line */}
        <line
          x1={getX(splitIndex)}
          y1={padTop}
          x2={getX(splitIndex)}
          y2={padTop + graphHeight}
          stroke="#8b5cf6"
          strokeWidth="1.5"
          strokeDasharray="4,4"
        />
        <text x={getX(splitIndex) - 6} y={padTop + 14} fill="#8b5cf6" fontSize="10" fontWeight="600" textAnchor="end">
          Today
        </text>

        {/* 95% Confidence Band */}
        <path d={confidencePolygon} fill="url(#confBandGrad)" />

        {/* Historical Line */}
        <path d={histPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Forecast Line */}
        <path d={fcPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6,4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Historical Points */}
        {historical.slice(-14).map((h, i) => {
          const idx = historical.length - 14 + i
          return (
            <circle
              key={`h-${idx}`}
              cx={getX(idx)}
              cy={getY(h.actual)}
              r="3.5"
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth="1"
            />
          )
        })}

        {/* Forecast Points */}
        {forecast.map((f, i) => {
          const idx = historical.length + i
          return (
            <g key={`f-${idx}`}>
              <circle
                cx={getX(idx)}
                cy={getY(f.forecast)}
                r="4"
                fill="#8b5cf6"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </g>
          )
        })}

        {/* Dates on X Axis */}
        {allPoints.filter((_, i) => i % Math.max(1, Math.floor(allPoints.length / 8)) === 0).map((p, i) => {
          const idx = allPoints.indexOf(p)
          return (
            <text key={i} x={getX(idx)} y={height - 10} fill="var(--muted)" fontSize="9" textAnchor="middle" fontFamily="monospace">
              {p.date ? p.date.slice(5) : ''}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 3, background: '#3b82f6', borderRadius: 2 }} />
          <span>Historical Daily Sales</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 3, background: '#8b5cf6', borderRadius: 2, borderBottom: '1px dashed #8b5cf6' }} />
          <span>ML Projected Demand (Mean)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 10, background: 'rgba(139, 92, 246, 0.25)', borderRadius: 2 }} />
          <span>95% Confidence Interval (ARIMA Bounds)</span>
        </div>
      </div>
    </div>
  )
}

export default function Forecasting() {
  const [products, setProducts]       = useState([])
  const [selectedPid, setSelectedPid] = useState(null)
  const [horizon, setHorizon]         = useState(14)
  const [leadTime, setLeadTime]       = useState(7)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [alerts, setAlerts]           = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [error, setError]             = useState('')

  // Load catalog products and reorder alerts
  useEffect(() => {
    const init = async () => {
      try {
        setAlertsLoading(true)
        const [prodRes, alertRes] = await Promise.all([
          api.get('/products', { params: { limit: 100 } }),
          api.get('/forecasting/reorder-alerts'),
        ])
        setProducts(prodRes.data)
        setAlerts(alertRes.data)
        if (prodRes.data.length > 0) {
          setSelectedPid(prodRes.data[0].id)
        }
      } catch (err) {
        setProducts([])
        setSelectedPid(null)
        setError(err.response?.data?.detail || err.message)
      } finally {
        setAlertsLoading(false)
      }
    }
    init()
  }, [])

  // Fetch forecast whenever selectedPid, horizon, or leadTime changes
  useEffect(() => {
    if (!selectedPid) return
    const fetchForecast = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/forecasting/product/${selectedPid}`, {
          params: { horizon_days: horizon, lead_time_days: leadTime }
        })
        setForecastData(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchForecast()
  }, [selectedPid, horizon, leadTime])

  const selectedProduct = products.find(p => p.id === selectedPid)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Machine Learning Inventory Forecasting</div>
        <div className="page-subtitle">
          Time-series forecasting models (ARIMA & Exponential Smoothing) predict upcoming SKU demand, compute Reorder Points (ROP), and prevent stockouts.
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span>{error}</span>
          {error.toLowerCase().includes('authenticated') && (
            <a href="/auth" className="btn btn-sm btn-primary" style={{ textDecoration: 'none' }}>
              Sign In to Authenticate
            </a>
          )}
        </div>
      )}

      {/* Top Configuration Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Target Product
              </label>
              <select
                className="field select"
                value={selectedPid || ''}
                onChange={e => setSelectedPid(Number(e.target.value))}
                style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '7px 12px', fontSize: 13, minWidth: 260 }}
                disabled={products.length === 0}
              >
                {products.length === 0 ? (
                  <option value="">No products available</option>
                ) : (
                  products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.category}) — Stock: {p.stock_quantity}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Forecast Horizon
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[7, 14, 30, 60].map(h => (
                  <button
                    key={h}
                    className={`btn ${horizon === h ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setHorizon(h)}
                  >
                    {h} Days
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Supplier Lead Time: <strong>{leadTime} days</strong>
              </label>
              <input
                type="range" min="1" max="30"
                value={leadTime}
                onChange={e => setLeadTime(Number(e.target.value))}
                style={{ width: 140 }}
              />
            </div>
          </div>

          <div>
            <span className="badge badge-violet" style={{ fontSize: 11 }}>
              🧠 {forecastData?.model_name || 'ARIMA Time-Series'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      {forecastData && (
        <div className="metric-grid" style={{ marginBottom: 20 }}>
          <div className="metric-card">
            <div className="metric-label">Predicted {horizon}-Day Demand</div>
            <div className="metric-value" style={{ color: 'var(--violet)' }}>
              {forecastData.total_predicted_demand} <span style={{ fontSize: 14, color: 'var(--muted)' }}>units</span>
            </div>
            <div className="metric-foot neutral">
              Avg ~{forecastData.avg_daily_demand} units/day
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Current Stock vs ROP</div>
            <div className="metric-value">
              {forecastData.current_stock} <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ {forecastData.reorder_point} ROP</span>
            </div>
            <div className="metric-foot neutral">
              Safety Stock: {forecastData.safety_stock} units (95% SL)
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Days to Stockout</div>
            <div className="metric-value" style={{ color: forecastData.days_until_stockout <= 7 ? 'var(--red)' : 'var(--text)' }}>
              {forecastData.days_until_stockout !== null ? `~${forecastData.days_until_stockout} days` : 'Adequate'}
            </div>
            <div className="metric-foot">{riskBadge(forecastData.stockout_risk)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Recommended Reorder</div>
            <div className="metric-value" style={{ color: forecastData.recommended_reorder_qty > 0 ? 'var(--amber)' : 'var(--green)' }}>
              {forecastData.recommended_reorder_qty} <span style={{ fontSize: 14, color: 'var(--muted)' }}>units</span>
            </div>
            <div className="metric-foot neutral">
              Model MAPE: {forecastData.model_metrics?.mape}% (RMSE: {forecastData.model_metrics?.rmse})
            </div>
          </div>
        </div>
      )}

      {/* Main Forecast Visualization */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <div className="card-title">
              Demand Forecast Trajectory: {forecastData?.product_name || 'Loading...'}
            </div>
            <div className="card-sub">
              Historical daily unit sales (blue) and out-of-sample projected demand with 95% confidence bounds (purple).
            </div>
          </div>
          {loading && <span className="spinner" />}
        </div>
        <div className="card-body">
          {forecastData ? (
            <SvgForecastChart
              historical={forecastData.historical_series}
              forecast={forecastData.forecast_series}
              productName={forecastData.product_name}
            />
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <span style={{ color: 'var(--muted)' }}>
                  {error ? 'Unable to load products and forecasts.' : 'Select a product to generate its forecast.'}
                </span>
              )}
            </div>
          )}

          {forecastData?.summary_insight && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--surface-3)', borderRadius: 8, borderLeft: '3px solid var(--violet)', fontSize: 13 }}>
              <strong>AI Inventory Insight: </strong> {forecastData.summary_insight}
            </div>
          )}
        </div>
      </div>

      {/* Catalog-wide ML Reorder Alerts */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Catalog Inventory Restock Advisor</div>
            <div className="card-sub">
              Prioritized restock recommendations computed across all catalog SKUs based on sales velocity and lead time.
            </div>
          </div>
          <span className="badge badge-amber">{alerts.filter(a => a.stockout_risk !== 'LOW').length} Action Items</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Reorder Point (ROP)</th>
                  <th>Daily Velocity</th>
                  <th>Days Left</th>
                  <th>Restock Qty</th>
                  <th>Urgency / Risk</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alertsLoading ? (
                  [1, 2, 3, 4].map(i => <tr key={i}><td colSpan={9}><div className="skeleton skeleton-row" /></td></tr>)
                ) : alerts.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>All SKUs have adequate stock.</td></tr>
                ) : (
                  alerts.map(item => (
                    <tr key={item.product_id} style={{ background: item.product_id === selectedPid ? 'var(--surface-3)' : 'transparent' }}>
                      <td>
                        <strong className="td-primary">{item.product_name}</strong>
                      </td>
                      <td>{item.category || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.current_stock}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>
                        {item.reorder_point} <span style={{ fontSize: 11 }}>(SS: {item.safety_stock})</span>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        ~{item.avg_daily_demand}/d
                      </td>
                      <td style={{ fontWeight: 600, color: item.days_until_stockout <= 7 ? 'var(--red)' : 'inherit' }}>
                        {item.days_until_stockout !== null ? `${item.days_until_stockout}d` : '∞'}
                      </td>
                      <td>
                        {item.recommended_reorder_qty > 0 ? (
                          <span className="badge badge-amber">+{item.recommended_reorder_qty} units</span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>{riskBadge(item.stockout_risk)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedPid(item.product_id)}
                        >
                          Forecast →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
