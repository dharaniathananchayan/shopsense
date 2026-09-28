import { useEffect, useState, useMemo } from 'react'
import api from '../api'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [trackingOrder, setTrackingOrder] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/orders/me')
      setOrders(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelOrderGroup = async (transactions) => {
    if (!window.confirm("Are you sure you want to cancel this entire order?")) return;
    try {
      await Promise.all(transactions.map(t => 
        t.order_status === 'PROCESSING' ? api.put(`/orders/${t.id}/cancel`) : Promise.resolve()
      ))
      fetchOrders()
    } catch (err) {
      alert("Failed to cancel order")
    }
  }

  const getImageUrl = (url) => {
    if (url) {
      if (url.startsWith('http')) return url;
      return `http://127.0.0.1:8000${url}?t=${Date.now()}`;
    }
    return null;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED': return <span className="badge badge-green">Delivered</span>
      case 'SHIPPED': return <span className="badge badge-blue">Shipped</span>
      case 'PROCESSING': return <span className="badge badge-amber">Processing</span>
      case 'CANCELLED': return <span className="badge badge-red">Cancelled</span>
      default: return <span className="badge badge-ghost">{status}</span>
    }
  }

  // Group transactions by date string to simulate a single checkout Order
  const groupedOrders = useMemo(() => {
    const groups = {}
    orders.forEach(t => {
      const dateStr = new Date(t.transaction_date).toLocaleDateString()
      if (!groups[dateStr]) {
        groups[dateStr] = {
          dateStr,
          transactions: [],
          total: 0,
          status: t.order_status,
          orderId: t.id
        }
      }
      groups[dateStr].transactions.push(t)
      groups[dateStr].total += t.total_amount
      
      // Compute overall status hierarchy
      if (t.order_status === 'PROCESSING') groups[dateStr].status = 'PROCESSING'
      else if (t.order_status === 'SHIPPED' && groups[dateStr].status !== 'PROCESSING') groups[dateStr].status = 'SHIPPED'
    })
    return Object.values(groups).sort((a, b) => b.orderId - a.orderId)
  }, [orders])

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">My Orders</div>
        <div className="page-subtitle">Track your current orders and view your purchase history.</div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <span className="spinner" style={{ marginRight: 8 }} /> Loading orders...
        </div>
      ) : groupedOrders.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>You haven't placed any orders. Start shopping to see your history here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedOrders.map(group => (
            <div key={group.dateStr} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Order Meta Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--canvas)', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Order Placed</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 4 }}>{group.dateStr}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Amount</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', marginTop: 4 }}>₹{Number(group.total).toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Order # {group.orderId}</div>
                  <div style={{ marginTop: 4 }}>
                    <a href="#" style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }} onClick={e => e.preventDefault()}>View Invoice</a>
                  </div>
                </div>
              </div>

              {/* Order Body */}
              <div className="card-body" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  {getStatusBadge(group.status)}
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>
                    {group.status === 'DELIVERED' ? 'Successfully Delivered' : 
                     group.status === 'SHIPPED' ? 'On the way' : 
                     group.status === 'PROCESSING' ? 'Preparing for shipment' : 'Order Cancelled'}
                  </h3>
                </div>

                {/* Horizontal Product Strip */}
                <div style={{ display: 'flex', overflowX: 'auto', gap: 24, paddingBottom: 16 }}>
                  {group.transactions.map(t => (
                    <div 
                      key={t.id} 
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 300, maxWidth: 350, cursor: 'pointer' }}
                      onClick={() => window.location.href = `/product/${t.product_id}`}
                    >
                      <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', background: '#fff' }}>
                        {getImageUrl(t.image_url) ? (
                          <img src={getImageUrl(t.image_url)} alt={t.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', opacity: 0.1, fontSize: 24 }}>📦</div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
                          {t.product_name}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Sold by: {t.sales_platform}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>Qty: {t.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12, paddingTop: 20, borderTop: '1px solid var(--line-2)' }}>
                  <button className="btn btn-primary" onClick={() => setTrackingOrder(group)}>Track Package</button>
                  {group.status === 'PROCESSING' && (
                    <button 
                      className="btn btn-secondary"
                      style={{ color: 'var(--red)', border: '1px solid var(--red-light)' }}
                      onClick={() => cancelOrderGroup(group.transactions)}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tracking Modal Overlay */}
      {trackingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 27, 45, 0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, overflow: 'hidden', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div className="card-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: 'var(--canvas)' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: 18 }}>Track Package</h3>
                <div className="card-sub" style={{ marginTop: 4 }}>Order #{trackingOrder.orderId}</div>
              </div>
            </div>
            
            <div className="card-body" style={{ padding: '32px 32px 16px 40px', position: 'relative' }}>
              {/* Connecting line */}
              <div style={{ position: 'absolute', left: 45, top: 44, bottom: 44, width: 2, background: 'var(--line-2)', zIndex: 1 }} />
              
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 32 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--violet)', marginTop: 4, flexShrink: 0, outline: '4px solid var(--surface)' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Order Placed</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{trackingOrder.dateStr}</div>
                </div>
              </div>
              
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 32, opacity: trackingOrder.status === 'PROCESSING' || trackingOrder.status === 'CANCELLED' ? 0.3 : 1 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: trackingOrder.status !== 'PROCESSING' && trackingOrder.status !== 'CANCELLED' ? 'var(--blue)' : 'var(--line-2)', marginTop: 4, flexShrink: 0, outline: '4px solid var(--surface)' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Shipped</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Package has left the facility</div>
                </div>
              </div>
              
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: 20, opacity: trackingOrder.status !== 'DELIVERED' ? 0.3 : 1 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: trackingOrder.status === 'DELIVERED' ? 'var(--green)' : 'var(--line-2)', marginTop: 4, flexShrink: 0, outline: '4px solid var(--surface)' }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Delivered</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Package handed to resident</div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', background: 'var(--canvas)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setTrackingOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
