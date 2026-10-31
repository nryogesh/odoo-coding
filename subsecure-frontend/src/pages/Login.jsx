import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { register } from '../services/authService'

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showRegister, setShowRegister] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (mode === 'register') {
      if (!PASSWORD_RULE.test(form.password)) {
        return setError('Password must be 9+ characters with uppercase, lowercase and a special character.')
      }
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(form.name, form.email, form.password)
        setMode('login')
        setError(null)
        setForm((f) => ({ ...f, password: '' }))
      } else {
        const user = await login(form.email, form.password)
        navigate(user.role === 'CUSTOMER' ? '/portal' : '/', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-navy-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-brand-500 grid place-items-center text-white text-lg font-bold">S</span>
            <span className="text-white text-xl font-semibold">SubSecure AI</span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Subscription management for Brightloop Software</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {params.get('session') === 'expired' && (
            <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Your session expired. Please sign in again.</p>
          )}

          <div className="flex bg-slate-100 rounded-lg p-1 mb-5">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  mode === m ? 'bg-white shadow text-navy-900' : 'text-slate-500'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full name</label>
                <input required value={form.name} onChange={set('name')} className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="Priya Sharma" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input required type="email" value={form.email} onChange={set('email')} className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="you@brightloop.io" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input required type="password" value={form.password} onChange={set('password')} className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40" placeholder="••••••••••" />
              {mode === 'register' && (
                <p className="mt-1 text-[11px] text-slate-400">9+ characters, uppercase, lowercase and a special character.</p>
              )}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create customer account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            Demo roles: Admin · Staff · Customer — passwords are hashed with bcrypt on the backend.
          </p>
        </div>
      </div>
    </div>
  )
}
