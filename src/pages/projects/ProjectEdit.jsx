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

  // Subida (paso 1: /api/upload/)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileInputRef = useRef(null)

  // Solo campos editables: título, descripción, imagen (cover)
  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: '',   // acá guardamos la URL que devuelva /api/upload/
  })

  // Cargar: API real primero, mock como fallback. NO redirige en error.
  useEffect(()=>{
    let alive = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        // GET detalle (mantenemos el endpoint existente del proyecto)
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

  // ---------- SUBIDA: /api/upload/ (recibe un archivo y responde con la URL de Cloudinary) ----------
  const onPickFile = () => {
    setUploadErr('')
    fileInputRef.current?.click()
  }

  const onFileChange = async (e) => {
    const file = e.target.files?.[0]
    // limpiar para poder re-seleccionar el mismo archivo si hace falta
    e.target.value = ''
    setUploadErr('')

    if (!file) return
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

    const formData = new FormData()
    formData.append('file', file)

    try {
      setUploading(true)
      // usamos URL absoluta para respetar exactamente /api/upload/ en :80
      const res = await authService.client.post('http://localhost:80/api/upload/', formData, {
        // No seteamos Content-Type manualmente; el navegador lo hace con el boundary correcto
      })
      // se asume que el backend responde con { url: "https://res.cloudinary.com/..." } o similar
      const url = res?.data?.url || res?.data?.secure_url || res?.data?.image || ''
      if (!url) throw new Error('La respuesta del servidor no incluyó la URL de la imagen.')
      setForm(f => ({ ...f, cover: url }))
    } catch (eUp) {
      const msg =
        eUp?.response?.data?.detail ||
        eUp?.response?.data?.message ||
        eUp?.message ||
        'No se pudo subir la imagen.'
      setUploadErr(msg)
    } finally {
      setUploading(false)
    }
  }
  // --------------------------------------------------------------------------------------------------

  // Guardar cambios (paso 2: PATCH /api/projects/<id>/ con title, description, image)
  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    setSaving(true)
    try{
      // Usamos la URL absoluta pedida para actualizar el proyecto
      const payload = {
        title: form.title?.trim(),
        description: form.description?.trim(),
        image: form.cover?.trim(), // importante: la URL recibida de /api/upload/
      }
      await authService.client.patch(`http://localhost:80/api/projects/${id}/`, payload)
      setOk(true)
      setTimeout(()=> navigate('/mis-proyectos', { replace:true }), 1000)
    }catch(eApi){
      // Fallback a mock en dev (si no está la API real)
      try{
        await mockUpdateProject(id, {
          title: form.title?.trim(),
          description: form.description?.trim(),
          cover: form.cover?.trim(),
        })
        setOk(true)
        setTimeout(()=> navigate('/mis-proyectos', { replace:true }), 1000)
      }catch{
        const msg =
          eApi?.response?.data?.detail ||
          eApi?.response?.data?.message ||
          eApi?.message ||
          'No se pudo guardar'
        setError(msg)
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

          {/* Imagen: flujo obligatorio por botón + /api/upload/ (sin input de URL) */}
          <div className="space-y-2">
            <label className="form-label">Imagen del proyecto</label>

            <button
              type="button"
              className="btn btn-outline"
              onClick={onPickFile}
              disabled={uploading}
              title="Subir imagen desde tu equipo"
            >
              {uploading ? 'Subiendo…' : 'Subir nueva imagen'}
            </button>

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
