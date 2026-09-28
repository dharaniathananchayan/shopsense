import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const local = localStorage.getItem('shopsense_cart')
      return local ? JSON.parse(local) : []
    } catch {
      return []
    }
  })

  const [savedForLater, setSavedForLater] = useState(() => {
    try {
      const local = localStorage.getItem('shopsense_saved')
      return local ? JSON.parse(local) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('shopsense_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('shopsense_saved', JSON.stringify(savedForLater))
  }, [savedForLater])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity } : item))
  }

  const saveForLater = (product) => {
    // Remove from cart if it's there
    removeFromCart(product.id)
    
    // Add to saved if not already
    setSavedForLater(prev => {
      if (prev.find(item => item.id === product.id)) return prev
      return [...prev, product]
    })
  }

  const moveToCart = (product) => {
    // Remove from saved
    setSavedForLater(prev => prev.filter(item => item.id !== product.id))
    // Add to cart
    addToCart(product)
  }
  
  const removeSaved = (productId) => {
    setSavedForLater(prev => prev.filter(item => item.id !== productId))
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ 
      cart, savedForLater, 
      addToCart, removeFromCart, updateQuantity, 
      saveForLater, moveToCart, removeSaved,
      cartCount, cartTotal 
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
