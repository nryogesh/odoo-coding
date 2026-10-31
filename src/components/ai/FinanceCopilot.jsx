import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, AlertCircle, Bot, User, CheckCircle2 } from 'lucide-react'
import { askAssistant } from '../../services/analyticsService'
import { formatINR } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'

const ADMIN_SUGGESTIONS = [
  'Show overdue invoices above ₹10,000',
  'Calculate current MRR and ARR',
  'Show high churn-risk subscriptions',
  'What is our all-time revenue collected?',
  'Which subscriptions expire this month?',
]

const STAFF_SUGGESTIONS = [
  'Show customers requiring attention',
  'Which subscriptions are expiring soon?',
  'Show pending quotations',
  'Which invoices require follow-up?',
  'Show my assigned customers',
]

const CUSTOMER_SUGGESTIONS = [
  'What are my active subscriptions?',
  'When is my next billing date?',
  'How much do I currently owe?',
  'Show my recent invoices',
  'Which of my invoices are overdue?',
  'What payments have I made?',
  'When does my subscription expire?',
]

const MONEY_KEYS = /(total|amount|balance|mrr|arr|revenue|outstanding|price|value)/i

function ResultTable({ data }) {
  if (!Array.isArray(data) || !data.length) return null
  const cols = Object.keys(data[0] || {}).slice(0, 6)
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 font-medium capitalize">
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
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
  const { user } = useAuth()
  const role = user?.role?.toUpperCase() || 'CUSTOMER'

  const suggestions =
    role === 'CUSTOMER'
      ? CUSTOMER_SUGGESTIONS
      : role === 'STAFF'
      ? STAFF_SUGGESTIONS
      : ADMIN_SUGGESTIONS

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function send(question) {
    const q = (question ?? input).trim()
    if (!q || sending) return
    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', text: q }])
    setSending(true)
    try {
      const res = await askAssistant(q)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.answer || res.response || res.explanation || JSON.stringify(res),
          data: res.data || res.results || res.rows || null,
          fallback: res.mode === 'fallback' || !!res.fallback_mode || !!res.fallback,
        },
      ])
    } catch (e) {
      setError(e.message)
      setMessages((m) => [...m, { role: 'assistant', text: null, error: true }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-card flex flex-col ${
        compact ? 'h-full min-h-[420px]' : 'h-[calc(100vh-200px)] min-h-[500px]'
      }`}
    >
      <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/60 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles size={14} />
          </div>
          <div>
            <p className="text-xs font-bold text-navy-900">
              {role === 'CUSTOMER' ? 'Customer Account Copilot' : role === 'STAFF' ? 'Staff Operations Copilot' : 'Finance Executive Copilot'}
            </p>
            <p className="text-[11px] text-slate-500">
              {role === 'CUSTOMER'
                ? 'Answers directly from your subscription & invoice records'
                : 'Natural language queries over live contracts, invoices, and metrics'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 size={10} /> Read-Only Data
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500 font-medium">Suggested queries for your account:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50/60 text-brand-800 hover:bg-brand-100 hover:border-brand-300 text-left transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${
                m.role === 'user'
                  ? 'bg-navy-900 text-white leading-relaxed'
                  : m.error
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-slate-100/90 text-navy-900 border border-slate-200/60 leading-relaxed'
              }`}
            >
              {m.error ? (
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle size={13} /> {error || 'Query failed. Please verify token.'}
                </div>
              ) : (
                <p className="whitespace-pre-line">{m.text}</p>
              )}

              {m.fallback && (
                <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Deterministic rule engine query executed (accurate live data).
                </div>
              )}

              {m.data && <ResultTable data={m.data} />}
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-navy-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User size={13} />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
            <div className="w-5 h-5 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
            <span>Querying authorized database records…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            role === 'CUSTOMER'
              ? 'Ask: "What are my active subscriptions?", "When is my next billing date?"…'
              : 'Ask: "Show pending quotes", "Calculate MRR", "Show overdue invoices"…'
          }
          className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send query"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
