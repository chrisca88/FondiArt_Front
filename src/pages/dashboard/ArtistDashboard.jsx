// src/pages/dashboard/ArtistDashboard.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getArtworkById } from '../../services/mockArtworks.js' // Mantenemos para la edición
import authService from '../../services/authService.js'

export default function ArtistDashboard() {
  const user = useSelector((s) => s.auth.user)
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const navigate = useNavigate()

  // --------- estado del formulario ---------
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [directSale, setDirectSale] = useState(true) // Venta directa por defecto
  const [price, setPrice] = useState('') // Renombrado para claridad

  // galería e imágenes
  const [gallery, setGallery] = useState([''])
  const [selectedIdx, setSelectedIdx] = useState(0)

  const [tags, setTags] = useState(new Set(['Mixta']))

  const [loading, setLoading] = useState(!!editId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // modal de éxito
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // subida
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [imgErr, setImgErr] = useState('')

  // imagen principal = primer elemento de la galería
  const mainImage = useMemo(() => gallery.find(Boolean) || uFallback(0), [gallery])

  // cargar datos si estamos editando (lógica mock mantenida por ahora)
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!editId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const it = await getArtworkById(editId)
        if (!alive) return
        setTitle(it.title || '')
        setDescription(it.description || '')
        setDirectSale(!!it.directSale)
        setPrice(it.directPrice ? String(it.directPrice) : '')
        setGallery(Array.isArray(it.gallery) && it.gallery.length ? it.gallery : [it.image])
        setTags(new Set(it.tags || []))
      } catch (e) {
        navigate('/publicar', { replace: true })
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [editId, navigate])

  // helpers de galería
  const addImageSlot = () => {
    if (gallery.length >= 5) return
    setGallery((g) => [...g, ''])
    setSelectedIdx(gallery.length)
  }
  const updateImageAt = (idx, val) => {
    setGallery((g) => g.map((u, i) => (i === idx ? val : u)))
  }
  const removeImageAt = (idx) => {
    setGallery((g) => {
      const next = g.filter((_, i) => i !== idx)
      const safe = next.length ? next : ['']
      setSelectedIdx(Math.max(0, Math.min(selectedIdx, safe.length - 1)))
      return safe
    })
  }
  const setAsMain = (idx) => {
    setSelectedIdx(0)
    setGallery((g) => {
      const copy = [...g]
      const [img] = copy.splice(idx, 1)
      copy.unshift(img)
      return copy
    })
  }

  const pickImage = () => fileRef.current?.click()
  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImgErr('')
    setUploading(true)
    setUploadPct(0)
    try {
      const { url } = await authService.uploadImage(file, { folder: 'artworks' }, setUploadPct)
      if (!url) throw new Error('Respuesta sin URL')
      updateImageAt(selectedIdx, url)
    } catch (err) {
      setImgErr(err?.response?.data?.message || err.message || 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const toggleTag = (t) => {
    const copy = new Set(tags)
    if (copy.has(t)) copy.delete(t)
    else copy.add(t)
    setTags(copy)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError('')

    const finalGallery = gallery.map(g => g.trim()).filter(Boolean)
    if (!finalGallery.length || !finalGallery[0]) {
      setError('Debes incluir al menos una imagen principal.')
      return
    }

    setSaving(true)

    const payload = {
      title: title.trim(),
      description: description.trim(),
      price_reference: parseFloat(price) || 0,
      image: finalGallery[0], // La primera imagen es la principal
      gallery: finalGallery.slice(1), // El resto va a la galería
      tags: Array.from(tags),
      venta_directa: directSale,
      estado_venta: 'publicada' // Como se indica en la API
    }

    // --- LOG DE DEPURACIÓN ---
    console.log('Enviando payload a /artworks/create/:', payload)

    try {
      // Por ahora, solo manejamos la creación. La edición requeriría un endpoint PUT/PATCH.
      if (editId) {
        // Lógica de actualización (cuando el endpoint esté disponible)
        // await authService.client.put(`/artworks/update/${editId}/`, payload)
        // setSuccessMsg('¡La obra se actualizó correctamente!')
        console.warn('La funcionalidad de editar aún no está conectada a la API.')
        setError('La funcionalidad de editar no está implementada con la API.')
        setSaving(false)
        return
      }

      // Llamada a la API para crear
      await authService.client.post('/artworks/create/', payload)

      setSuccessMsg('¡Obra publicada con éxito!')
      setSuccessOpen(true)
      // No navegamos inmediatamente para que el usuario vea el modal
    } catch (err) {
      // --- LOG DE DEPURACIÓN MEJORADO ---
      console.error('--- DETALLE DEL ERROR DE PUBLICACIÓN ---')
      console.error('Mensaje:', err.message)
      if (err.response) {
        console.error('Respuesta (data):', err.response.data)
        console.error('Respuesta (status):', err.response.status)
      } else if (err.request) {
        console.error('Petición enviada (sin respuesta):', err.request)
      }
      console.error('Configuración de Axios:', err.config)
      console.error('--- FIN DEL DETALLE DEL ERROR ---')

      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Error al crear la obra.'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const btnLabel = editId ? 'Actualizar Obra' : 'Publicar Obra'

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div>
            <p className="eyebrow">Panel de artista</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {editId ? 'Editar obra' : 'Publicar una obra'}
            </h1>
            <p className="lead mt-2 max-w-2xl">
              Completá la información y previsualizá cómo se verá en el marketplace.
            </p>
          </div>
        </div>
      </div>

      <div className="section-frame pb-16">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* -------- PREVIEW -------- */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 sticky top-24">
            <div className="relative">
              <img src={mainImage} alt={title || 'Obra'} className="aspect-[16/10] w-full object-cover bg-slate-100" />
              {directSale && <span className="absolute left-4 top-4 rounded-full bg-emerald-600 text-white text-xs px-3 py-1 shadow">Venta directa</span>}
            </div>
            <div className="p-6">
              <div className="font-bold">{title || 'Título de la obra'}</div>
              <div className="text-sm text-slate-600">{user?.name || 'Artista Demo'}</div>
              {directSale && (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Precio</div>
                  <div className="text-xl font-extrabold">${fmt(price)}</div>
                </div>
              )}
              <div className="mt-4">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                  {Array.from(tags).join(' • ') || 'Sin tags'}
                </span>
              </div>
              <div className="mt-4">
                <button type="button" disabled className="btn btn-primary w-full opacity-60 cursor-not-allowed">Ver obra (al publicar)</button>
              </div>
            </div>
          </div>

          {/* -------- FORMULARIO -------- */}
          <form onSubmit={onSubmit} className="card-surface p-6 sm:p-8">
            {loading ? <div className="text-slate-500">Cargando…</div> : (
              <>
                <div>
                  <label className="form-label" htmlFor="title">Título</label>
                  <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div className="mt-4">
                  <label className="form-label" htmlFor="desc">Descripción</label>
                  <textarea id="desc" className="input h-32" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>

                <div className="mt-5">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={directSale} onChange={(e) => setDirectSale(e.target.checked)} />
                    <span className="text-slate-800 font-medium">Venta directa</span>
                  </label>
                  {directSale && (
                    <div className="mt-3">
                      <label className="form-label" htmlFor="price">Precio de Referencia (ARS)</label>
                      <input id="price" type="number" min={0} className="input w-56" placeholder="Ej. 1500.50" value={price} onChange={(e) => setPrice(e.target.value)} required />
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <label className="form-label">Imágenes (hasta 5)</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={addImageSlot} className="text-sm text-indigo-600 hover:underline disabled:opacity-50" disabled={gallery.length >= 5}>+ Agregar</button>
                      <button type="button" onClick={pickImage} className="btn btn-outline btn-sm">{uploading ? `Subiendo… ${uploadPct}%` : 'Subir'}</button>
                      <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={onPickFile} />
                    </div>
                  </div>
                  {imgErr && <p className="text-sm text-red-600 mt-2">{imgErr}</p>}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((u, i) => (
                      <div key={i} className={`rounded-xl overflow-hidden ring-1 ${selectedIdx === i ? 'ring-indigo-400' : 'ring-slate-200'}`}>
                        <div className="aspect-[4/3] w-full cursor-pointer bg-slate-50" onClick={() => setSelectedIdx(i)}>
                          {u ? <img src={u} alt={`g-${i}`} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-slate-400 text-xs">(vacío)</div>}
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 text-xs bg-white">
                          <button type="button" onClick={() => setAsMain(i)} className="hover:underline disabled:opacity-50" disabled={i===0}>Principal</button>
                          <button type="button" onClick={() => removeImageAt(i)} className="text-red-600 hover:underline">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="form-label">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {['Abstracto', 'Mixta', 'Paisaje', 'Urbano', 'Naturaleza', 'Geométrico', 'Impresionismo', 'Minimal', 'Tinta', 'Óleo', 'Acrílico'].map((t) => (
                      <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-full border text-sm ${tags.has(t) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>{t}</button>
                    ))}
                  </div>
                </div>

                {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

                <div className="mt-6">
                  <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? 'Guardando…' : btnLabel}</button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {successOpen && <SuccessModal message={successMsg} onClose={() => { setSuccessOpen(false); navigate('/mis-obras', { replace: true }) }} />}
    </section>
  )
}

function SuccessModal({ message, onClose }){
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-lg font-bold">¡Listo!</h3>
        <p className="mt-1 text-slate-700">{message}</p>
        <button onClick={onClose} className="btn btn-primary mt-5 w-full">Ir a mis obras</button>
      </div>
    </div>
  )
}

function uFallback(idx = 0) {
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop&ixid=${idx}`
}
function fmt(n){ const v = Number(n||0); return v ? v.toLocaleString('es-AR') : '0' }