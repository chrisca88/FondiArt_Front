import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function RequireAuth() {
  const { user, token, status } = useSelector(s => s.auth)
  const location = useLocation()


  if (status === 'loading') return null

  // En mock, con user ya alcanza; en real, token + user
  if (user || token) return <Outlet />

  return <Navigate to="/login" state={{ from: location }} replace />
}
