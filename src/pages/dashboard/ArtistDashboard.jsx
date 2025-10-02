// src/pages/dashboard/ArtistDashboard.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  createArtwork,
  updateArtwork,
  getArtworkById,
} from '../../services/mockArtworks.js'
import authService from '../../services/authService.js'

export default function ArtistDashboard() {
  const user = useSelector((s) => s.auth.user)
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const navigate = useNavigate()

  // --------- estado del formulario ---------
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // valores internos para tokenización (no visibles)
  const [fractionFrom, setFractionFrom] = useState(30)
  const [fractionsTotal, setFractionsTotal] = useState(100)

  // NUEVO: venta directa
  const [directSale, setDirectSale] = useState(false)
  const [directPrice, setDirectPrice] = useState('')

  // galería e imágenes
  const [gallery, setGallery] = useState([
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
  ])
  const [selectedIdx, setSelectedIdx] = useState(0) // índice de miniatura seleccionada

  const [tags, setTags] = useState(new Set(['Mixta']))

  const [loading, setLoading] = useState(!!editId)
  const [saving, setSaving] = useState(false)

  // modal de éxito
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // subida
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [imgErr, setImgErr] = useState('')

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
        setFractionFrom(it.fractionFrom ?? 30)
        setFractionsTotal(it.fractionsTotal ?? 100)
        setDirectSale(!!it.directSale)
        setDirectPrice(it.directPrice ? String(it.directPrice) : '')
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
  const ensureAtLeastOne = (arr) => (arr.length ? arr : [uFallback(0)])
  const addImageSlot = () => {
    if (gallery.length >= 5) return
    setGallery((g) => [...g, ''])
    setSelectedIdx(gallery.length) // selecciono el nuevo slot
  }
  const updateImageAt = (idx, val) => {
    setGallery((g) => g.map((u, i) => (i === idx ? val : u)))
  }
  const removeImageAt = (idx) => {
    setGallery((g) => {
      const next = g.filter((_, i) => i !== idx)
      const safe = ensureAtLeastOne(next)
      // reacomodo selección
      const newSel = Math.max(0, Math.min(selectedIdx, safe.length - 1))
      setSelectedIdx(newSel)
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
    e.target.value = '' // reset
    if (!file) return
    setImgErr('')
    setUploading(true)
    setUploadPct(0)
    try {
      const { url } = await authService.uploadImage(
        file,
        { folder: 'artworks' },
        (pct) => setUploadPct(pct)
      )
      if (!url) throw new Error('Respuesta sin URL')
      updateImageAt(selectedIdx, url)
      // si subimos para el idx 0 o si estaba vacío, refresco principal
      if (selectedIdx === 0) setAsMain(0)
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
    if (directSale && !Number(directPrice)) {
      alert('Ingresá un precio válido para la venta directa.')
      return
    }
    setSaving(true)

    // payload
    const payload = {
      title: title?.trim() || 'Obra sin título',
      description: description?.trim() || '',
      artist: user?.name || 'Artista Demo',
      // si es venta directa, las fracciones quedan en 0
      fractionFrom: directSale ? 0 : Number(fractionFrom) || 0,
      fractionsTotal: directSale ? 0 : Number(fractionsTotal) || 0,
      image: (gallery.find((u) => !!u) || '').trim(),
      tags: Array.from(tags),
      gallery: gallery.filter(Boolean).slice(0, 5),
      // NUEVO
      directSale: !!directSale,
      directPrice: Number(directPrice) || 0,
    }

    try {
      if (editId) {
        await updateArtwork(editId, payload)
        setSuccessMsg('¡La obra se actualizó correctamente!')
        setSuccessOpen(true)
        setTimeout(() => navigate('/mis-obras', { replace: true }), 1300)
      } else {
        await createArtwork(payload)
        setSuccessMsg(
          directSale
            ? '¡Publicada! La venta directa ya está disponible en el marketplace.'
            : '¡Publicación enviada! Queda pendiente de aprobación.'
        )
        setSuccessOpen(true)
        setTimeout(() => navigate('/mis-obras', { replace: true }), 1300)
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
            <div className="relative">
              <img
                src={mainImage}
                alt={title || 'Obra'}
                className="aspect-[16/10] w-full object-cover"
              />
              {/* Distintivo en preview */}
              {directSale && (
                <span className="absolute left-4 top-4 rounded-full bg-emerald-600 text-white text-xs px-3 py-1 shadow">
                  Venta directa
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="font-bold">{title || 'Título de la obra'}</div>
              <div className="text-sm text-slate-600">{user?.name || 'Artista Demo'}</div>

              {/* Precio si es venta directa */}
              {directSale && (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Precio</div>
                  <div className="text-xl font-extrabold">${fmt(directPrice)}</div>
                </div>
              )}

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

              {/* miniaturas: elegir principal y seleccionar para reemplazar */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {gallery.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`h-16 w-24 overflow-hidden rounded-xl border ${
                      i === 0 ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                    } ${selectedIdx === i ? 'outline outline-2 outline-indigo-300' : ''}`}
                    title={
                      i === 0
                        ? 'Imagen principal (clic para seleccionar)'
                        : 'Seleccionar para reemplazar'
                    }
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

                {/* Venta directa */}
                <div className="mt-5">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={directSale}
                      onChange={(e) => setDirectSale(e.target.checked)}
                    />
                    <span className="text-slate-800 font-medium">Venta directa</span>
                  </label>

                  {directSale && (
                    <div className="mt-3">
                      <label className="form-label" htmlFor="price">Precio (ARS)</label>
                      <input
                        id="price"
                        type="number"
                        min={0}
                        className="input w-56"
                        placeholder="Ej. 150000"
                        value={directPrice}
                        onChange={(e) => setDirectPrice(e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Si está activado, la obra se publicará inmediatamente en el marketplace.
                      </p>
                    </div>
                  )}
                </div>

                {/* Imágenes: botón para subir/ reemplazar (URLs ocultas) */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <label className="form-label">Imágenes de la obra (hasta 5)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addImageSlot}
                        className={`text-indigo-600 hover:underline ${gallery.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={gallery.length >= 5}
                        title="Agregar un espacio para nueva imagen"
                      >
                        + Agregar
                      </button>
                      <button
                        type="button"
                        onClick={pickImage}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                        title="Subir/Reemplazar imagen seleccionada"
                      >
                        {uploading ? `Subiendo… ${uploadPct}%` : 'Subir / Reemplazar'}
                      </button>
                      <input
                        type="file"
                        ref={fileRef}
                        accept="image/*"
                        className="hidden"
                        onChange={onPickFile}
                      />
                    </div>
                  </div>

                  {!!imgErr && <p className="text-sm text-red-600 mt-2">{imgErr}</p>}

                  {/* lista editable de miniaturas con acciones simples */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map((u, i) => (
                      <div key={i} className={`rounded-xl overflow-hidden ring-1 ${selectedIdx===i?'ring-indigo-300':'ring-slate-200'}`}>
                        <div
                          className="aspect-[4/3] w-full cursor-pointer"
                          onClick={() => setSelectedIdx(i)}
                          title="Seleccionar"
                        >
                          {u ? (
                            <img src={u} alt={`g-${i}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-slate-400 text-xs bg-slate-50">
                              (vacío)
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 text-xs bg-white">
                          <button type="button" onClick={() => setAsMain(i)} className="hover:underline">Principal</button>
                          <button type="button" onClick={() => removeImageAt(i)} className="text-red-600 hover:underline">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* tags */}
                <div className="mt-6">
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

      {/* MODAL de éxito */}
      {successOpen && (
        <SuccessModal
          message={successMsg}
          onClose={() => { setSuccessOpen(false); navigate('/mis-obras', { replace: true }) }}
        />
      )}
    </section>
  )
}

/* ----- Modal simple de éxito ----- */
function SuccessModal({ message, onClose }){
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold">¡Listo!</h3>
        <p className="mt-1 text-slate-700">{message || 'Operación realizada correctamente.'}</p>
        <button onClick={onClose} className="btn btn-primary mt-5 w-full">Ir a mis obras</button>
      </div>
    </div>
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
function fmt(n){ const v = Number(n||0); return v ? v.toLocaleString('es-AR') : '0' }
