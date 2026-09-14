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
  const [activeTab, setActiveTab] = useState('data')

  const handleAsk = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    setError('')
    setResult(null)
    setActiveTab('data')

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
    "Compare sales across different sales platforms",
    "Show last weeks top five categories in a pie chart",
    "Show top products by revenue in a bar chart"
  ]

  const renderChart = () => {
    if (!result?.chart_type || !result.query_results || result.query_results.length === 0) return null;
    const data = result.query_results;
    const keys = Object.keys(data[0]);
    if (keys.length < 2) return null;
    
    let labelKey = keys[0];
    let valueKey = keys[1];
    for (const k of keys) {
      if (typeof data[0][k] === 'number') valueKey = k;
      else if (typeof data[0][k] === 'string') labelKey = k;
    }

    const total = data.reduce((acc, row) => acc + (Number(row[valueKey]) || 0), 0);

    if (result.chart_type === 'pie') {
       let cumulativePercent = 0;
       const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
       
       const getCoordinatesForPercent = (percent) => {
         const x = Math.cos(2 * Math.PI * percent);
         const y = Math.sin(2 * Math.PI * percent);
         return [x, y];
       };

       return (
         <div style={{ marginTop: 16, marginBottom: 16 }}>
           <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Pie Chart Analysis</div>
           <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
             <svg viewBox="-1.1 -1.1 2.2 2.2" style={{ width: 140, height: 140, transform: 'rotate(-90deg)' }}>
               {data.map((row, i) => {
                 const value = Number(row[valueKey]) || 0;
                 if (value <= 0) return null;
                 const percent = value / total;
                 if (percent === 1) return <circle key={i} r="1" cx="0" cy="0" fill={colors[i % colors.length]} />;
                 const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                 cumulativePercent += percent;
                 const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                 const largeArcFlag = percent > 0.5 ? 1 : 0;
                 const pathData = [
                   `M ${startX} ${startY}`,
                   `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                   `L 0 0`,
                 ].join(' ');
                 return <path key={i} d={pathData} fill={colors[i % colors.length]} />;
               })}
             </svg>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
               {data.map((row, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <div style={{ width: 12, height: 12, background: colors[i % colors.length], borderRadius: '50%' }} />
                   <span><strong>{row[labelKey]}</strong>: {Number(row[valueKey]).toLocaleString()} ({(Number(row[valueKey])/total*100).toFixed(1)}%)</span>
                 </div>
               ))}
             </div>
           </div>
         </div>
       )
    } else if (result.chart_type === 'bar') {
       const maxVal = Math.max(...data.map(r => Number(r[valueKey]) || 0), 1);
       return (
         <div style={{ marginTop: 16, marginBottom: 16 }}>
           <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Bar Chart Analysis</div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
             {data.map((row, i) => {
               const val = Number(row[valueKey]) || 0;
               const pct = (val / maxVal) * 100;
               return (
                 <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', gap: 10, alignItems: 'center', fontSize: 13 }}>
                   <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[labelKey]}</div>
                   <div style={{ height: 16, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                     <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6' }} />
                   </div>
                   <div style={{ textAlign: 'right' }}>{val.toLocaleString()}</div>
                 </div>
               )
             })}
           </div>
         </div>
       )
    }
    return null;
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-head">
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> AI Data Analyst
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
            
            <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <button 
                onClick={() => setActiveTab('data')}
                style={{ 
                  background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
                  fontWeight: activeTab === 'data' ? 600 : 400,
                  color: activeTab === 'data' ? 'var(--primary, #2563eb)' : 'var(--muted)',
                  borderBottom: activeTab === 'data' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent'
                }}
              >
                Data & SQL
              </button>
              <button 
                onClick={() => setActiveTab('visualization')}
                style={{ 
                  background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
                  fontWeight: activeTab === 'visualization' ? 600 : 400,
                  color: activeTab === 'visualization' ? 'var(--primary, #2563eb)' : 'var(--muted)',
                  borderBottom: activeTab === 'visualization' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent'
                }}
              >
                Visualization
              </button>
            </div>

            {activeTab === 'data' && (
              <>
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
              </>
            )}

            {activeTab === 'visualization' && (
              <>
                {!result.chart_type && (
                  <div style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
                    No chart requested or generated for this query. Try adding "in a pie chart" or "in a bar chart" to your prompt.
                  </div>
                )}
                {renderChart()}
              </>
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
