// src/pages/account/Profile.jsx
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { saveProfile } from '../../features/auth/authSlice.js'
import authService from '../../services/authService.js'

export default function Profile(){
  const user   = useSelector(s => s.auth.user)
  const status = useSelector(s => s.auth.status)
  const error  = useSelector(s => s.auth.error)
  const dispatch = useDispatch()

  const [form, setForm] = useState({
    name:      user?.name      || '',
    email:     user?.email     || '',
    avatarUrl: user?.avatarUrl || user?.avatar || '',
    bio:       user?.bio       || '',
    phone:     user?.phone     || '',
    dni:       user?.dni       || '',
    cbu:       user?.cbu       || '',
  })

  useEffect(()=>{
    setForm(f => ({
      ...f,
      name:      user?.name      ?? f.name,
      email:     user?.email     ?? f.email,
      avatarUrl: (user?.avatarUrl || user?.avatar) ?? f.avatarUrl,
      bio:       user?.bio       ?? f.bio,
      phone:     user?.phone     ?? f.phone,
      dni:       user?.dni       ?? f.dni,
      cbu:       user?.cbu       ?? f.cbu,
    }))
  }, [user?.name, user?.email, user?.avatarUrl, user?.avatar, user?.bio, user?.phone, user?.dni, user?.cbu])

  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitErr, setSubmitErr] = useState('')

  // Subida de imagen
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadErr, setUploadErr] = useState('')
  const [localPreview, setLocalPreview] = useState('')

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setSaved(false)
    setSubmitErr('')
  }

  const validate = ()=>{
    const errs = {}
    if (form.dni && !/^\d{7,9}$/.test(form.dni.trim())) errs.dni = 'El DNI debe tener solo números (7 a 9 dígitos).'
    if (form.cbu && !/^\d{22}$/.test(form.cbu.trim())) errs.cbu = 'El CBU debe tener 22 dígitos (sin espacios ni guiones).'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e)=>{
    e.preventDefault()
    setSubmitErr('')
    setSaved(false)
    if (!validate()) return
    setSaving(true)
    try{
      await dispatch(saveProfile({
        name     : form.name,
        email    : form.email,
        avatarUrl: form.avatarUrl?.trim() || null, // se guarda secure_url
        bio      : form.bio,
        phone    : form.phone,
        dni      : form.dni?.trim() || null,
        cbu      : form.cbu?.trim() || null,
      })).unwrap()
      setSaved(true)
    }catch(err){
      setSubmitErr(err || 'No se pudo guardar los cambios.')
    }finally{
      setSaving(false)
    }
  }

  async function onFileChange(e){
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErr('')
    setSaved(false)

    try { setLocalPreview(URL.createObjectURL(file)) } catch {}

    setUploading(true)
    setUploadProgress(0)
    try{
      const { url } = await authService.uploadImage(
        file,
        { folder: 'avatars' },
        (pct)=> setUploadProgress(pct)
      )
      if (!url) throw new Error('El servidor no devolvió secure_url')
      setForm(prev => ({ ...prev, avatarUrl: url }))
      if (import.meta.env.DEV) console.log('[Profile] upload OK -> secure_url:', url)
    }catch(err){
      const msg = err?.response?.data?.message || err?.message || 'No se pudo subir la imagen.'
      setUploadErr(msg)
      if (import.meta.env.DEV) console.error('[Profile] upload ERROR:', msg)
    }finally{
      setUploading(false)
    }
  }

  const isArtist = String(user?.role).toLowerCase() === 'artist'
  const fmtInputError = (key)=> errors[key] ? '!border-red-300 focus:!ring-red-200' : ''
  const previewSrc = localPreview || form.avatarUrl

  // Logs útiles para diagnosticar “se desloguea”
  useEffect(()=>{
    if (import.meta.env.DEV) {
      console.log('[Profile] user store:', user)
      console.log('[Profile] token in LS exists?:', !!localStorage.getItem('token'))
    }
  }, [user])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Cuenta</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mi perfil</h1>
          <p className="lead mt-2 max-w-2xl">Actualizá tu información básica y tu foto de perfil.</p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 max-w-2xl space-y-5">

          {/* Alertas */}
          {saved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 text-sm">
              ¡Datos guardados correctamente!
            </div>
          )}
          {(submitErr || (error && status === 'failed')) && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm">
              {submitErr || String(error)}
            </div>
          )}

          {/* Avatar + subida */}
          <div className="flex items-center gap-4">
            {previewSrc ? (
              <img src={previewSrc} alt="preview" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-200" />
            )}
            <div className="text-sm text-slate-600">
              Subí una imagen desde tu computadora. Se guardará cuando confirmes los cambios.
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="avatarFile">Subir imagen (local)</label>
            <input
              id="avatarFile"
              type="file"
              accept="image/*"
              className="block w-full text-sm"
              onChange={onFileChange}
              disabled={uploading}
            />
            {uploading && (
              <div className="mt-2">
                <div className="h-2 rounded bg-slate-200 overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }}/>
                </div>
                <div className="text-xs text-slate-600 mt-1">Subiendo… {Math.round(uploadProgress)}%</div>
              </div>
            )}
            {uploadErr && <div className="text-xs text-red-600 mt-2">{uploadErr}</div>}
            {!uploading && form.avatarUrl && (
              <div className="text-xs text-emerald-700 mt-2">
                Imagen subida. Recordá presionar <strong>Guardar cambios</strong> para persistirla.
              </div>
            )}
          </div>

          {/* (URL de avatar oculta) */}
          <input type="hidden" name="avatarUrl" value={form.avatarUrl} readOnly />

          <div>
            <label className="form-label" htmlFor="name">Nombre</label>
            <input id="name" name="name" className="input" value={form.name} onChange={onChange} />
          </div>

          <div>
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" value={form.email} onChange={onChange} />
          </div>

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
              <p className="text-xs text-slate-500 mt-1">Esto puede mostrarse en tu perfil público.</p>
            </div>
          )}

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
            <button className="btn btn-primary btn-lg" disabled={saving || status === 'loading' || uploading}>
              {saving || status === 'loading'
                ? 'Guardando…'
                : uploading
                ? 'Esperá a que termine la subida…'
                : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
