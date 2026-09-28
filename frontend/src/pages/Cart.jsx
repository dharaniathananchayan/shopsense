import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'

export default function Cart() {
  const { cart, savedForLater, removeFromCart, updateQuantity, saveForLater: saveItemForLater, moveToCart, removeSaved, cartTotal, cartCount } = useCart()

  const getImageUrl = (p) => {
    if (p.image_url) {
      if (p.image_url.startsWith('http')) return p.image_url;
      // Append a timestamp to bust the browser cache, which is likely holding onto a 404
      return `http://127.0.0.1:8000${p.image_url}?t=${p.id}`; 
    }
    return null;
  }

  return (
    <div className="page" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <div className="page-title">Shopping Cart</div>
        <div className="page-subtitle">
          {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
        {/* Cart Items Section */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {cart.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }}>🛒</div>
              <h3 style={{ marginBottom: 8 }}>Your cart is empty</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Looks like you haven't added anything yet.</p>
              <Link to="/shop" className="btn btn-primary">Start Shopping</Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="card-body" style={{ padding: 0 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', padding: 24, borderBottom: '1px solid var(--line-2)', gap: 24 }}>
                    <div style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
                      {getImageUrl(item) ? (
                        <img src={getImageUrl(item)} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 32, opacity: 0.2 }}>🛒</span>
                      )}
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8, width: '100%' }}>
                        <h4 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{item.product_name}</h4>
                        <div style={{ fontSize: 18, fontWeight: 800, flexShrink: 0 }}>₹{Number(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{item.category}</div>
                      
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Qty:</span>
                          <input 
                            type="number" 
                            min="1" 
                            max={item.stock_quantity || 99}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
                            style={{ width: 70, padding: '6px 12px', border: '1px solid var(--line-2)', borderRadius: 6, fontSize: 15 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--violet)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => saveItemForLater(item)}
                          >
                            Save for later
                          </button>
                          <span style={{ color: 'var(--line-2)' }}>|</span>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => removeFromCart(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved For Later Section */}
          {savedForLater.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: 20, marginBottom: 16, color: 'var(--ink)' }}>Saved for Later ({savedForLater.length})</h3>
              <div className="card" style={{ padding: 0 }}>
                <div className="card-body" style={{ padding: 0 }}>
                  {savedForLater.map(item => (
                    <div key={item.id} style={{ display: 'flex', padding: 24, borderBottom: '1px solid var(--line-2)', gap: 20 }}>
                      <div style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)' }}>
                        {getImageUrl(item) ? (
                          <img src={getImageUrl(item)} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 24, opacity: 0.2 }}>🛒</span>
                        )}
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8, width: '100%' }}>
                          <h4 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>{item.product_name}</h4>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>₹{Number(item.price).toFixed(2)}</div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>{item.category}</div>
                        
                        <div style={{ marginTop: 'auto', display: 'flex', gap: 16 }}>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--violet)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => moveToCart(item)}
                          >
                            Move to Cart
                          </button>
                          <span style={{ color: 'var(--line-2)' }}>|</span>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => removeSaved(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        {cart.length > 0 && (
          <div style={{ flex: '0 0 350px', position: 'sticky', top: 24 }}>
            <div className="card">
              <div className="card-body">
                <div className="card-title" style={{ marginBottom: 20, fontSize: 18 }}>Order Summary</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15 }}>
                  <span style={{ color: 'var(--text)' }}>Subtotal ({cartCount} items)</span>
                  <span style={{ fontWeight: 500 }}>₹{cartTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15 }}>
                  <span style={{ color: 'var(--text)' }}>Shipping</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>Free</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 15 }}>
                  <span style={{ color: 'var(--text)' }}>Tax (Estimated)</span>
                  <span style={{ fontWeight: 500 }}>₹{(cartTotal * 0.18).toFixed(2)}</span>
                </div>
                
                <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>Total</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--violet)' }}>₹{(cartTotal * 1.18).toFixed(2)}</span>
                </div>
                
                <button className="btn btn-primary" style={{ width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700 }} onClick={() => alert("Checkout flow is not implemented in this milestone!")}>
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
