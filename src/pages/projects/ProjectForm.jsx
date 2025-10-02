// src/pages/projects/ProjectForm.jsx
import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { createProject } from '../../services/mockProjects.js'
import authService from '../../services/authService.js'

export default function ProjectForm(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: '',        // URL que recibimos del upload
    goalARS: '',
  })
  const [saving, setSaving] = useState(false)

  // --- estado de upload de portada ---
  const [upLoading, setUpLoading] = useState(false)
  const [upPct, setUpPct] = useState(0)
  const [upErr, setUpErr] = useState('')
  const fileRef = useRef(null)

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(f=>({ ...f, [name]: value }))
  }

  // Abrir selector de archivos
  const pickFile = ()=>{
    setUpErr('')
    fileRef.current?.click()
  }

  // Cargar archivo -> subir a /api/v1/upload -> guardar secure_url en cover
  const onFileSelected = async (e)=>{
    const file = e.target.files?.[0]
    if (!file) return
    setUpErr('')
    setUpPct(0)
    setUpLoading(true)
    try{
      const { url } = await authService.uploadImage(
        file,
        {
          folder: 'projects/covers',
          tags: ['project', user?.id || 'anon'],
        },
        (pct)=> setUpPct(pct)
      )
      if (!url) throw new Error('No se recibió la URL de la imagen subida.')
      setForm(f=>({ ...f, cover: url }))
    }catch(err){
      setUpErr(err?.response?.data?.message || err?.message || 'No se pudo subir la imagen.')
    }finally{
      setUpLoading(false)
      // limpiar el input file para permitir re-seleccionar el mismo archivo si hace falta
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
    setSaving(true)
    try{
      const created = await createProject({
        user,
        title: form.title,
        description: form.description,
        cover: form.cover,                 // URL subida a Cloudinary
        goalARS: Number(form.goalARS),
      })
      navigate(`/proyecto/${created.id}`, { replace:true })
    }finally{
      setSaving(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Proyectos</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Nuevo proyecto</h1>
          <p className="lead mt-2 max-w-2xl">Publicá una idea o serie a financiar mediante donaciones.</p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 max-w-3xl space-y-5">
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

          {/* ========= Portada: subir desde PC (URL oculta) ========= */}
          <div>
            <label className="form-label">Imagen de portada</label>

            {/* Botón para elegir archivo */}
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

                {/* Progreso */}
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

            {/* Preview + acciones si ya hay portada */}
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

            {/* input file oculto */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected}
            />

            {/* Campo URL oculto (compatibilidad / debugging) */}
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
              disabled={saving || upLoading}
              title={upLoading ? 'Esperá a que termine la subida' : undefined}
            >
              {saving ? 'Publicando…' : 'Publicar proyecto'}
            </button>
            <Link to="/donaciones" className="btn btn-outline">Cancelar</Link>
          </div>
        </form>
      </div>
    </section>
  )
}
