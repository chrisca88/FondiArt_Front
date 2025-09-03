import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'
import { updateProfile } from '../../features/auth/authSlice.js'

export default function Profile(){
  const user = useSelector(s => s.auth.user)
  const dispatch = useDispatch()

  const [form, setForm] = useState({
    name:   user?.name   || '',
    email:  user?.email  || '',
    avatar: user?.avatar || '',
    bio:    user?.bio    || '',
    phone:  user?.phone  || '',
  })
  const [saved, setSaved] = useState(false)

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  const onSubmit = (e)=>{
    e.preventDefault()
    dispatch(updateProfile(form))
    setSaved(true)
  }

  const isArtist = String(user?.role).toLowerCase() === 'artist'

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Cuenta</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mi perfil</h1>
          <p className="lead mt-2 max-w-2xl">
            Actualizá tu información básica. (Datos guardados en localStorage – modo demo)
          </p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 max-w-2xl space-y-5">
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

          {/* Teléfono (visible para todos) */}
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

          <div className="pt-2">
            <button className="btn btn-primary btn-lg">Guardar cambios</button>
            {saved && <span className="ml-3 text-sm text-emerald-600">¡Guardado!</span>}
          </div>
        </form>
      </div>
    </section>
  )
}
