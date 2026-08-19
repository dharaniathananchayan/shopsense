import { useState, useEffect } from 'react'
import api from '../api'

function sentimentBadge(label, score) {
  if (label === 'POSITIVE' || score >= 65) return <span className="badge badge-green">★ Positive ({score}%)</span>
  if (label === 'NEGATIVE' || score <= 40) return <span className="badge badge-red">⚠ Negative ({score}%)</span>
  return <span className="badge badge-amber">● Neutral ({score}%)</span>
}

export default function Sentiment() {
  const [products, setProducts]       = useState([])
  const [selectedPid, setSelectedPid] = useState(null)
  const [summary, setSummary]         = useState(null)
  const [reviews, setReviews]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // Live Review Analyzer State
  const [customText, setCustomText]   = useState('')
  const [customProdName, setCustomProdName] = useState('')
  const [analyzing, setAnalyzing]     = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisError, setAnalysisError]   = useState('')

  // New Review Submission State
  const [newRating, setNewRating]     = useState(5)
  const [newReviewer, setNewReviewer] = useState('')
  const [newTitle, setNewTitle]       = useState('')
  const [newText, setNewText]         = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState('')

  // Load products list
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.get('/products', { params: { limit: 100 } })
        setProducts(res.data)
        if (res.data.length > 0) {
          setSelectedPid(res.data[0].id)
          setCustomProdName(res.data[0].product_name)
        }
      } catch (e) {
        setError(e.response?.data?.detail || e.message)
      }
    }
    loadProducts()
  }, [])

  // Load product sentiment and reviews
  const loadProductSentiment = async (pid) => {
    if (!pid) return
    setLoading(true)
    setError('')
    try {
      const [sumRes, revRes] = await Promise.all([
        api.get(`/reviews/product/${pid}/summary`),
        api.get(`/reviews/product/${pid}`, { params: { limit: 30 } }),
      ])
      setSummary(sumRes.data)
      setReviews(revRes.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPid) {
      loadProductSentiment(selectedPid)
      const found = products.find(p => p.id === selectedPid)
      if (found) setCustomProdName(found.product_name)
    }
  }, [selectedPid]) // eslint-disable-line

  // Run live Groq LLM Sentiment analysis on custom text
  const handleAnalyzeCustom = async () => {
    if (!customText.trim()) return
    setAnalyzing(true)
    setAnalysisError('')
    setAnalysisResult(null)
    try {
      const res = await api.post('/reviews/analyze', {
        text: customText,
        product_name: customProdName || 'Product',
        category: products.find(p => p.id === selectedPid)?.category || 'General',
      })
      setAnalysisResult(res.data)
    } catch (e) {
      setAnalysisError(e.response?.data?.detail || e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // Submit new review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!newText.trim() || !selectedPid) return
    setSubmitting(true)
    setSubmitSuccess('')
    try {
      await api.post('/reviews', {
        product_id: selectedPid,
        rating: newRating,
        reviewer_name: newReviewer || 'Verified Shopper',
        title: newTitle,
        review_text: newText,
      })
      setSubmitSuccess('Review submitted & analyzed by Groq AI in real time!')
      setNewText('')
      setNewTitle('')
      loadProductSentiment(selectedPid)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const samplePresets = [
    "The audio quality is crystal clear and battery lasts over 8 hours! But the charging case lid is slightly flimsy.",
    "Left earbud stopped charging after two weeks of normal use. Customer support was slow to respond.",
    "Outstanding craftsmanship. Quilted interior keeps you warm, and genuine leather aroma is fantastic.",
    "Super quiet sleep mode on the air purifier, but the companion mobile app failed to connect to 5GHz Wi-Fi.",
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">LLM Customer Sentiment Analysis & Review Intelligence</div>
        <div className="page-subtitle">
          Powered by Groq LLM — extracts sentiment scores, aspect ratings, top pros, top cons, and actionable vendor takeaways.
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Target Product Selection */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Select Catalog SKU:</span>
            <select
              className="field select"
              value={selectedPid || ''}
              onChange={e => setSelectedPid(Number(e.target.value))}
              style={{ border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 280 }}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.product_name} ({p.category})</option>
              ))}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => loadProductSentiment(selectedPid)}>↻ Refresh</button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-violet">⚡ Groq (Llama-3.1 / OpenAI Compatible)</span>
            <span className="badge badge-ghost">Reviews: {summary?.total_reviews || 0}</span>
          </div>
        </div>
      </div>

      {/* Product Sentiment Intelligence Breakdown */}
      {summary && (
        <>
          {/* Sentiment KPI Row */}
          <div className="metric-grid" style={{ marginBottom: 20 }}>
            <div className="metric-card">
              <div className="metric-label">Overall Sentiment Score</div>
              <div className="metric-value" style={{ color: summary.overall_sentiment_score >= 70 ? 'var(--green)' : (summary.overall_sentiment_score <= 45 ? 'var(--red)' : 'var(--amber)') }}>
                {summary.overall_sentiment_score} <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ 100</span>
              </div>
              <div className="metric-foot neutral">
                Average Rating: <strong>★ {summary.avg_rating}</strong> / 5.0
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Sentiment Breakdown</div>
              <div style={{ display: 'flex', gap: 4, height: 12, borderRadius: 6, overflow: 'hidden', margin: '10px 0 6px' }}>
                <div style={{ width: `${(summary.sentiment_distribution?.positive || 1) / Math.max(1, summary.total_reviews) * 100}%`, background: 'var(--green)' }} title="Positive" />
                <div style={{ width: `${(summary.sentiment_distribution?.neutral || 0) / Math.max(1, summary.total_reviews) * 100}%`, background: 'var(--amber)' }} title="Neutral" />
                <div style={{ width: `${(summary.sentiment_distribution?.negative || 0) / Math.max(1, summary.total_reviews) * 100}%`, background: 'var(--red)' }} title="Negative" />
              </div>
              <div className="metric-foot neutral" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--green)' }}>✓ {summary.sentiment_distribution?.positive || 0} Pos</span>
                <span style={{ color: 'var(--amber)' }}>● {summary.sentiment_distribution?.neutral || 0} Neu</span>
                <span style={{ color: 'var(--red)' }}>⚠ {summary.sentiment_distribution?.negative || 0} Neg</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Build & Usability Quality</div>
              <div className="metric-value" style={{ color: 'var(--violet)' }}>
                {summary.aspect_breakdown?.quality || 85}%
              </div>
              <div className="metric-foot neutral">
                Usability: {summary.aspect_breakdown?.usability || 88}% | Durability: {summary.aspect_breakdown?.durability || 82}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Value for Money</div>
              <div className="metric-value" style={{ color: 'var(--blue)' }}>
                {summary.aspect_breakdown?.value || 84}%
              </div>
              <div className="metric-foot neutral">
                AI Provider: <strong>{summary.ai_provider}</strong>
              </div>
            </div>
          </div>

          {/* Pros & Cons Split Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Top Pros */}
            <div className="card" style={{ borderTop: '4px solid var(--green)' }}>
              <div className="card-head">
                <div>
                  <div className="card-title" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👍</span> Customer Praised Highlights (Top Pros)
                  </div>
                  <div className="card-sub">Key product strengths extracted by LLM across customer reviews.</div>
                </div>
              </div>
              <div className="card-body">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {summary.top_pros?.map((pro, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, background: 'rgba(34, 197, 94, 0.08)', padding: '8px 12px', borderRadius: 6 }}>
                      <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>✓</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Top Cons */}
            <div className="card" style={{ borderTop: '4px solid var(--red)' }}>
              <div className="card-head">
                <div>
                  <div className="card-title" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👎</span> Customer Pain Points (Top Cons)
                  </div>
                  <div className="card-sub">Common issues, flaws, or user friction points identified by LLM.</div>
                </div>
              </div>
              <div className="card-body">
                {summary.top_cons?.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {summary.top_cons.map((con, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, background: 'rgba(239, 68, 68, 0.08)', padding: '8px 12px', borderRadius: 6 }}>
                        <span style={{ color: 'var(--red)', fontWeight: 'bold' }}>⚠</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>No significant negative sentiment points flagged.</p>
                )}
              </div>
            </div>
          </div>

          {/* AI Executive Summary & Vendor Action Items */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Vendor Intelligence & Actionable Next Steps</div>
                <div className="card-sub">AI synthesis of review sentiment with strategic guidance for the supplier.</div>
              </div>
              <span className="badge badge-violet">AI Recommendations</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14, color: 'var(--text)' }}>
                <strong>Executive Summary: </strong>{summary.executive_summary}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {summary.vendor_recommendations?.map((rec, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 8, fontSize: 13, borderLeft: '3px solid var(--violet)' }}>
                    <strong>Action #{i + 1}:</strong> {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Live Interactive Review Analyzer Sandbox */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <div className="card-title">🧪 Live Groq Review Analyzer (Interactive Sandbox)</div>
            <div className="card-sub">
              Paste or type any customer feedback text to test real-time LLM sentiment scoring and pros/cons extraction.
            </div>
          </div>
          <span className="badge badge-blue">Real-time Groq API</span>
        </div>
        <div className="card-body">
          {/* Preset Prompts */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Try a sample review prompt:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {samplePresets.map((p, i) => (
                <button
                  key={i}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, textAlign: 'left' }}
                  onClick={() => setCustomText(p)}
                >
                  "{p.slice(0, 45)}…"
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <textarea
              className="field textarea"
              rows={3}
              placeholder="Paste customer review text here to analyze with Groq LLM..."
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleAnalyzeCustom}
              disabled={analyzing || !customText.trim()}
            >
              {analyzing ? <><span className="spinner" /> Analyzing with Groq…</> : '⚡ Run LLM Sentiment Pipeline'}
            </button>
          </div>

          {analysisError && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>{analysisError}</div>
          )}

          {/* Analysis Result Box */}
          {analysisResult && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--surface-3)', borderRadius: 10, border: '1px solid var(--line-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Analysis Output</span>
                  {sentimentBadge(analysisResult.sentiment_label, analysisResult.sentiment_score)}
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Engine: {analysisResult.ai_provider}</span>
              </div>

              <p style={{ fontSize: 13, marginBottom: 12 }}><strong>Summary: </strong>{analysisResult.summary}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: 10, borderRadius: 6 }}>
                  <strong style={{ color: 'var(--green)', fontSize: 12 }}>Extracted Pros:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12 }}>
                    {analysisResult.pros.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: 10, borderRadius: 6 }}>
                  <strong style={{ color: 'var(--red)', fontSize: 12 }}>Extracted Cons:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12 }}>
                    {analysisResult.cons.length > 0 ? analysisResult.cons.map((c, i) => <li key={i}>{c}</li>) : <li>No significant flaws noted</li>}
                  </ul>
                </div>
              </div>

              {analysisResult.vendor_action_items?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <strong>Vendor Action Items: </strong> {analysisResult.vendor_action_items.join(' • ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Feed */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Customer Reviews Feed ({reviews.length})</div>
            <div className="card-sub">Individual reviews enriched with Groq sentiment scores and aspect metadata.</div>
          </div>
        </div>
        <div className="card-body">
          {/* Submit New Review Form */}
          <form onSubmit={handleSubmitReview} style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>✍ Post a Customer Review (Auto-Enriched with LLM Sentiment)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
              <input
                className="field"
                placeholder="Reviewer Name (e.g. Maya Lin)"
                value={newReviewer}
                onChange={e => setNewReviewer(e.target.value)}
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
              />
              <input
                className="field"
                placeholder="Review Title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
              />
              <select
                className="field select"
                value={newRating}
                onChange={e => setNewRating(Number(e.target.value))}
                style={{ border: '1px solid var(--line-2)', borderRadius: 6, padding: '6px 10px', fontSize: 13 }}
              >
                <option value={5}>★★★★★ (5 Stars)</option>
                <option value={4}>★★★★☆ (4 Stars)</option>
                <option value={3}>★★★☆☆ (3 Stars)</option>
                <option value={2}>★★☆☆☆ (2 Stars)</option>
                <option value={1}>★☆☆☆☆ (1 Star)</option>
              </select>
            </div>
            <textarea
              className="field textarea"
              rows={2}
              placeholder="Write detailed review comments..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--line-2)', borderRadius: 6, padding: '8px 10px', fontSize: 13, marginBottom: 10 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !newText.trim()}>
                {submitting ? <><span className="spinner" /> Analyzing & Saving…</> : 'Submit Review'}
              </button>
              {submitSuccess && <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ {submitSuccess}</span>}
            </div>
          </form>

          {/* Reviews List */}
          {reviews.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>No customer reviews recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--line-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{r.reviewer_name}</span>
                      <span style={{ marginLeft: 8, color: 'var(--amber)', fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      {r.title && <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--text)' }}>— {r.title}</span>}
                    </div>
                    {sentimentBadge(r.sentiment_label, r.sentiment_score || (r.rating * 20))}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: '6px 0 10px' }}>
                    {r.review_text}
                  </p>
                  {(r.pros?.length > 0 || r.cons?.length > 0) && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                      {r.pros?.map((p, i) => (
                        <span key={i} className="badge badge-green">✓ {p}</span>
                      ))}
                      {r.cons?.map((c, i) => (
                        <span key={i} className="badge badge-red">⚠ {c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
