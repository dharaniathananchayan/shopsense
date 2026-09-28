import React, { createContext, useContext, useState, useEffect } from 'react'

const CompareContext = createContext()

export function useCompare() {
  return useContext(CompareContext)
}

export function CompareProvider({ children }) {
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const stored = localStorage.getItem('shopsense_compare')
      return stored ? JSON.parse(stored) : []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('shopsense_compare', JSON.stringify(compareItems))
  }, [compareItems])

  const toggleCompare = (product) => {
    setCompareItems(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) {
        return prev.filter(p => p.id !== product.id)
      }
      if (prev.length >= 4) {
        alert("You can only compare up to 4 products at a time.")
        return prev
      }
      return [...prev, product]
    })
  }

  const clearCompare = () => setCompareItems([])

  return (
    <CompareContext.Provider value={{ compareItems, toggleCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  )
}
