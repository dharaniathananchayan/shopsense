import { useState, useEffect } from 'react'
import api from '../api'

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ChartAnalytics() {
  const [salesTrends, setSalesTrends] = useState(null)
  const [categoryDist, setCategoryDist] = useState(null)
  const [vendorPerf, setVendorPerf] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [metricView, setMetricView] = useState('revenue') // 'revenue' | 'orders' | 'both'
  const [daysFilter, setDaysFilter] = useState(30)
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState(null)
  const [hoveredCatIdx, setHoveredCatIdx] = useState(null)

  const CATEGORY_COLORS = [
    '#2563eb', // Blue
    '#10b981', // Emerald green
    '#f59e0b', // Amber/Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
  ]

  useEffect(() => {
    fetchCharts()
  }, [daysFilter])

  const fetchCharts = async () => {
    setLoading(true)
    setError('')
    try {
      const [trendsRes, catRes, vendRes] = await Promise.all([
        api.get(`/analytics/charts/sales-trends?days=${daysFilter}`),
        api.get('/analytics/charts/category-distribution'),
        api.get('/analytics/charts/vendor-performance?limit=10'),
      ])
      setSalesTrends(trendsRes.data)
      setCategoryDist(catRes.data)
      setVendorPerf(vendRes.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- SVG Line & Area Chart calculations for Sales Trends ---
  const renderTrendsChart = () => {
    if (!salesTrends || !salesTrends.labels || salesTrends.labels.length === 0) {
      return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No sales trend data available.</div>
    }

    const labels = salesTrends.labels
    const revData = salesTrends.datasets.find(d => d.label.includes('Revenue'))?.data || []
    const orderData = salesTrends.datasets.find(d => d.label.includes('Order'))?.data || []

    const maxRev = Math.max(...revData, 1)
    const maxOrders = Math.max(...orderData, 1)

    const width = 800
    const height = 260
    const padding = 40

    // Compute coordinates for revenue line
    const pointsRev = revData.map((val, idx) => {
      const x = padding + (idx / Math.max(labels.length - 1, 1)) * (width - 2 * padding)
      const y = height - padding - (val / maxRev) * (height - 2 * padding)
      return { x, y, val, label: labels[idx], orders: orderData[idx] || 0 }
    })

    // Compute coordinates for orders line
    const pointsOrders = orderData.map((val, idx) => {
      const x = padding + (idx / Math.max(labels.length - 1, 1)) * (width - 2 * padding)
      const y = height - padding - (val / maxOrders) * (height - 2 * padding)
      return { x, y, val, label: labels[idx] }
    })

    const pathDRev = pointsRev.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')
    const areaDRev = `${pathDRev} L ${pointsRev[pointsRev.length - 1]?.x} ${height - padding} L ${pointsRev[0]?.x} ${height - padding} Z`

    const pathDOrders = pointsOrders.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')

    return (
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding + pct * (height - 2 * padding)
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                  {metricView === 'orders'
                    ? Math.round(maxOrders * (1 - pct))
                    : `₹${Math.round((maxRev * (1 - pct)) / 1000)}k`}
                </text>
              </g>
            )
          })}

          {/* Area fill for Revenue */}
          {(metricView === 'revenue' || metricView === 'both') && (
            <path d={areaDRev} fill="url(#revGradient)" />
          )}

          {/* Line for Revenue */}
          {(metricView === 'revenue' || metricView === 'both') && (
            <path d={pathDRev} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Line for Orders */}
          {(metricView === 'orders' || metricView === 'both') && (
            <path d={pathDOrders} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray={metricView === 'both' ? '6 3' : 'none'} strokeLinecap="round" />
          )}

          {/* Interactive dots */}
          {pointsRev.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={metricView === 'orders' ? pointsOrders[idx].y : p.y}
              r={hoveredTrendIdx === idx ? 6 : 4}
              fill={metricView === 'orders' ? '#10b981' : '#2563eb'}
              stroke="#ffffff"
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={() => setHoveredTrendIdx(idx)}
              onMouseLeave={() => setHoveredTrendIdx(null)}
            />
          ))}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredTrendIdx !== null && pointsRev[hoveredTrendIdx] && (
          <div
            style={{
              position: 'absolute',
              top: Math.max(10, pointsRev[hoveredTrendIdx].y - 65),
              left: `${(pointsRev[hoveredTrendIdx].x / width) * 100}%`,
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 11 }}>Date: {pointsRev[hoveredTrendIdx].label}</div>
            <div style={{ color: '#60a5fa' }}>Revenue: ₹{fmt(pointsRev[hoveredTrendIdx].val)}</div>
            <div style={{ color: '#34d399' }}>Orders: {pointsRev[hoveredTrendIdx].orders}</div>
          </div>
        )}
      </div>
    )
  }

  // --- SVG Donut Chart calculations for Category Distribution ---
  const renderCategoryDonut = () => {
    if (!categoryDist || !categoryDist.labels || categoryDist.labels.length === 0) {
      return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No category distribution data available.</div>
    }

    const { labels, series, percentages } = categoryDist
    const totalRev = series.reduce((a, b) => a + b, 0)

    let accumulatedAngle = 0
    const slices = series.map((val, idx) => {
      const pct = percentages[idx]
      const angle = (pct / 100) * 360
      const startAngle = accumulatedAngle
      accumulatedAngle += angle
      return {
        label: labels[idx],
        val,
        pct,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        startAngle,
        angle
      }
    })

    // SVG Donut slice path generator
    const getSlicePath = (startAngle, angle, outerR = 90, innerR = 55) => {
      const cx = 100
      const cy = 100
      const startRad = (startAngle - 90) * (Math.PI / 180)
      const endRad = (startAngle + angle - 90) * (Math.PI / 180)

      const x1 = cx + outerR * Math.cos(startRad)
      const y1 = cy + outerR * Math.sin(startRad)
      const x2 = cx + outerR * Math.cos(endRad)
      const y2 = cy + outerR * Math.sin(endRad)

      const x3 = cx + innerR * Math.cos(endRad)
      const y3 = cy + innerR * Math.sin(endRad)
      const x4 = cx + innerR * Math.cos(startRad)
      const y4 = cy + innerR * Math.sin(startRad)

      const largeArc = angle > 180 ? 1 : 0

      return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
    }

    const activeSlice = hoveredCatIdx !== null ? slices[hoveredCatIdx] : null

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'center' }}>
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
            {slices.map((slice, idx) => (
              <path
                key={slice.label}
                d={getSlicePath(slice.startAngle, slice.angle, hoveredCatIdx === idx ? 94 : 90)}
                fill={slice.color}
                style={{ cursor: 'pointer', transition: 'all 0.2s', opacity: hoveredCatIdx !== null && hoveredCatIdx !== idx ? 0.6 : 1 }}
                onMouseEnter={() => setHoveredCatIdx(idx)}
                onMouseLeave={() => setHoveredCatIdx(null)}
              />
            ))}
          </svg>

          {/* Central Donut Text */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
              {activeSlice ? activeSlice.label : 'Total Revenue'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
              ₹{fmt(activeSlice ? activeSlice.val : totalRev)}
            </div>
            {activeSlice && (
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                {activeSlice.pct}% share
              </div>
            )}
          </div>
        </div>

        {/* Legend Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slices.map((slice, idx) => (
            <div
              key={slice.label}
              onMouseEnter={() => setHoveredCatIdx(idx)}
              onMouseLeave={() => setHoveredCatIdx(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 1fr 90px 50px',
                gap: 8,
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 6,
                background: hoveredCatIdx === idx ? 'var(--canvas-elevated, #f1f5f9)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'background 0.15s'
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 3, background: slice.color }} />
              <span style={{ fontWeight: 600 }}>{slice.label}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(slice.val)}</span>
              <span style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12 }}>{slice.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- Multi-Bar Chart for Top Vendor Performance ---
  const renderVendorPerformanceChart = () => {
    if (!vendorPerf || !vendorPerf.labels || vendorPerf.labels.length === 0) {
      return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No vendor performance data available.</div>
    }

    const { labels, revenue_dataset, sales_dataset } = vendorPerf
    const maxRev = Math.max(...revenue_dataset, 1)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {labels.map((vendorName, idx) => {
          const rev = revenue_dataset[idx] || 0
          const sales = sales_dataset[idx] || 0
          const pct = Math.round((rev / maxRev) * 100)
          const barColor = idx === 0 ? '#2563eb' : idx === 1 ? '#0284c7' : idx === 2 ? '#0d9488' : '#64748b'

          return (
            <div key={vendorName} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 110px 80px', gap: 12, alignItems: 'center', fontSize: 13 }}>
              {/* Vendor Rank & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: idx < 3 ? 'var(--primary)' : 'var(--muted-bg, #cbd5e1)',
                    color: idx < 3 ? '#fff' : '#475569',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ fontWeight: 600 }} title={vendorName}>{vendorName}</span>
              </div>

              {/* Multi Bar Progress */}
              <div className="progress-bar" style={{ width: '100%', height: 10, background: 'var(--canvas-elevated, #e2e8f0)', borderRadius: 5 }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 5,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              {/* Revenue Metric */}
              <strong style={{ textAlign: 'right' }}>₹{fmt(rev)}</strong>

              {/* Order Count Metric */}
              <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
                {sales} orders
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Feature 1 Dashboard Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📈</span> Interactive Chart Analytics
            </div>
            <div className="card-sub">Real-time SQL pre-aggregated data visualizations for trends, distribution, and vendor benchmarks.</div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {/* Days Filter */}
            <select
              className="input"
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. Daily Sales Trends Line & Area Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">Daily Sales & Revenue Trends</div>
            <div className="card-sub">Time-series tracking revenue (₹) and completed order volumes (`/analytics/charts/sales-trends`)</div>
          </div>

          {/* Metric Toggle */}
          <div style={{ display: 'flex', background: 'var(--canvas-elevated, #f1f5f9)', borderRadius: 6, padding: 3 }}>
            {[
              ['revenue', 'Revenue (₹)'],
              ['orders', 'Order Count'],
              ['both', 'Combined View']
            ].map(([key, label]) => (
              <button
                key={key}
                className="btn btn-xs"
                onClick={() => setMetricView(key)}
                style={{
                  background: metricView === key ? 'var(--primary, #2563eb)' : 'transparent',
                  color: metricView === key ? '#ffffff' : 'var(--muted)',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="skeleton skeleton-row" style={{ height: 220 }} />
          ) : (
            renderTrendsChart()
          )}
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* 2. Category Distribution Donut Chart */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Category Distribution</div>
              <div className="card-sub">Category revenue share (`/analytics/charts/category-distribution`)</div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="skeleton skeleton-row" style={{ height: 180 }} />
            ) : (
              renderCategoryDonut()
            )}
          </div>
        </div>

        {/* 3. Vendor Performance Leaderboard Bar Chart */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Vendor Performance Multi-Bar Leaderboard</div>
              <div className="card-sub">Comparative revenue & order counts (`/analytics/charts/vendor-performance`)</div>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="skeleton skeleton-row" style={{ height: 180 }} />
            ) : (
              renderVendorPerformanceChart()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
