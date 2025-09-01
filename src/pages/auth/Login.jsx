// src/pages/auth/Login.jsx
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { login, loginDemo } from '../../features/auth/authSlice.js'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const onSubmit = async (e)=>{
    e.preventDefault()
    setError(null)
    setLoading(true)
    const action = await dispatch(login({ email, password }))
    setLoading(false)

    if (login.fulfilled.match(action)) {
      if (!remember) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      // SIEMPRE a /dashboard → Redirector decide según el rol
      navigate('/dashboard', { replace: true })
    } else {
      setError('Credenciales inválidas o error del servidor.')
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-stretch">

        {/* Panel visual / branding */}
        <div className="hidden lg:flex relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-2xl opacity-70"></div>
          <div className="card-surface p-10 flex flex-col justify-center">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Bienvenido a <span className="text-indigo-600">FondiArt</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Ingresá para publicar tus obras o invertir en fracciones tokenizadas.
              Si todavía no tenés cuenta, podés registrarte en pocos pasos.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <Bullet>Accedé a tu panel según rol</Bullet>
              <Bullet>Seguimiento de obras y compras</Bullet>
              <Bullet>Seguridad y verificación de identidad</Bullet>
            </ul>
          </div>
        </div>

        {/* Formulario */}
        <div className="card-surface p-8 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center">Iniciar sesión</h1>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            {/* Email */}
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon className="h-5 w-5"/>
                </span>
                <input
                  id="email"
                  type="email"
                  className="input pl-10"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="h-5 w-5"/>
                </span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={()=>setShowPass(!showPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                </button>
              </div>
            </div>

            {/* Row: remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 select-none">
                <input type="checkbox" className="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>
                <span className="text-sm text-slate-700">Recordarme</span>
              </label>
              <a href="#" className="text-sm text-indigo-600 hover:underline">¿Olvidaste tu contraseña?</a>
            </div>

            {/* Submit */}
            <button
              className="btn btn-primary btn-lg w-full disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner/> Entrando…
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <div className="grid sm:grid-cols-1 gap-3">
            <button className="w-full rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm font-semibold hover:bg-white">
              Continuar con Google
            </button>

            <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <div className="grid sm:grid-cols-2 gap-3">
              {/* Comprador (demo) */}
              <button
                type="button"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm font-semibold hover:bg-white"
                onClick={async ()=>{
                  setError(null)
                  const action = await dispatch(loginDemo('buyer'))
                  if (loginDemo.fulfilled.match(action)) {
                    if (!remember) {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                    }
                    navigate('/dashboard', { replace: true })
                  } else {
                    setError('No se pudo iniciar sesión demo.')
                  }
                }}
              >
                Entrar como Comprador (demo)
              </button>

              {/* Artista (demo) */}
              <button
                type="button"
                className="w-full rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm font-semibold hover:bg-white"
                onClick={async ()=>{
                  setError(null)
                  const action = await dispatch(loginDemo('artist'))
                  if (loginDemo.fulfilled.match(action)) {
                    if (!remember) {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                    }
                    navigate('/dashboard', { replace: true })
                  } else {
                    setError('No se pudo iniciar sesión demo.')
                  }
                }}
              >
                Entrar como Artista (demo)
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">Registrate</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------- Subcomponentes ------- */
function Bullet({ children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  )
}

/* ---------- íconos & spinner ---------- */
function MailIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
    <rect x="3" y="5" width="18" height="14" rx="2" />
  </svg>
)}
function LockIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 118 0v3" />
  </svg>
)}
function EyeIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)}
function EyeOffIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 4.14A10.94 10.94 0 0112 4c6 0 10 7 10 7a18.4 18.4 0 01-3.18 4.17M6.1 6.1C3.64 7.86 2 11 2 11s4 7 10 7c1.23 0 2.4-.22 3.48-.62" />
  </svg>
)}
function Spinner(){ return (
  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
  </svg>
)}
