import { useEffect, useState } from 'react'
import { UserCheck, Shield, Plus, Trash2, ShieldAlert, Key } from 'lucide-react'
import LoadingState from '../components/common/LoadingState'
import ErrorState from '../components/common/ErrorState'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils/date'

export default function Users() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
  })

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([api.get('/users'), api.get('/customers')])
      .then(([u, c]) => {
        setUsers(u || [])
        setCustomers(c || [])
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto mt-12 space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-red-900">Access Restricted (403 Forbidden)</h2>
        <p className="text-xs text-red-700">
          User & Staff Management is reserved exclusively for System Administrators. Staff and Customer accounts are prohibited from viewing credentials, creating staff, or altering privileges.
        </p>
      </div>
    )
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    try {
      await api.post('/users', formData)
      setFeedback({ type: 'success', text: `User account for "${formData.name}" created successfully.` })
      setShowCreateModal(false)
      setFormData({ name: '', email: '', password: '', role: 'STAFF' })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create user' })
    }
  }

  async function handleDeleteUser(uId, uName) {
    if (!confirm(`Are you sure you want to permanently delete user account "${uName}"?`)) return
    try {
      await api.delete(`/users/${uId}`)
      setFeedback({ type: 'success', text: `User "${uName}" was removed.` })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete user' })
    }
  }

  async function handleAssignCustomer(customerId, staffId) {
    try {
      await api.patch(`/customers/${customerId}`, { assigned_staff_id: staffId ? Number(staffId) : null })
      setFeedback({ type: 'success', text: 'Customer assigned staff updated.' })
      load()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update assignment' })
    }
  }

  if (loading) return <LoadingState label="Loading users and staff directory…" />
  if (error && !users.length) return <ErrorState error={error} onRetry={load} />

  const staffMembers = users.filter((u) => u.role === 'STAFF' || u.role === 'ADMIN')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900">User & Staff Management</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage administrative personnel, operations staff accounts, role permissions, and customer account assignments.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium flex items-center gap-2 transition-colors self-start"
        >
          <Plus size={15} /> Add Staff Account
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {showCreateModal && (
        <form onSubmit={handleCreateUser} className="p-5 bg-white rounded-xl border border-slate-200 shadow-card space-y-4">
          <h3 className="text-sm font-bold text-navy-900">Create New System Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Full Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. priya@brightloop.io"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Initial Password</label>
              <input
                type="text"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="e.g. Staff@12345"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">System Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
              >
                <option value="STAFF">STAFF (Operations & Billing Support)</option>
                <option value="ADMIN">ADMIN (Full System Privileges)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium"
            >
              Create Account
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-navy-900">System Users ({users.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">User</th>
                <th className="py-2.5 px-3 font-semibold">Email</th>
                <th className="py-2.5 px-3 font-semibold">Role</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Created</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isRootAdmin = u.id === 1
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-navy-900">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                            u.role === 'ADMIN' ? 'bg-navy-900' : u.role === 'STAFF' ? 'bg-brand-600' : 'bg-slate-500'
                          }`}
                        >
                          {u.name.charAt(0)}
                        </span>
                        <span>{u.name}</span>
                        {isRootAdmin && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            root
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : u.role === 'STAFF'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {!isRootAdmin && u.id !== user.id ? (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Account Assignment Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-navy-800" />
          <h2 className="text-base font-semibold text-navy-900">Customer Staff Assignments</h2>
        </div>
        <p className="text-xs text-slate-500">
          Assign specific staff members to manage accounts. Staff dashboards will surface customer renewals and tasks based on assignments.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Customer</th>
                <th className="py-2.5 px-3 font-semibold">Company & Region</th>
                <th className="py-2.5 px-3 font-semibold">Assigned Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-navy-900">{c.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {c.company || c.name} · {c.region}
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={c.assigned_staff_id || ''}
                      onChange={(e) => handleAssignCustomer(c.id, e.target.value)}
                      className="px-2.5 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-brand-500 text-xs bg-white"
                    >
                      <option value="">Unassigned</option>
                      {staffMembers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
