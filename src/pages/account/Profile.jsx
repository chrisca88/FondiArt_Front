// src/pages/account/Profile.jsx
import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'
import { saveProfile } from '../../features/auth/authSlice.js' // ✅ usar thunk real

export default function Profile(){
  const user = useSelector(s => s.auth.user)
  const status = useSelector(s => s.auth.status)
  const error  = useSelector(s => s.auth.error)
  const dispatch = useDispatch()

  const [form, setForm] = useState({
    name:   user?.name   || '',
    email:  user?.email  || '',
    avatar: user?.avatar || '',
    bio:    user?.bio    || '',
    phone:  user?.phone  || '',
    dni:    user?.dni    || '',
    cbu:    user?.cbu    || '',
  })
  const [saved, setSaved]  = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitErr, setSubmitErr] = useState('')

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setSaved(false)
    setSubmitErr('')
  }

  const validate = ()=>{
    const errs = {}

    // DNI: 7 a 9 dígitos (flexible; ajustá si querés 8 exactos)
    if (form.dni && !/^\d{7,9}$/.test(form.dni.trim())) {
      errs.dni = 'El DNI debe tener solo números (7 a 9 dígitos).'
    }

    // CBU: 22 dígitos sin guiones ni espacios
    if (form.cbu && !/^\d{22}$/.test(form.cbu.trim())) {
      errs.cbu = 'El CBU debe tener 22 dígitos (sin espacios ni guiones).'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e)=>{
    e.preventDefault()
    setSubmitErr('')
    if (!validate()) return
    setSaving(true)
    try{
      // Enviamos TODO el formulario. El backend actualizará los campos permitidos.
      await dispatch(saveProfile({
        name  : form.name,
        email : form.email,
        avatar: form.avatar,
        bio   : form.bio,
        phone : form.phone,
        dni   : form.dni?.trim() || null,
        cbu   : form.cbu?.trim() || null,
      })).unwrap()
      setSaved(true)
    }catch(err){
      setSubmitErr(err || 'No se pudo guardar los cambios.')
    }finally{
      setSaving(false)
    }
  }

  const isArtist = String(user?.role).toLowerCase() === 'artist'
  const fmtInputError = (key)=> errors[key] ? '!border-red-300 focus:!ring-red-200' : ''

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Cuenta</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mi perfil</h1>
          <p className="lead mt-2 max-w-2xl">
            Actualizá tu información básica.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 max-w-2xl space-y-5">
          {submitErr && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm">
              {submitErr}
            </div>
          )}
          {error && status === 'failed' && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm">
              {String(error)}
            </div>
          )}

          <div className="flex items-center gap-4">
            {form.avatar ? (
              <img src={form.avatar} alt="preview" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-200" />
            )}
            <div className="text-sm text-slate-600">
              Pegá una URL de imagen para usar como foto de perfil.
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="input" value={form.name} onChange={onChange} />
          </div>

          <div>
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" value={form.email} onChange={onChange} />
          </div>

          <div>
            <label className="form-label" htmlFor="avatar">URL de avatar</label>
            <input
              id="avatar"
              name="avatar"
              className="input"
              placeholder="https://…"
              value={form.avatar}
              onChange={onChange}
            />
          </div>

          {/* Solo ARTISTA: Biografía */}
          {isArtist && (
            <div>
              <label className="form-label" htmlFor="bio">Biografía</label>
              <textarea
                id="bio"
                name="bio"
                className="input h-32"
                placeholder="Contanos sobre vos, tu estilo, exposiciones, etc."
                value={form.bio}
                onChange={onChange}
              />
              <p className="text-xs text-slate-500 mt-1">
                Esto puede mostrarse en tu perfil público junto a tus obras.
              </p>
            </div>
          )}

          {/* Teléfono */}
          <div>
            <label className="form-label" htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="input"
              placeholder="+54 11 5555-5555"
              value={form.phone}
              onChange={onChange}
            />
          </div>

          {/* DNI */}
          <div>
            <label className="form-label" htmlFor="dni">DNI</label>
            <input
              id="dni"
              name="dni"
              inputMode="numeric"
              autoComplete="off"
              className={`input ${fmtInputError('dni')}`}
              placeholder="Solo números — ej: 30123456"
              value={form.dni}
              onChange={(e)=> onChange({ target: { name: 'dni', value: e.target.value.replace(/[^\d]/g,'') } })}
              maxLength={9}
            />
            {errors.dni && <p className="text-xs text-red-600 mt-1">{errors.dni}</p>}
          </div>

          {/* CBU */}
          <div>
            <label className="form-label" htmlFor="cbu">CBU</label>
            <input
              id="cbu"
              name="cbu"
              inputMode="numeric"
              autoComplete="off"
              className={`input ${fmtInputError('cbu')}`}
              placeholder="22 dígitos sin guiones — ej: 2850590940090418135201"
              value={form.cbu}
              onChange={(e)=> onChange({ target: { name: 'cbu', value: e.target.value.replace(/[^\d]/g,'') } })}
              maxLength={22}
            />
            {errors.cbu && <p className="text-xs text-red-600 mt-1">{errors.cbu}</p>}
          </div>

          <div className="pt-2">
            <button className="btn btn-primary btn-lg" disabled={saving || status === 'loading'}>
              {saving || status === 'loading' ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {saved && <span className="ml-3 text-sm text-emerald-600">¡Guardado!</span>}
          </div>
        </form>
      </div>
    </section>
  )
}
