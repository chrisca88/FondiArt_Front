// src/layouts/FullWidthLayout.jsx
import { Link, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import AvatarMenu from '../components/navigation/AvatarMenu.jsx'

export default function FullWidthLayout(){
  const user = useSelector(s => s.auth.user)

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="section-frame h-full flex items-center justify-between">
          <Link to="/" className="text-xl sm:text-2xl font-extrabold tracking-tight">
            <span className="text-slate-900">Fondi</span>
            <span className="text-indigo-600">Art</span>
          </Link>

          {/* Cuando NO hay sesión: sólo botones Login y Registro */}
          {!user ? (
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/register" className="btn btn-outline">Registro</Link>
            </nav>
          ) : (
            // Con sesión: avatar con menú
            <div className="flex items-center gap-3">
              <AvatarMenu user={user} />
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white/60">
        <div className="section-frame py-6 text-sm flex items-center justify-between text-slate-600">
          <div>© {new Date().getFullYear()} FondiArt</div>
          <Link to="/tyc" className="hover:underline">Términos & Condiciones</Link>
        </div>
      </footer>
    </div>
  )
}
