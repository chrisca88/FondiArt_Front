import { useState } from 'react'
import { Link } from 'react-router-dom'
// si tuvieras una action tipo forgotPassword en redux, la vamos a enchufar después

export default function ForgotPassword(){
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e){
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // TODO: llamar endpoint de recuperación de contraseña
      // Ejemplo esperado:
      // await api.post('/api/v1/auth/forgot-password/', { email })

      // Si no hay endpoint todavía, simulamos el éxito:
      await new Promise(r => setTimeout(r, 600))

      setDone(true)
    } catch (err){
      console.error('[ForgotPassword][ERROR]', err)
      setError('No se pudo procesar tu solicitud. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="w-full max-w-lg">
        <div className="card-surface p-8 sm:p-10 shadow-xl rounded-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center">
            ¿Olvidaste tu contraseña?
          </h1>

          {done ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Si el correo existe en nuestro sistema, te enviamos instrucciones
              para restablecer tu contraseña.
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-600 text-center leading-relaxed">
                Ingresá tu email y te vamos a enviar un enlace para que puedas
                restablecer tu contraseña.
              </p>

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

                {/* Submit */}
                <button
                  className="btn btn-primary btn-lg w-full disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          <p className="text-center text-sm text-slate-600">
            ¿Ya la recordaste?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Volver a Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---------- íconos reutilizados ---------- */
function MailIcon(props){ 
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  )
}
