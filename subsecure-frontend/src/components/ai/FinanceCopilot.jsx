import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { askAssistant } from '../../services/analyticsService'
import { formatINR } from '../../utils/currency'

const SUGGESTIONS = [
  'Show overdue invoices above ₹10,000',
  'Which yearly subscriptions expire next week?',
  'Calculate current MRR',
  'Show high churn-risk customers',
  'How much is outstanding?',
]

const MONEY_KEYS = /(total|amount|balance|mrr|arr|revenue|outstanding|price|value)/i

function ResultTable({ data }) {
  if (!Array.isArray(data) || !data.length) return null
  const cols = Object.keys(data[0] || {}).slice(0, 6)
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
            {cols.map((c) => <th key={c} className="px-3 py-2 font-medium capitalize">{c.replace(/_/g, ' ')}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2">
                  {MONEY_KEYS.test(c) && Number.isFinite(Number(row[c])) ? formatINR(row[c]) : String(row[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 20 && <p className="px-3 py-1.5 text-[11px] text-slate-400">Showing 20 of {data.length} rows.</p>}
    </div>
  )
}

export default function FinanceCopilot({ compact = false }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function send(question) {
    const q = (question ?? input).trim()
    if (!q || sending) return
    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', text: q }])
    setSending(true)
    try {
      const res = await askAssistant(q)
      setMessages((m) => [...m, {
        role: 'assistant',
        text: res.answer || res.response || res.explanation || JSON.stringify(res),
        data: res.data || res.results || res.rows || null,
        fallback: res.mode === 'fallback' || !!res.fallback_mode || !!res.fallback,
      }])
    } catch (e) {
      setError(e.message)
      setMessages((m) => [...m, { role: 'assistant', text: null, error: true }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card flex flex-col ${compact ? 'h-full min-h-[380px]' : 'h-[calc(100vh-220px)] min-h-[480px]'}`}>
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm font-semibold text-navy-800">Finance Copilot</p>
        <p className="text-[11px] text-slate-500">Questions are answered from live, authorized backend data. Read-only.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
              m.role === 'user'
                ? 'bg-navy-900 text-white'
                : m.error
                  ? 'bg-red-50 border border-red-200 text-red-600 text-xs'
                  : 'bg-slate-100 text-navy-900'
            }`}>
              {m.error ? `Error: ${error}` : m.text}
              {m.fallback && <span className="block mt-1 text-[10px] text-amber-600 font-medium">Fallback mode — LLM unavailable, deterministic template used.</span>}
              {m.data && <ResultTable data={m.data} />}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
              Querying securely…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="p-3 border-t border-slate-200 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about invoices, MRR, churn risk…"
          className="flex-1 text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send question"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
