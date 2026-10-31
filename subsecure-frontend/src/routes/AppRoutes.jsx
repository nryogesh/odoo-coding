import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/layout/AppLayout'
import LoadingState from '../components/common/LoadingState'

function RequireAuth({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen grid place-items-center"><LoadingState label="Restoring session…" /></div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role === 'CUSTOMER' && location.pathname !== '/portal') return <Navigate to="/portal" replace />
  if (roles && !roles.map(r => r.toUpperCase()).includes(user.role)) {
    return <Navigate to={user.role === 'CUSTOMER' ? '/portal' : '/'} replace />
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default RequireAuth
