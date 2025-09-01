import { Link, NavLink } from 'react-router-dom'

export default function Navbar(){
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo / Home */}
        <Link to="/" className="text-2xl font-extrabold tracking-tight">
          Fondi<span className="text-indigo-600">Art</span>
        </Link>

        {/* Solo botones: Login y Registro */}
        <nav className="hidden sm:flex items-center gap-3">
          <NavLink to="/login" className="btn btn-outline">
            Login
          </NavLink>
          <NavLink to="/register" className="btn btn-outline">
            Registro
          </NavLink>
        </nav>

        {/* (Opcional) botón de menú para mobile */}
        <button className="sm:hidden text-xl" aria-label="Abrir menú">☰</button>
      </div>
    </header>
  )
}
