import { useState } from 'react'
import api from '../api'

const formatInsightText = (text) => {
  if (!text) return null;
  // Clean raw asterisks (**bold** -> bold, *italic* -> italic)
  const clean = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/\*/g, '');
  const lines = clean.split('\n').filter(l => l.trim().length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        const isHeader = !trimmed.startsWith('-') && !trimmed.startsWith('•') && (
          trimmed.endsWith(':') || idx === 0 || trimmed.toLowerCase().includes('insight') || trimmed.toLowerCase().includes('driver') || trimmed.toLowerCase().includes('bottom line')
        );

        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const content = trimmed.replace(/^[\-\•]\s*/, '');
          return (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 4, lineHeight: 1.55 }}>
              <span style={{ color: 'var(--primary, #2563eb)', fontWeight: 700, fontSize: 14 }}>•</span>
              <span style={{ flex: 1 }}>{content}</span>
            </div>
          );
        }

        return (
          <div
            key={idx}
            style={{
              fontWeight: isHeader ? 700 : 400,
              fontSize: isHeader ? 14 : 13,
              color: isHeader ? 'var(--primary, #1d4ed8)' : 'inherit',
              marginTop: isHeader && idx > 0 ? 8 : 0,
              marginBottom: isHeader ? 2 : 0
            }}
          >
            {trimmed}
          </div>
        );
      })}
    </div>
  );
};

export default function AIDataAnalyst() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.post('/ai/data-analyst', { question })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const sampleQuestions = [
    "Why did my sales drop last week?",
    "Which products generated the highest revenue?",
    "Compare sales across different sales platforms"
  ]

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-head">
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> AI Data Analyst (Text-to-SQL)
          </div>
          <div className="card-sub">Ask natural language questions about your sales data and generate SQL insights on the fly.</div>
        </div>
      </div>

      <div className="card-body">
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            type="text"
            className="input"
            placeholder="e.g. Why did my sales drop last week?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
            {loading ? 'Analyzing...' : 'Ask AI Analyst'}
          </button>
        </form>

        {/* Quick sample chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Try asking:</span>
          {sampleQuestions.map(q => (
            <button
              key={q}
              className="btn btn-secondary btn-xs"
              onClick={() => setQuestion(q)}
              style={{ fontSize: 12, borderRadius: 16 }}
            >
              {q}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Results view */}
        {result && (
          <div style={{ background: 'var(--canvas, #f8fafc)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary, #2563eb)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span> Executive AI Insights
            </div>
            
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              {formatInsightText(result.analysis_insight)}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                Generated SQL Query (SQLite):
              </div>
              <pre
                style={{
                  background: '#1e293b',
                  color: '#38bdf8',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  overflowX: 'auto',
                  margin: 0
                }}
              >
                {result.generated_sql}
              </pre>
            </div>

            {result.query_results && result.query_results.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                  Query Execution Results ({result.query_results.length} rows):
                </div>
                <div className="table-wrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(result.query_results[0]).map(k => (
                          <th key={k}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.query_results.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, idx) => (
                            <td key={idx}>{typeof val === 'number' ? val.toLocaleString('en-IN') : val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, textAlign: 'right' }}>
              Engine: {result.ai_provider}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
