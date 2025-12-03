// src/pages/account/ChangePassword.jsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../../services/authService.js'

export default function ChangePassword(){
  const [form, setForm] = useState({
    oldPassword: '',
    password: '',
    confirmPassword: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const onChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (error) setError(null)
    if (success) setSuccess(null)
  }

  // --- fuerza de la contraseña (mismo helper que Register) ----------
  const strength = useMemo(()=> scorePassword(form.password), [form.password])
  const strengthPct  = Math.min(100, Math.round((strength.score/5)*100))
  const strengthTone =
    strength.score <= 2 ? 'bg-red-500'
    : strength.score === 3 ? 'bg-amber-500'
    : 'bg-emerald-600'

  const passwordsMatch = useMemo(
    ()=> form.password.length > 0 && form.password === form.confirmPassword,
    [form.password, form.confirmPassword]
  )

  const canSubmit =
    !loading &&
    !!form.oldPassword &&
    strength.score >= 3 &&
    passwordsMatch

  const onSubmit = async (e)=>{
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.oldPassword) {
      return setError('Debés ingresar tu contraseña actual.')
    }
    if(strength.score < 3){
      return setError('La contraseña es débil. Usá al menos 8 caracteres con mayúsculas, minúsculas, números y símbolo.')
    }
    if(!passwordsMatch){
      return setError('Las contraseñas no coinciden.')
    }

    setLoading(true)
    try{
      const payload = {
        old_password: form.oldPassword,
        new_password: form.password,
      }

      const res = await authService.client.post('/auth/password-change/', payload)

      const msg =
        res?.data?.message ||
        'Tu contraseña se actualizó correctamente.'
      setSuccess(msg)
      setForm({ oldPassword: '', password: '', confirmPassword: '' })
    }catch(err){
      const data = err?.response?.data
      let msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo cambiar la contraseña. Intentá nuevamente.'

      // errores específicos del backend
      if (data?.old_password && Array.isArray(data.old_password) && data.old_password[0]) {
        msg = data.old_password[0] // p.ej. "Wrong password."
      } else if (data?.new_password && Array.isArray(data.new_password) && data.new_password[0]) {
        msg = data.new_password[0]
      }

      setError(msg)
    }finally{
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="w-full max-w-3xl grid lg:grid-cols-[1.1fr,1fr] gap-10 items-stretch">
        {/* Panel lateral */}
        <div className="hidden lg:flex relative">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-2xl opacity-70"></div>
          <div className="card-surface p-10 flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Actualizá tu contraseña
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Por seguridad, te recomendamos usar una contraseña única para FondiArt,
              con combinación de mayúsculas, minúsculas, números y símbolos.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <Bullet>Protegé el acceso a tu cuenta y a tu wallet.</Bullet>
              <Bullet>Te avisaremos si la contraseña no cumple los requisitos mínimos.</Bullet>
              <Bullet>Podés cambiarla todas las veces que lo necesites.</Bullet>
            </ul>
          </div>
        </div>

        {/* Formulario principal */}
        <div className="card-surface p-8 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center">
            Cambiar contraseña
          </h1>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            {/* Contraseña actual */}
            <div>
              <label className="form-label" htmlFor="oldPassword">Contraseña actual</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="h-5 w-5"/>
                </span>
                <input
                  id="oldPassword"
                  name="oldPassword"
                  type="password"
                  className="input pl-10"
                  placeholder="Tu contraseña actual"
                  value={form.oldPassword}
                  onChange={onChange}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="form-label" htmlFor="password">Nueva contraseña</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="h-5 w-5"/>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={onChange}
                  required
                  autoComplete="new-password"
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

              {/* Barra de fuerza */}
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full ${strengthTone} transition-all`} style={{ width: `${strengthPct}%` }} />
              </div>

              {/* Reglas */}
              <div className="mt-2 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                <Rule ok={strength.hasLen8}>Mínimo 8 caracteres</Rule>
                <Rule ok={strength.hasLower}>Minúscula</Rule>
                <Rule ok={strength.hasUpper}>Mayúscula</Rule>
                <Rule ok={strength.hasNum}>Número</Rule>
                <Rule ok={strength.hasSym}>Símbolo</Rule>
              </div>
            </div>

            {/* Confirmar nueva contraseña */}
            <div>
              <label className="form-label" htmlFor="confirmPassword">Repetir nueva contraseña</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="h-5 w-5"/>
                </span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPass2 ? 'text' : 'password'}
                  className={`input pl-10 pr-10 ${form.confirmPassword && !passwordsMatch ? '!border-red-300 focus:!ring-red-200' : ''}`}
                  placeholder="Repetí la contraseña"
                  value={form.confirmPassword}
                  onChange={onChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={()=>setShowPass2(!showPass2)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700"
                  aria-label={showPass2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass2 ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                </button>
              </div>
              {form.confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                className="btn btn-outline flex-1"
                onClick={()=> navigate('/cuenta')}
                disabled={loading}
              >
                Volver a Mi perfil
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={!canSubmit}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner/> Guardando…
                  </span>
                ) : (
                  'Actualizar contraseña'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

/* ---------- misma lógica de fuerza que en Register ---------- */
function scorePassword(pw=''){
  const hasLen8  = pw.length >= 8
  const hasLower = /[a-z]/.test(pw)
  const hasUpper = /[A-Z]/.test(pw)
  const hasNum   = /\d/.test(pw)
  const hasSym   = /[^\w\s]/.test(pw)

  let score = 0
  ;[hasLen8, hasLower, hasUpper, hasNum, hasSym].forEach(ok => { if(ok) score++ })
  if (pw.length >= 12 && score >= 3) score++

  return { score: Math.min(score, 5), hasLen8, hasLower, hasUpper, hasNum, hasSym }
}

/* ---------- UI mini componentes ---------- */
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
function Rule({ ok, children }){
  return (
    <div className="inline-flex items-center gap-1.5">
      <svg className={`h-4 w-4 ${ok ? 'text-emerald-600' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={ok ? 'text-slate-700' : 'text-slate-400'}>{children}</span>
    </div>
  )
}

/* ---------- íconos & spinner ---------- */
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
