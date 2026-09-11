import { useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AIAgentWorkflow from '../components/AIAgentWorkflow'

export default function Studio() {
  const { session } = useAuth()
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    keywords: '',
    target_audience: 'General customers',
    price: '',
    stock_quantity: 0,
    vendor_id: session?.vendor_id || '',
  })

  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [notice, setNotice] = useState(null)

  const [imageFile, setImageFile] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setNotice(null)
    setGenerating(true)
    try {
      let response;
      if (imageFile) {
        const formDataPayload = new FormData()
        formDataPayload.append('product_name', formData.product_name)
        formDataPayload.append('category', formData.category)
        formDataPayload.append('keywords', formData.keywords)
        formDataPayload.append('target_audience', formData.target_audience)
        formDataPayload.append('file', imageFile)
        
        response = await api.post('/ai/generate-description-with-image', formDataPayload, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        // Update category state if AI generated one
        if (response.data.category) {
            setFormData(prev => ({ ...prev, category: response.data.category }))
        }
      } else {
        const payload = {
          product_name: formData.product_name,
          category: formData.category,
          keywords: formData.keywords,
          target_audience: formData.target_audience,
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock_quantity, 10),
          vendor_id: parseInt(session?.role === 'VENDOR' ? session.vendor_id : formData.vendor_id, 10),
        }
        response = await api.post('/ai/generate-description', payload)
      }
      
      setGenerated(response.data)
      setNotice({ type: 'success', message: 'Description generated! Review below and publish when ready.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Failed to generate product description.',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!generated) return
    setNotice(null)
    setPublishing(true)
    try {
      const payload = {
        product_name: formData.product_name,
        category: formData.category,
        keywords: formData.keywords,
        target_audience: formData.target_audience,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity, 10),
        vendor_id: parseInt(session?.role === 'VENDOR' ? session.vendor_id : formData.vendor_id, 10),
      }
      const response = await api.post('/ai/create-product-with-ai', payload)
      
      if (imageFile) {
        const uploadData = new FormData()
        uploadData.append('file', imageFile)
        await api.post(`/products/${response.data.id}/image`, uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      setNotice({ type: 'success', message: 'Product successfully created and published to the catalog!' })
      setGenerated(null)
      setImageFile(null)
      setFormData({
        product_name: '',
        category: '',
        keywords: '',
        target_audience: 'General customers',
        price: '',
        stock_quantity: 0,
        vendor_id: session?.vendor_id || '',
      })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Failed to publish product.',
      })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">AI Studio & Autonomous Agent</div>
        <div className="page-subtitle">
          Draft high-converting SEO product listings and run proactive autonomous AI store diagnostic audits.
        </div>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type}`} style={{ marginBottom: 20 }}>
          {notice.message}
        </div>
      )}

      {/* Autonomous AI Agent Store Audit Component */}
      <AIAgentWorkflow />


      <div className="studio-grid">
        <form onSubmit={handleGenerate} className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Product Details</div>
              <div className="card-sub">Provide core specs to inspire the AI generator.</div>
            </div>
          </div>
          <div className="card-body form-grid">
            <div className="field">
              <label>Product Name</label>
              <input
                name="product_name"
                required
                maxLength={150}
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                value={formData.product_name}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Category</label>
              <input
                name="category"
                maxLength={50}
                placeholder="e.g. Electronics"
                value={formData.category}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Keywords</label>
              <input
                name="keywords"
                maxLength={200}
                placeholder="e.g. Bluetooth 5.3, 40h battery, deep bass"
                value={formData.keywords}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Target Audience</label>
              <input
                name="target_audience"
                maxLength={100}
                placeholder="e.g. Audiophiles, Commuters, Gamers"
                value={formData.target_audience}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Product Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
              <span className="field-help" style={{ fontSize: '12px', color: 'var(--muted)' }}>Upload an image to automatically tag and categorize the product!</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Price (₹)</label>
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="2499.00"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label>Initial Stock</label>
                <input
                  name="stock_quantity"
                  type="number"
                  min="0"
                  required
                  value={formData.stock_quantity}
                  onChange={handleChange}
                />
              </div>
            </div>

            {session?.role === 'ADMIN' && (
              <div className="field">
                <label>Vendor ID</label>
                <input
                  name="vendor_id"
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1"
                  value={formData.vendor_id}
                  onChange={handleChange}
                />
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={generating}
              style={{ marginTop: 10, width: '100%' }}
            >
              {generating ? (
                <>
                  <span className="spinner" /> Generating description...
                </>
              ) : (
                '✦ Generate Product Description'
              )}
            </button>
          </div>
        </form>

        <div className="card studio-preview">
          <div className="card-head">
            <div>
              <div className="card-title">Generated Preview</div>
              <div className="card-sub">Review before publishing to active catalog.</div>
            </div>
            {generated?.seo_score && (
              <span className="badge badge-violet">SEO Score: {generated.seo_score}/100</span>
            )}
          </div>

          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {generated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div className="generated-tagline">{generated.tagline}</div>
                  <p className="generated-desc">{generated.description}</p>
                </div>

                {generated.highlights?.length > 0 && (
                  <div>
                    <div className="section-label">Key Highlights</div>
                    <ul className="highlight-list">
                      {generated.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generated.seo_tags?.length > 0 && (
                  <div>
                    <div className="section-label">SEO Tags</div>
                    <div className="tag-list">
                      {generated.seo_tags.map((t, i) => (
                        <span key={i} className="seo-tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handlePublish}
                    disabled={publishing}
                    style={{ width: '100%' }}
                  >
                    {publishing ? (
                      <>
                        <span className="spinner" /> Publishing...
                      </>
                    ) : (
                      '✓ Publish Product to Catalog'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ margin: 'auto 0' }}>
                <div className="empty-icon">✧</div>
                <h3>Preview will appear here</h3>
                <p>Fill in the product details on the left and click generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
