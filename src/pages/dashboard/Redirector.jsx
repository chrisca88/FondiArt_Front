// src/pages/dashboard/Redirector.jsx
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Redirector() {
  const user = useSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Si no hay usuario -> login
    if (!user) {
      navigate('/login', { replace: true, state: { from: location } })
      return
    }

    // Normalizamos rol
    const rawRole =
      user?.role ??
      user?.metadata?.role ??
      user?.profile?.role ??
      user?.user?.role
    const role = String(rawRole || '').trim().toLowerCase()

    // Redirección centralizada por rol
    if (role === 'artist') {
      navigate('/mis-obras', { replace: true })
    } else if (role === 'buyer') {
      navigate('/comprar', { replace: true })
    } else {
      // Rol desconocido -> home
      navigate('/', { replace: true })
    }
  }, [user, navigate, location])

  return null
}
