// src/components/navigation/AvatarMenu.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logout } from '../../features/auth/authSlice.js'

export default function AvatarMenu({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const initials = (user?.name || user?.email || 'U').split(' ')
    .map(s => s[0]).slice(0,2).join('').toUpperCase()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  const isArtist = user?.role === 'artist'
  const isBuyer  = user?.role === 'buyer'
  const isAdmin  = user?.role === 'admin'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/70 px-2 py-1 hover:bg-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-white text-sm font-semibold">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-xl"
        >
          <div className="px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cuenta</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 leading-tight line-clamp-1">
              {user?.name || user?.email}
            </div>
            {user?.role && <div className="text-xs text-slate-500">Rol: {user.role}</div>}
          </div>
          <div className="h-px bg-slate-200/70" />

          <nav className="py-1 text-sm">
            {/* Dashboard para todos excepto artista (tu lógica original) */}
            {!isArtist && (
              <Link className="block px-4 py-2 hover:bg-slate-50" to="/dashboard" onClick={()=>setOpen(false)}>
                Dashboard
              </Link>
            )}

            {/* Ítems generales */}
            <Link className="block px-4 py-2 hover:bg-slate-50" to="/wallet" onClick={()=>setOpen(false)}>
              Wallet
            </Link>

            {isBuyer && (
              <>
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/mercado" onClick={()=>setOpen(false)}>
                  Mercado secundario
                </Link>
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/donaciones" onClick={()=>setOpen(false)}>
                  Donaciones
                </Link>
              </>
            )}

            <Link className="block px-4 py-2 hover:bg-slate-50" to="/cuenta" onClick={()=>setOpen(false)}>
              Mi perfil
            </Link>

            {/* SOLO ARTISTA */}
            {isArtist && (
              <>
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/mis-obras" onClick={()=>setOpen(false)}>
                  Mis obras
                </Link>
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/mis-proyectos" onClick={()=>setOpen(false)}>
                  Mis proyectos
                </Link>
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/publicar" onClick={()=>setOpen(false)}>
                  Publicar obra
                </Link>
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/proyectos/nuevo" onClick={()=>setOpen(false)}>
                  Nuevo proyecto
                </Link>
              </>
            )}

            {/* SOLO ADMIN: acceso a subastas desde el menú */}
            {isAdmin && (
              <>
                <div className="h-px bg-slate-200/70 my-1" />
                <Link className="block px-4 py-2 hover:bg-slate-50" to="/admin/subastas" onClick={()=>setOpen(false)}>
                  Gestionar subastas
                </Link>
              </>
            )}
          </nav>

          <div className="h-px bg-slate-200/70" />
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
