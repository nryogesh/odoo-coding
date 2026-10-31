import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/layout/AppLayout'
import LoadingState from '../components/common/LoadingState'

export default function RequireAuth({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <LoadingState label="Restoring authenticated session…" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user.role?.toUpperCase()

  // Strict route isolation for Customers
  const customerAllowedPaths = ['/portal', '/ai-copilot', '/invoices']
  if (role === 'CUSTOMER' && !customerAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/portal" replace />
  }

  // Role validation
  if (roles && !roles.map((r) => r.toUpperCase()).includes(role)) {
    return <Navigate to={role === 'CUSTOMER' ? '/portal' : '/'} replace />
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
