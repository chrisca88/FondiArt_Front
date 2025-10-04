// src/pages/projects/ProjectForm.jsx
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link, useParams } from 'react-router-dom'
import authService from '../../services/authService.js'

export default function ProjectForm(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()
  const params = useParams()
  // aceptamos id o pk por compatibilidad de rutas
  const projectId = params?.id ?? params?.pk ?? null
  const isEdit = !!projectId

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: '',        // URL (subida) que va al campo "image"
    goalARS: '',
  })
  const [loading, setLoading] = useState(isEdit)   // cargamos datos si es edición
  const [loadErr, setLoadErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // --- estado de upload de portada ---
  const [upLoading, setUpLoading] = useState(false)
  const [upPct, setUpPct] = useState(0)
  const [upErr, setUpErr] = useState('')
  const fileRef = useRef(null)

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(f=>({ ...f, [name]: value }))
  }

  // ---------- Helpers ----------
  const toDecimal = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '0.00'
    return n.toFixed(2) // API espera string decimal, ej "8000.00"
  }

  const validate = () => {
    if (!form.title.trim()) return 'Ingresá un título.'
    if (!form.description.trim()) return 'Ingresá una descripción.'
    if (!form.cover.trim()) return 'Subí una imagen de portada.'
    const goal = Number(form.goalARS)
    if (!Number.isFinite(goal) || goal < 1) return 'Ingresá una meta válida (mínimo 1).'
    return ''
  }

  // ---------- Carga para edición ----------
  useEffect(()=>{
    if (!isEdit) return
    let alive = true
    setLoading(true)
    setLoadErr('')
    authService.client.get(`/projects/${projectId}/`)
      .then(res=>{
        if (!alive) return
        const p = res?.data || {}
        // mapeo de API -> formulario local
        setForm({
          title: p?.title || '',
          description: p?.description || '',
          cover: p?.image || '',
          goalARS: String(p?.funding_goal ?? '').replace(',', '.') || '',
        })
      })
      .catch(err=>{
        if (!alive) return
        setLoadErr(err?.response?.data?.message || err?.message || 'No se pudo cargar el proyecto.')
      })
      .finally(()=> alive && setLoading(false))
    return ()=>{ alive = false }
  }, [isEdit, projectId])

  // Abrir selector de archivos
  const pickFile = ()=>{
    setUpErr('')
    fileRef.current?.click()
  }

  // Subir a tu endpoint de imágenes -> guardamos secure_url en cover
  const onFileSelected = async (e)=>{
    const file = e.target.files?.[0]
    if (!file) return
    setUpErr('')
    setUpPct(0)
    setUpLoading(true)
    try{
      const { url } = await authService.uploadImage(
        file,
        { folder: 'projects/covers', tags: ['project', user?.id || 'anon'] },
        (pct)=> setUpPct(pct)
      )
      if (!url) throw new Error('No se recibió la URL de la imagen subida.')
      setForm(f=>({ ...f, cover: url }))
    }catch(err){
      setUpErr(err?.response?.data?.message || err?.message || 'No se pudo subir la imagen.')
    }finally{
      setUpLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeCover = ()=>{
    setForm(f=>({ ...f, cover: '' }))
    setUpErr('')
    setUpPct(0)
  }

  const onSubmit = async (e)=>{
    e.preventDefault()
    if (saving || upLoading) return
    setSaveErr('')
    const v = validate()
    if (v){ setSaveErr(v); return }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.cover.trim(),
      funding_goal: toDecimal(form.goalARS),
    }

    // Debug útil en DEV
    if (import.meta.env.DEV) {
      console.log(`[PROJECT FORM] ${isEdit ? 'PUT' : 'POST'} /projects${isEdit?`/${projectId}`:''}/ -> payload:`, payload)
    }

    setSaving(true)
    try{
      let res
      if (isEdit) {
        // PUT -> actualización completa
        res = await authService.client.put(`/projects/${projectId}/`, payload)
      } else {
        // POST -> crear (si tu back lo soporta)
        res = await authService.client.post('/projects/', payload)
      }
      const created = res?.data || {}
      if (import.meta.env.DEV) {
        console.log('[PROJECT FORM] response:', created)
      }
      // navegamos al detalle
      const goId = created?.id ?? projectId
      navigate(`/proyecto/${goId}`, { replace: true })
    }catch(err){
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err.response.data : '') ||
        err?.message ||
        'No se pudo guardar el proyecto.'
      setSaveErr(msg)
    }finally{
      setSaving(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Proyectos</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h1>
          <p className="lead mt-2 max-w-2xl">
            {isEdit ? 'Actualizá la información de tu proyecto.' : 'Publicá una idea o serie a financiar mediante donaciones.'}
          </p>
        </div>

        {loading ? (
          <div className="card-surface p-6 max-w-3xl">
            <div className="h-28 bg-slate-200/70 rounded-2xl animate-pulse" />
          </div>
        ) : loadErr ? (
          <div className="card-surface p-6 max-w-3xl text-red-600">{loadErr}</div>
        ) : (
          <form onSubmit={onSubmit} className="card-surface p-6 max-w-3xl space-y-5">
            {!!saveErr && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2">{saveErr}</div>}

            <div>
              <label className="form-label" htmlFor="title">Título</label>
              <input
                id="title"
                name="title"
                className="input"
                placeholder="Ej. Serie Montañas de Luz"
                value={form.title}
                onChange={onChange}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="description">Descripción</label>
              <textarea
                id="description"
                name="description"
                className="input h-36"
                placeholder="Contá de qué se trata…"
                value={form.description}
                onChange={onChange}
              />
            </div>

            {/* ========= Portada: subir desde PC ========= */}
            <div>
              <label className="form-label">Imagen de portada</label>

              {!form.cover && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-center">
                  <p className="text-sm text-slate-600">Subí una imagen desde tu computadora.</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={pickFile}
                      disabled={upLoading}
                    >
                      {upLoading ? 'Subiendo…' : 'Subir portada'}
                    </button>
                  </div>

                  {upLoading && (
                    <div className="mt-3">
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{ width: `${upPct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{upPct}%</div>
                    </div>
                  )}

                  {upErr && <div className="mt-2 text-sm text-red-600">{upErr}</div>}
                </div>
              )}

              {!!form.cover && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/70">
                  <img
                    src={form.cover}
                    alt="Portada del proyecto"
                    className="w-full max-h-[360px] object-cover"
                  />
                  <div className="p-3 flex items-center gap-2">
                    <button type="button" className="btn btn-outline" onClick={pickFile} disabled={upLoading}>
                      Reemplazar imagen
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={removeCover} disabled={upLoading}>
                      Quitar
                    </button>
                    {upLoading && (
                      <div className="ml-auto text-sm text-slate-600">
                        Subiendo… {upPct}%
                      </div>
                    )}
                  </div>
                  {upErr && <div className="px-3 pb-3 text-sm text-red-600">{upErr}</div>}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileSelected}
              />

              {/* Campo URL oculto (debug) */}
              <input
                id="cover"
                name="cover"
                className="input hidden"
                placeholder="https://…"
                value={form.cover}
                onChange={onChange}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            {/* ========= Fin portada ========= */}

            <div>
              <label className="form-label" htmlFor="goalARS">Meta de recaudación (ARS)</label>
              <input
                id="goalARS"
                name="goalARS"
                type="number"
                min="0"
                className="input"
                placeholder="Ej. 250000"
                value={form.goalARS}
                onChange={onChange}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || upLoading || !user}
                title={
                  !user
                    ? 'Debés iniciar sesión para guardar el proyecto'
                    : upLoading ? 'Esperá a que termine la subida' : undefined
                }
              >
                {saving ? (isEdit ? 'Actualizando…' : 'Publicando…') : (isEdit ? 'Guardar cambios' : 'Publicar proyecto')}
              </button>
              <Link to="/donaciones" className="btn btn-outline">Cancelar</Link>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
