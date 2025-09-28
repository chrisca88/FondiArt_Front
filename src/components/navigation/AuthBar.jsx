// src/components/navigation/AuthBar.jsx
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../features/auth/authSlice'

export default function AuthBar(){
  const { isAuthenticated, user } = useSelector(s=>s.auth)
  const dispatch = useDispatch()
  const nav = useNavigate()

  const onLogout = ()=> { dispatch(logout()); nav('/') }

  return (
    <div className="bg-gray-100 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-end gap-4">
        {!isAuthenticated ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Registro</Link>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Hola, {user?.name || user?.email}</span>
            <Link to="/dashboard" className="font-semibold">Dashboard</Link>
            {user?.role === 'buyer' && (
              <Link to="/mercado" className="font-semibold">Mercado</Link>
            )}
            <button onClick={onLogout}>Salir</button>
          </>
        )}
      </div>
    </div>
  )
}
