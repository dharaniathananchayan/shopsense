import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'
import { useCart } from '../context/CartContext'
import api from '../api'

export default function Compare() {
  const { compareItems, toggleCompare, clearCompare } = useCompare()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState({})

  useEffect(() => {
    // Fetch AI summaries for the compared products to show side-by-side AI pros/cons
    compareItems.forEach(async (p) => {
      if (!summaries[p.id]) {
        try {
          const res = await api.get(`/reviews/product/${p.id}/summary`)
          setSummaries(prev => ({ ...prev, [p.id]: res.data }))
        } catch (e) {
          console.warn(`No summary for ${p.id}`)
        }
      }
    })
  }, [compareItems])

  const getImageUrl = (url) => {
    if (url) {
      if (url.startsWith('http')) return url;
      return `http://127.0.0.1:8000${url}`;
    }
    return null;
  }

  if (compareItems.length === 0) {
    return (
      <div className="page" style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', padding: '100px 0' }}>
        <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 24 }}>⇄</div>
        <h2>No products to compare</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Add products to your comparison list while browsing the shop.</p>
        <button className="btn btn-primary" onClick={() => navigate('/shop')}>Go Shopping</button>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Compare Products</div>
          <div className="page-subtitle">Side-by-side comparison of your selected items.</div>
        </div>
        <button className="btn btn-secondary" onClick={clearCompare}>Clear All</button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <tbody>
            {/* Images Row */}
            <tr>
              <th style={{ width: 150, padding: 24, textAlign: 'left', background: 'var(--canvas)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>Product</th>
              {compareItems.map(p => (
                <td key={`img-${p.id}`} style={{ padding: 24, textAlign: 'center', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)', verticalAlign: 'top', width: `${100/compareItems.length}%` }}>
                  <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px', borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button 
                      onClick={() => toggleCompare(p)}
                      style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontSize: 14, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >&times;</button>
                    {getImageUrl(p.image_url) ? (
                      <img src={getImageUrl(p.image_url)} alt={p.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 32, opacity: 0.2 }}>📦</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 16, margin: '0 0 8px', color: 'var(--ink)' }}>{p.product_name}</h3>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--violet)' }}>₹{Number(p.price).toFixed(2)}</div>
                </td>
              ))}
            </tr>
            {/* Category Row */}
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', background: 'var(--canvas)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>Category</th>
              {compareItems.map(p => (
                <td key={`cat-${p.id}`} style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)', textAlign: 'center' }}>
                  <span className="badge badge-ghost">{p.category}</span>
                </td>
              ))}
            </tr>
            {/* AI Sentiment Row */}
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', background: 'var(--canvas)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>AI Consensus</th>
              {compareItems.map(p => {
                const s = summaries[p.id]
                return (
                  <td key={`sent-${p.id}`} style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)', verticalAlign: 'top', fontSize: 14, color: 'var(--ink)' }}>
                    {s ? s.consensus_summary : <span style={{ color: 'var(--muted)' }}>No reviews yet</span>}
                  </td>
                )
              })}
            </tr>
            {/* Pros */}
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', background: 'var(--canvas)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>Top Pros</th>
              {compareItems.map(p => {
                const s = summaries[p.id]
                return (
                  <td key={`pros-${p.id}`} style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)', verticalAlign: 'top', fontSize: 14 }}>
                    {s && s.top_pros.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--green)' }}>
                        {s.top_pros.slice(0,3).map((pro, i) => <li key={i}>{pro}</li>)}
                      </ul>
                    ) : '-'}
                  </td>
                )
              })}
            </tr>
            {/* Description Row */}
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', background: 'var(--canvas)', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontWeight: 600 }}>Description</th>
              {compareItems.map(p => (
                <td key={`desc-${p.id}`} style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', borderLeft: '1px solid var(--line)', verticalAlign: 'top', fontSize: 14, color: 'var(--ink)' }}>
                  {p.description || '-'}
                </td>
              ))}
            </tr>
            {/* Action Row */}
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', background: 'var(--canvas)', color: 'var(--muted)', fontWeight: 600 }}>Action</th>
              {compareItems.map(p => (
                <td key={`act-${p.id}`} style={{ padding: '16px 24px', borderLeft: '1px solid var(--line)', textAlign: 'center' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => addToCart(p)}>Add to Cart</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
