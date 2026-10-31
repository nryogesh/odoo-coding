import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { register } from '../services/authService'
import { api } from '../services/api'
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react'

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot' | 'reset'
  const [form, setForm] = useState({ name: '', email: '', password: '', newPassword: '' })
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function fillDemo(email, password) {
    setForm({ name: '', email, password, newPassword: '' })
    setError(null)
    setSuccessMsg(null)
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

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
        setSuccessMsg('Account created successfully! Please sign in with your credentials.')
        setForm((f) => ({ ...f, password: '' }))
      } else if (mode === 'forgot') {
        const res = await api.post('/auth/forgot-password', { email: form.email })
        setSuccessMsg(res.message)
        setMode('reset')
      } else if (mode === 'reset') {
        const res = await api.post('/auth/reset-password', {
          email: form.email,
          new_password: form.newPassword,
        })
        setSuccessMsg(res.message + ' You can now sign in with your new password.')
        setForm((f) => ({ ...f, password: form.newPassword }))
        setMode('login')
      } else {
        const user = await login(form.email, form.password)
        if (user.role === 'CUSTOMER') {
          navigate('/portal', { replace: true })
        } else if (user.role === 'STAFF') {
          navigate('/', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
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
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 grid place-items-center text-white text-lg font-bold shadow-lg">
              S
            </span>
            <span className="text-white text-xl font-bold tracking-tight">SubSecure AI</span>
          </div>
          <p className="text-slate-400 text-xs mt-1">Enterprise Subscription Billing & AI Copilot</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
          {params.get('session') === 'expired' && (
            <p className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your session expired. Please sign in again.
            </p>
          )}

          {successMsg && (
            <div className="mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode !== 'forgot' && mode !== 'reset' ? (
            <div className="flex bg-slate-100 rounded-lg p-1 mb-5">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError(null)
                    setSuccessMsg(null)
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                    mode === m ? 'bg-white shadow text-navy-900' : 'text-slate-500 hover:text-navy-900'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Create Customer Account'}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-navy-900">
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
                className="text-slate-500 hover:text-navy-900 p-1 rounded"
              >
                <ArrowLeft size={16} />
              </button>
              <span>{mode === 'forgot' ? 'Forgot Password Recovery' : 'Set New Password'}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full name</label>
                <input
                  required
                  value={form.name}
                  onChange={set('name')}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  placeholder="e.g. Priya Sharma"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={set('email')}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                placeholder="you@company.com"
              />
            </div>

            {mode !== 'forgot' && mode !== 'reset' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setError(null)
                      }}
                      className="text-[11px] text-brand-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  placeholder="••••••••••"
                />
                {mode === 'register' && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    9+ characters, uppercase, lowercase and a special character.
                  </p>
                )}
              </div>
            )}

            {mode === 'reset' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                <input
                  required
                  type="password"
                  value={form.newPassword}
                  onChange={set('newPassword')}
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  placeholder="New password (min 6 chars)"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-xs transition-colors"
            >
              {busy
                ? 'Processing…'
                : mode === 'login'
                ? 'Sign In to Workspace'
                : mode === 'register'
                ? 'Create Customer Account'
                : mode === 'forgot'
                ? 'Send Reset Instructions'
                : 'Save New Password & Sign In'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 text-center">
                One-Click Role Demonstration
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@brightloop.io', 'Admin@12345')}
                  className="px-2 py-2 rounded-lg border border-purple-200 bg-purple-50/50 text-[11px] font-semibold text-purple-900 hover:bg-purple-100 transition-colors text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('staff@brightloop.io', 'Staff@12345')}
                  className="px-2 py-2 rounded-lg border border-blue-200 bg-blue-50/50 text-[11px] font-semibold text-blue-900 hover:bg-blue-100 transition-colors text-center"
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('customer@acme.io', 'Customer@12345')}
                  className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 transition-colors text-center"
                >
                  Customer
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Test each account to experience strictly segregated role-based dashboards & authorizations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
