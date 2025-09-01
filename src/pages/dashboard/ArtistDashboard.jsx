// src/pages/dashboard/ArtistDashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  createArtwork,
  updateArtwork,
  getArtworkById,
} from '../../services/mockArtworks.js'

export default function ArtistDashboard() {
  const user = useSelector((s) => s.auth.user)
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit') // si existe, estamos en modo edición
  const navigate = useNavigate()

  // --------- estado del formulario ---------
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(2500)
  const [fractionFrom, setFractionFrom] = useState(30)
  const [fractionsTotal, setFractionsTotal] = useState(100)
  const [gallery, setGallery] = useState(['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop'])
  const [tags, setTags] = useState(new Set(['Mixta']))

  const [loading, setLoading] = useState(!!editId)
  const [saving, setSaving] = useState(false)

  // imagen principal = primer elemento de la galería
  const mainImage = useMemo(() => gallery[0], [gallery])

  // cargar datos si estamos editando
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!editId) return
      setLoading(true)
      try {
        const it = await getArtworkById(editId)
        if (!alive) return
        setTitle(it.title || '')
        setDescription(it.description || '')
        setPrice(it.price || 0)
        setFractionFrom(it.fractionFrom || 0)
        setFractionsTotal(it.fractionsTotal || 0)
        setGallery(Array.isArray(it.gallery) && it.gallery.length ? it.gallery : [it.image])
        setTags(new Set(it.tags || []))
      } catch (e) {
        // si no existe, volvé a crear
        navigate('/publicar', { replace: true })
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [editId, navigate])

  // helpers de galería
  const addImageField = () => {
    if (gallery.length >= 5) return
    setGallery((g) => [...g, ''])
  }
  const updateImageAt = (idx, val) => {
    setGallery((g) => g.map((u, i) => (i === idx ? val : u)))
  }
  const removeImageAt = (idx) => {
    setGallery((g) => {
      const next = g.filter((_, i) => i !== idx)
      // nunca dejes la galería vacía
      return next.length ? next : [uFallback(0)]
    })
  }
  const setAsMain = (idx) => {
    setGallery((g) => {
      const copy = [...g]
      const [img] = copy.splice(idx, 1)
      copy.unshift(img)
      return copy
    })
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
    setSaving(true)

    const payload = {
      title: title?.trim() || 'Obra sin título',
      description: description?.trim() || '',
      artist: user?.name || 'Artista Demo',
      price: Number(price) || 0,
      fractionFrom: Number(fractionFrom) || 0,
      fractionsTotal: Number(fractionsTotal) || 0,
      image: (gallery.find((u) => !!u) || '').trim(),
      tags: Array.from(tags),
      gallery: gallery.filter(Boolean).slice(0, 5),
    }

    try {
      if (editId) {
        await updateArtwork(editId, payload)
        // nos quedamos en la misma página
      } else {
        const created = await createArtwork(payload)
        // redirigimos a edición para habilitar “Ver obra”
        navigate(`/publicar?edit=${created.id}`, { replace: true })
      }
    } finally {
      setSaving(false)
    }
  }

  const btnLabel = editId ? 'Actualizar' : 'Publicar'

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div className="flex items-end justify-between gap-6">
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
      </div>

      <div className="section-frame pb-16">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* -------- vista previa -------- */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
            <img
              src={mainImage}
              alt={title || 'Obra'}
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="p-6">
              <div className="font-bold">{title || 'Título de la obra'}</div>
              <div className="text-sm text-slate-600">{user?.name || 'Artista Demo'}</div>

              <div className="mt-3 text-sm">
                <div className="text-slate-500">Precio de referencia</div>
                <div className="font-semibold">${Number(price || 0).toLocaleString('es-AR')}</div>
              </div>

              {/* sin rating en la preview de publicación */}
              <div className="mt-4">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                  {Array.from(tags).join(' • ') || 'Mixta'}
                </span>
              </div>

              <div className="mt-4">
                {editId ? (
                  <Link to={`/obra/${editId}`} className="btn btn-primary w-full">
                    Ver obra
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Publicá/guardá la obra para generar su URL"
                    className="btn btn-primary w-full opacity-60 cursor-not-allowed"
                  >
                    Ver obra
                  </button>
                )}
              </div>

              {/* miniaturas para elegir principal */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {gallery.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAsMain(i)}
                    className={`h-16 w-24 overflow-hidden rounded-xl border ${
                      i === 0 ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                    }`}
                    title={i === 0 ? 'Imagen principal' : 'Marcar como principal'}
                  >
                    {u ? (
                      <img src={u} alt={`img-${i}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-slate-400 text-xs">
                        (vacío)
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* -------- formulario -------- */}
          <form onSubmit={onSubmit} className="card-surface p-6 sm:p-8">
            {loading ? (
              <div className="text-slate-500">Cargando…</div>
            ) : (
              <>
                {/* título y descripción */}
                <div>
                  <label className="form-label" htmlFor="title">Título</label>
                  <input
                    id="title"
                    className="input"
                    placeholder="Ej. Ciudad nocturna"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="mt-4">
                  <label className="form-label" htmlFor="desc">Descripción</label>
                  <textarea
                    id="desc"
                    className="input h-32"
                    placeholder="Breve reseña de la obra"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* fila de 3 inputs alineados */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Precio</label>
                    <input
                      type="number"
                      className="input"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="form-label">Fracciones desde</label>
                    <input
                      type="number"
                      className="input"
                      value={fractionFrom}
                      onChange={(e) => setFractionFrom(e.target.value)}
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="form-label"># de fracciones</label>
                    <input
                      type="number"
                      className="input"
                      value={fractionsTotal}
                      onChange={(e) => setFractionsTotal(e.target.value)}
                      min={1}
                    />
                  </div>
                </div>

                {/* imágenes */}
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <label className="form-label">Imágenes de la obra (hasta 5)</label>
                    <button
                      type="button"
                      onClick={addImageField}
                      className={`text-indigo-600 hover:underline ${gallery.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={gallery.length >= 5}
                    >
                      + Agregar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {gallery.map((u, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          className="input flex-1"
                          placeholder="URL de imagen"
                          value={u}
                          onChange={(e) => updateImageAt(i, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeImageAt(i)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* tags */}
                <div className="mt-5">
                  <label className="form-label">Tags / categorías</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Abstracto','Mixta','Paisaje','Urbano','Naturaleza',
                      'Geométrico','Impresionismo','Minimal','Tinta','Óleo','Acrílico',
                    ].map((t) => {
                      const active = tags.has(t)
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTag(t)}
                          className={`px-3 py-1.5 rounded-full border text-sm ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    className="btn btn-primary w-full disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? 'Guardando…' : btnLabel}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

/* util de fallback local */
function uFallback(idx = 0) {
  const pool = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465311440653-ba9b1d9b0f5b?q=80&w=1600&auto=format&fit=crop',
  ]
  return pool[idx % pool.length]
}
