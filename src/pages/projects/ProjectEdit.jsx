// src/pages/projects/ProjectEdit.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import authService from '../../services/authService.js'
import { getById as mockGetById, updateProject as mockUpdateProject } from '../../services/mockProjects.js'

const fixImageUrl = (url) => {
  if (typeof url !== 'string') return url
  const marker = 'https%3A/'
  const idx = url.indexOf(marker)
  return idx !== -1 ? 'https://' + url.substring(idx + marker.length) : url
}

export default function ProjectEdit(){
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  // Subida a Cloudinary
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileInputRef = useRef(null)

  // Solo campos editables: título, descripción, imagen (cover)
  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: '',
  })

  // Cargar: API real primero, mock como fallback. NO redirige en error.
  useEffect(()=>{
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await authService.client.get(`/projects/${id}/`)
        if (!alive) return
        setForm({
          title: data?.title || '',
          description: data?.description || '',
          cover: fixImageUrl(data?.image || ''),
        })
      } catch {
        try {
          const p = await mockGetById(id)
          if (!alive) return
          setForm({
            title: p.title || '',
            description: p.description || '',
            cover: p.cover || '',
          })
        } catch {
          if (!alive) return
          setError('No se pudo cargar el proyecto para editar.')
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return ()=>{ alive = false }
  }, [id])

  const onChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  // ----- subida a Cloudinary (unsigned) -----
  async function uploadToCloudinary(file){
    setUploadErr('')
    if (!file) { setUploadErr('No se seleccionó archivo.'); return }

    // Validaciones simples
    const maxMB = 10
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setUploadErr('Formato no soportado. Usá JPG, PNG, WEBP o GIF.')
      return
    }
    if (file.size > maxMB * 1024 * 1024) {
      setUploadErr(`La imagen no puede superar ${maxMB} MB.`)
      return
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD
    const preset    = import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET
    const folder    = import.meta.env.VITE_CLOUDINARY_FOLDER || 'fondiart/projects'

    if (!cloudName || !preset) {
      setUploadErr('Cloudinary no está configurado. Definí VITE_CLOUDINARY_CLOUD y VITE_CLOUDINARY_UNSIGNED_PRESET.')
      return
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    const formData = new FormData()
    formData.append('upload_preset', preset)
    formData.append('folder', folder)
    formData.append('file', file)

    try{
      setUploading(true)
      const res = await fetch(url, { method: 'POST', body: formData })
      if (!res.ok) {
        const t = await res.text().catch(()=>null)
        throw new Error(t || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const secureUrl = json?.secure_url || json?.url
      if (!secureUrl) throw new Error('La respuesta no incluyó la URL de la imagen.')
      setForm(f => ({ ...f, cover: secureUrl }))
    }catch(e){
      setUploadErr(e?.message || 'No se pudo subir la imagen.')
    }finally{
      setUploading(false)
    }
  }

  const onPickFile = () => {
    setUploadErr('')
    fileInputRef.current?.click()
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) uploadToCloudinary(file)
    // limpiar el input para permitir re-seleccionar el mismo archivo si hace falta
    e.target.value = ''
  }
  // ------------------------------------------

  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    setSaving(true)
    try{
      // PATCH real (solo campos permitidos)
      const payload = {
        title: form.title?.trim(),
        description: form.description?.trim(),
        image: form.cover?.trim(),
      }
      await authService.client.patch(`/projects/${id}/`, payload)
      setOk(true)
      setTimeout(()=> navigate('/mis-proyectos', { replace:true }), 1000)
    }catch(eApi){
      // Fallback a mock en dev
      try{
        await mockUpdateProject(id, {
          title: form.title?.trim(),
          description: form.description?.trim(),
          cover: form.cover?.trim(),
        })
        setOk(true)
        setTimeout(()=> navigate('/mis-proyectos', { replace:true }), 1000)
      }catch{
        setError(eApi?.response?.data?.detail || eApi?.message || 'No se pudo guardar')
      }
    }finally{
      setSaving(false)
    }
  }

  if (loading) return <section className="section-frame py-16"><div className="h-48 bg-slate-200/70 animate-pulse rounded-3xl"/></section>

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Proyectos</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Editar proyecto</h1>
          <p className="lead mt-2 max-w-2xl">
            Actualizá título, descripción o imagen del proyecto. <strong>*La meta no es editable.</strong>
          </p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 sm:p-8 max-w-3xl space-y-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="form-label" htmlFor="title">Título</label>
            <input id="title" name="title" className="input" value={form.title} onChange={onChange}/>
          </div>

          <div>
            <label className="form-label" htmlFor="description">Descripción</label>
            <textarea id="description" name="description" className="input h-32" value={form.description} onChange={onChange}/>
          </div>

          {/* Imagen / Cloudinary */}
          <div className="space-y-2">
            <label className="form-label">Imagen del proyecto</label>

            {/* Botón para subir archivo */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onPickFile}
                disabled={uploading}
                title="Subir imagen desde tu equipo"
              >
                {uploading ? 'Subiendo…' : 'Subir nueva imagen'}
              </button>

              {/* (opcional) permitir URL manual */}
              <input
                id="cover"
                name="cover"
                className="input flex-1 min-w-[240px]"
                placeholder="o pegá una URL https://…"
                value={form.cover}
                onChange={onChange}
              />
            </div>

            {/* input file oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />

            {uploadErr && <div className="text-sm text-red-600">{uploadErr}</div>}

            {form.cover && (
              <div className="mt-3 rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white/60">
                <img src={form.cover} alt="cover preview" className="w-full max-h-64 object-cover"/>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500">
            * La meta de recaudación no puede modificarse desde esta pantalla.
          </div>

          <div className="pt-2 flex gap-3">
            <Link to="/mis-proyectos" className="btn btn-outline">Cancelar</Link>
            <button
              className="btn btn-primary"
              disabled={saving || uploading}
              title={uploading ? 'Esperá a que termine la subida' : 'Guardar cambios'}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>

          {ok && <div className="text-emerald-600 text-sm">¡Guardado!</div>}
        </form>
      </div>
    </section>
  )
}
