import { useState } from 'react'
import api from '../api'

const formatAssistantText = (text) => {
  if (!text) return null;
  // Clean raw asterisks
  const clean = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/\*/g, '');
  const lines = clean.split('\n').filter(l => l.trim().length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const isHeader = !trimmed.startsWith('-') && !trimmed.startsWith('•') && (
          trimmed.endsWith(':') || idx === 0 || trimmed.toLowerCase().includes('recommended product')
        );

        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const content = trimmed.replace(/^[\-\•]\s*/, '');
          return (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', paddingLeft: 2, lineHeight: 1.45 }}>
              <span style={{ color: 'var(--primary, #2563eb)', fontWeight: 700 }}>•</span>
              <span style={{ flex: 1 }}>{content}</span>
            </div>
          );
        }

        return (
          <div
            key={idx}
            style={{
              fontWeight: isHeader ? 700 : 400,
              fontSize: isHeader ? 13.5 : 13,
              color: isHeader ? '#1e3a8a' : 'inherit',
              marginTop: isHeader && idx > 0 ? 6 : 0
            }}
          >
            {trimmed}
          </div>
        );
      })}
    </div>
  );
};

export default function ShoppingAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hello! I am your AI Shopping Assistant. Ask me anything about our product catalog (e.g., "What is the best headphones under ₹1000?").'
    }
  ])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    const userText = query
    setQuery('')
    setMessages(prev => [...prev, { sender: 'user', text: userText }])
    setLoading(true)

    try {
      const res = await api.post('/ai/shopping-assistant', { query: userText })
      const data = res.data
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: data.answer,
          products: data.recommended_products,
          provider: data.ai_provider
        }
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: 'Sorry, I encountered an error searching the catalog. Please try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {!isOpen ? (
        <button
          className="btn btn-primary"
          onClick={() => setIsOpen(true)}
          style={{
            borderRadius: 50,
            padding: '12px 20px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600
          }}
        >
          <span>🤖</span> AI Shopping Assistant
        </button>
      ) : (
        <div
          className="card"
          style={{
            width: 380,
            height: 520,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            borderRadius: 12,
            overflow: 'hidden',
            margin: 0,
            background: 'var(--canvas-elevated, #ffffff)',
            border: '1px solid var(--border)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--primary, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🤖</span> AI Shopping Assistant (RAG)
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>

          {/* Messages body */}
          <div
            style={{
              flex: 1,
              padding: 14,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              fontSize: 13
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.sender === 'user' ? '#2563eb' : 'var(--muted-bg, #f1f5f9)',
                  color: m.sender === 'user' ? '#ffffff' : 'inherit',
                  padding: '10px 14px',
                  borderRadius: 12,
                  lineHeight: 1.45
                }}
              >
                {m.sender === 'user' ? m.text : formatAssistantText(m.text)}

                {/* Recommended Products cards */}
                {m.products && m.products.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>
                      Retrieved Catalog Products:
                    </div>
                    {m.products.map(p => (
                      <div
                        key={p.product_id}
                        style={{
                          background: 'rgba(255,255,255,0.7)',
                          color: '#000',
                          padding: 8,
                          borderRadius: 6,
                          fontSize: 12,
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 11 }}>
                          <span>₹{p.price.toFixed(2)}</span>
                          <span>{p.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {m.provider && (
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                    Powered by {m.provider}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: 'var(--muted)', fontSize: 12 }}>
                Searching catalog & generating recommendation...
              </div>
            )}
          </div>

          {/* Input form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: 10,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 8
            }}
          >
            <input
              type="text"
              className="input"
              placeholder="Ask about products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !query.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
