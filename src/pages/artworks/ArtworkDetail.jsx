// src/pages/artworks/ArtworkDetail.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import authService from '../../services/authService.js'

// =========================
// Helpers de normalización
// =========================
const coalesce = (obj, keys = []) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null) return v
  }
  return undefined
}
const toNum = (v, def = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
const toBool = (v) => {
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0' || v === 'false') return false
  return Boolean(v)
}

const slugify = (s = '') =>
  String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const fixImageUrl = (url) => {
  if (typeof url !== 'string') return url
  const marker = 'https%3A/'
  const idx = url.indexOf(marker)
  if (idx !== -1) return 'https://' + url.substring(idx + marker.length)
  return url
}

// 👉 formato dd-mm-aaaa
const formatDateDMY = (iso) => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}-${mm}-${yyyy}`
    }
  } catch {}
  const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return String(iso)
}

// --- cache local del "my rating" ---
const myRatingKey = (uid, artId) => `my_rating_${uid || 'anon'}_${artId}`
const saveMyRating = (uid, artId, value) => {
  try { localStorage.setItem(myRatingKey(uid, artId), String(value)) } catch {}
}
const getMyRating = (uid, artId) => {
  try {
    const v = Number(localStorage.getItem(myRatingKey(uid, artId)))
    return Number.isFinite(v) && v >= 1 && v <= 5 ? v : 0
  } catch { return 0 }
}

// ¿Es venta directa? Si no hay fracciones (en ambos formatos) lo consideramos directa
const detectDirect = (a) => {
  const vdRaw = coalesce(a, ['venta_directa', 'ventaDirecta', 'directSale'])
  if (vdRaw !== undefined) {
    const vd = toBool(vdRaw)
    if (vd) return true
  }
  const hasFractionFrom = coalesce(a, ['fractionFrom', 'fraction_from']) !== undefined
  const hasTotals      = coalesce(a, ['fractionsTotal', 'fractions_total']) !== undefined
  return !(hasFractionFrom || hasTotals)
}

export default function ArtworkDetail(){
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector(s => s.auth.user)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [idx, setIdx] = useState(0) // imagen seleccionada

  // rating
  const [rating, setRating] = useState({ avg: 0, count: 0, my: 0 })
  const [rateSaving, setRateSaving] = useState(false)
  const [rateErr, setRateErr] = useState('')
  const canRate = !!user
  const canBuy  = !!user

  // --- compra (modal)
  const [buyOpen, setBuyOpen] = useState(false)
  const [qty, setQty] = useState(1)          // solo para tokenizadas
  const [buying, setBuying] = useState(false)
  const [buyErr, setBuyErr] = useState('')
  const [buyOk, setBuyOk] = useState(false)

  useEffect(()=>{ setQty(1); setBuyErr(''); setBuyOk(false) }, [buyOpen])

  // ✅ Normalizador único del detalle (para load y refresh post-compra)
  const mapArtwork = (raw) => {
    const isDirect = detectDirect(raw)

    const rawImage = coalesce(raw, ['image'])
    const rawGallery = coalesce(raw, ['gallery'])
    const gallery = Array.isArray(rawGallery) && rawGallery.length
      ? rawGallery.map(fixImageUrl)
      : [fixImageUrl(rawImage)].filter(Boolean)

    // ARTISTA: string u objeto
    let artistName = ''
    const artistVal = coalesce(raw, ['artist', 'artist_name', 'artistName', 'author', 'author_name'])
    if (typeof artistVal === 'string') {
      artistName = artistVal
    } else if (artistVal && typeof artistVal === 'object') {
      artistName =
        artistVal.name ||
        [artistVal.first_name || artistVal.firstName, artistVal.last_name || artistVal.lastName]
          .filter(Boolean).join(' ') ||
        artistVal.username ||
        artistVal.alias ||
        ''
    } else {
      artistName = ''
    }
    artistName = String(artistName).trim()

    return {
      id: coalesce(raw, ['id', 'artwork_id', 'artworkId']),
      title: coalesce(raw, ['title', 'titulo']) ?? '',
      artist: artistName,
      image: fixImageUrl(rawImage),
      gallery,
      description: coalesce(raw, ['description', 'descripcion']) ?? '',
      tags: Array.isArray(raw.tags) ? raw.tags : (raw.tags ? [String(raw.tags)] : []),
      price: toNum(coalesce(raw, ['price', 'precio']), 0),

      fractionFrom: toNum(coalesce(raw, ['fractionFrom', 'fraction_from']), 0),
      fractionsTotal: isDirect ? 1 : toNum(coalesce(raw, ['fractionsTotal', 'fractions_total']), 0),

      fractionsLeft: isDirect
        ? 1
        : (() => {
            const left = coalesce(raw, ['fractionsLeft', 'fractions_left', 'availableFractions', 'available_fractions'])
            if (left !== undefined) return toNum(left, 0)
            const tot = coalesce(raw, ['fractionsTotal', 'fractions_total'])
            return toNum(tot, 0)
          })(),

      createdAt: coalesce(raw, ['createdAt', 'created_at', 'created']),
      status: String(coalesce(raw, ['status']) || '').toLowerCase(),
      estado_venta: String(coalesce(raw, ['estado_venta', 'estadoVenta']) || '').toLowerCase(),
      directSale: isDirect,
    }
  }

  const logFractions = (label, raw) => {
    try {
      console.log(`[ArtworkDetail] ${label} - RAW:`, raw)

      const snapshot = {
        id: coalesce(raw, ['id', 'artwork_id', 'artworkId']),
        status: coalesce(raw, ['status']),
        estado_venta: coalesce(raw, ['estado_venta', 'estadoVenta']),
        venta_directa: coalesce(raw, ['venta_directa', 'ventaDirecta', 'directSale']),

        fractionsLeft: coalesce(raw, ['fractionsLeft']),
        fractions_left: coalesce(raw, ['fractions_left']),
        availableFractions: coalesce(raw, ['availableFractions']),
        available_fractions: coalesce(raw, ['available_fractions']),

        fractionsTotal: coalesce(raw, ['fractionsTotal']),
        fractions_total: coalesce(raw, ['fractions_total']),

        fractionFrom: coalesce(raw, ['fractionFrom', 'fraction_from']),
      }

      console.table(snapshot)
    } catch {
      console.log(`[ArtworkDetail] ${label} - RAW (fallback):`, raw)
    }
  }

  // ✅ Refresco real del detalle (para que % vendido + disponibles se actualicen siempre)
  const refreshArtwork = async () => {
    const { data: fresh } = await authService.client.get(`/artworks/${id}/`)
    logFractions('REFRESH after buy', fresh)

    const next = mapArtwork(fresh)
    console.log('[ArtworkDetail] MAPPED after buy:', next)

    setData(next)

    if (!next.directSale) {
      setQty(q => Math.min(Math.max(1, Number(q || 1)), Math.max(1, Number(next.fractionsLeft || 1))))
    }
    return next
  }

  // cargar detalle + rating
  useEffect(()=>{
    let alive = true
    setLoading(true)
    setErr(null)

    const fetchAll = async () => {
      try{
        const { data: raw } = await authService.client.get(`/artworks/${id}/`)
        if (!alive) return

        const mapped = mapArtwork(raw)
        setData(mapped)

        try {
          const { data: r } = await authService.client.get(`/artworks/${id}/rating/`)
          const serverMy = Number(r?.my || 0)
          const cachedMy = user?.id ? getMyRating(user.id, mapped.id) : 0
          const my = serverMy || cachedMy || 0
          setRating({ avg: Number(r?.avg || 0), count: Number(r?.count || 0), my })
        } catch {
          const cachedMy = user?.id ? getMyRating(user.id, mapped.id) : 0
          setRating(prev => ({ ...prev, my: cachedMy }))
        }

      } catch(e){
        setErr(e?.response?.data?.detail || e?.message || 'No se pudo cargar la obra')
      } finally {
        if (alive) setLoading(false)
      }
    }

    fetchAll()
    return ()=>{ alive = false }
  }, [id, user?.id])

  const isDirect = !!data?.directSale
  const isAuctioned = data?.status === 'auctioned'
  const isSold = data?.status === 'sold' || data?.estado_venta === 'vendida'

  const soldPct = useMemo(()=>{
    if(!data || isDirect) return 0
    const tot = toNum(data.fractionsTotal, 0)
    if (!tot) return 0
    return Math.round(100 - (toNum(data.fractionsLeft, 0) / tot) * 100)
  }, [data, isDirect])

  const unit = useMemo(()=>{
    if (!data) return 0
    return Number(isDirect ? data.price : data.fractionFrom) || 0
  }, [data, isDirect])

  const total = useMemo(()=>{
    if (isDirect) return unit
    return Math.round(unit * Number(qty || 0) * 100) / 100
  }, [unit, qty, isDirect])

  if (loading) return <section className="section-frame py-16"><Skeleton/></section>
  if (err) return (
    <section className="section-frame py-16">
      <div className="card-surface p-8 text-center">
        <h3 className="text-xl font-bold">Error</h3>
        <p className="text-slate-600 mt-1">{err}</p>
        <div className="mt-4"><Link to="/comprar" className="btn btn-primary">Volver al marketplace</Link></div>
      </div>
    </section>
  )
  if (!data) return null

  const artistSlug = slugify(data.artist || '')

  const handleRate = async (value) => {
    if (!canRate || !data?.id) return
    setRateErr('')
    setRateSaving(true)
    try{
      const res = await authService.client.post(`/artworks/${data.id}/rate/`, { value })
      const r = res?.data || {}
      const my = Number(r.my || value || 0)

      if (user?.id && my) saveMyRating(user.id, data.id, my)

      setRating({
        avg: Number(r.avg || 0),
        count: Number(r.count || 0),
        my
      })
    } catch(e){
      setRateErr(e?.response?.data?.error || e?.message || 'No se pudo registrar tu valoración.')
    } finally {
      setRateSaving(false)
    }
  }

  // ✅ compra: TOKENIZADA => /finance/tokens/buy/ | DIRECTA => /artworks/:id/purchase/
  const handleBuy = async () => {
    setBuying(true); setBuyErr('')

    if (data?.estado_venta === 'vendida' || data?.status === 'sold') {
      setBuyErr('La obra ya está vendida.')
      setBuying(false)
      return
    }

    try {
      // Pre-check
      const { data: fresh } = await authService.client.get(`/artworks/${data.id}/`)
      logFractions('PRE buy check', fresh)

      const directFresh = detectDirect(fresh)
      const estadoFresh = String(coalesce(fresh, ['estado_venta', 'estadoVenta']) || '').toLowerCase()
      const ventaDirectaFlag = toBool(coalesce(fresh, ['venta_directa', 'ventaDirecta', 'directSale']))

      if (estadoFresh === 'vendida' || String(coalesce(fresh, ['status'])||'').toLowerCase()==='sold') {
        throw new Error('La obra ya está vendida.')
      }

      if (!directFresh) {
        // ===== TOKENIZADA =====
        const frTotal = toNum(coalesce(fresh, ['fractionsTotal', 'fractions_total']), 0)
        const frLeft = (() => {
          const left = coalesce(fresh, ['fractionsLeft', 'fractions_left', 'availableFractions', 'available_fractions'])
          if (left !== undefined) return toNum(left, 0)
          return frTotal
        })()

        const desired = Math.floor(Number(qty || 1))
        if (!frTotal) throw new Error('La obra no tiene fracciones configuradas.')
        if (desired < 1) throw new Error('Cantidad inválida.')
        if (desired > frLeft) throw new Error(`Solo quedan ${frLeft} fracciones.`)

        const payload = { artwork_id: data.id, quantity: desired }
        await authService.client.post('/finance/tokens/buy/', payload)

        await refreshArtwork()
        setBuyOk(true)

      } else {
        // ===== VENTA DIRECTA =====
        // Condición clave del backend: debe ser venta_directa=true y estado_venta='publicada'
        if (!ventaDirectaFlag) throw new Error('This artwork is not for direct sale.')
        if (estadoFresh !== 'publicada') throw new Error('This artwork is not available for sale.')

        console.log('[ArtworkDetail] DIRECT PURCHASE -> POST', `/artworks/${data.id}/purchase/`)
        const res = await authService.client.post(`/artworks/${data.id}/purchase/`) // sin body
        console.log('[ArtworkDetail] DIRECT PURCHASE response:', res?.data)

        // Refresco para reflejar "vendida" / status / etc. en UI
        await refreshArtwork()

        setBuyOk(true)
      }

    } catch(e){
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (typeof e?.response?.data === 'string' ? e.response.data : '') ||
        e?.message ||
        'No se pudo completar la compra.'
      setBuyErr(msg)
    } finally {
      setBuying(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        {/* breadcrumb */}
        <div className="text-sm text-slate-500">
          <Link to="/comprar" className="hover:underline">Marketplace</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">{data.title}</span>
        </div>

        {/* Hero: imagen + ficha */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* galería */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white/60">
              <img
                src={data.gallery[idx] || data.image}
                alt={data.title}
                className="w-full aspect-[4/3] object-cover"
                loading="eager"
              />
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {data.gallery.map((src, i)=>(
                <button key={i} onClick={()=>setIdx(i)}
                  className={`overflow-hidden rounded-2xl ring-1 ${idx===i ? 'ring-indigo-500' : 'ring-slate-200'} bg-white/60`}>
                  <img src={src} alt={`mini ${i+1}`} className="h-20 w-28 object-cover"/>
                </button>
              ))}
            </div>
          </div>

          {/* ficha */}
          <aside className="lg:col-span-2">
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-start gap-4">
                <Link
                  to={`/donaciones/artista/${artistSlug}`}
                  className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white text-sm font-bold ring-1 ring-transparent hover:ring-indigo-400 transition"
                  title="Ver perfil del artista"
                >
                  {String(data.artist).split(' ').map(s=>s[0]).slice(0,2).join('')}
                </Link>
                <div>
                  <h1 className="text-2xl font-extrabold leading-tight">{data.title}</h1>
                  <Link
                    to={`/donaciones/artista/${artistSlug}`}
                    className="text-slate-600 hover:text-indigo-600 hover:underline"
                  >
                    {data.artist || '—'}
                  </Link>
                  <div className="mt-1 flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4"/>
                    <span className="text-sm font-semibold">
                      { Number(rating.avg || 0).toFixed(1) }
                    </span>
                    <span className="text-xs text-slate-500">({rating.count} valoraciones)</span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              {isDirect ? (
                <div className="grid grid-cols-1 gap-3 text-center">
                  <Metric label="Precio" value={`$${fmt(unit)}`} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Metric label="Precio ref." value={`$${fmt(data.price)}`} />
                  <Metric label="Desde" value={`$${fmt(data.fractionFrom)}`} />
                  <Metric label="Vend." value={`${soldPct}%`} />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {data.tags.map(t => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-700">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-2 border-t pt-3">
                {canRate ? (
                  <div>
                    <div className="text-xs text-slate-600 mb-1">Tu valoración</div>
                    <StarSelector value={rating.my} onChange={handleRate} />
                    {rateErr && <div className="text-xs text-red-600 mt-1">{rateErr}</div>}
                    {rateSaving && <div className="text-xs text-slate-500 mt-1">Guardando…</div>}
                    {!!rating.my && !rateErr && !rateSaving && (
                      <div className="text-xs text-slate-500 mt-1">Gracias por valorar esta obra.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Iniciá sesión para valorar esta obra.
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className={`btn flex-1 disabled:opacity-60 ${(!isDirect && isAuctioned) || isSold ? 'btn-outline' : 'btn-primary'}`}
                  disabled={!canBuy || (!isDirect && isAuctioned) || isSold}
                  onClick={()=> setBuyOpen(true)}
                  title={
                    !canBuy
                      ? 'Iniciá sesión para comprar'
                      : isSold
                        ? 'Obra vendida'
                        : isDirect
                          ? 'Comprar obra'
                          : (isAuctioned ? 'Obra subastada: no disponible' : 'Comprar fracción')
                  }
                >
                  {isSold ? 'Obra vendida' : (isDirect ? 'Comprar' : (isAuctioned ? 'Obra subastada' : 'Comprar fracción'))}
                </button>
                <button className="btn btn-outline" title="Compartir"><Share className="h-4 w-4"/></button>
              </div>
            </div>
          </aside>
        </div>

        {/* Descripción / detalles técnicos */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-surface p-6">
            <h2 className="text-lg font-bold">Sobre la obra</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{data.description}</p>
          </div>
          <div className="card-surface p-6">
            <h3 className="text-lg font-bold">Ficha técnica</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li><strong>Técnica:</strong> {data.tags.join(', ')}</li>
              <li><strong>Publicación:</strong> {formatDateDMY(data.createdAt)}</li>
              <li><strong>Rating:</strong> {Number(rating.avg || 0).toFixed(1)} ({rating.count})</li>
            </ul>
            <div className="mt-4">
              <button onClick={()=>navigate('/comprar')} className="btn btn-outline w-full">Volver al marketplace</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL COMPRA ===== */}
      {buyOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="p-5 border-b border-slate-200/70 flex items-center justify-between">
              <h3 className="text-lg font-bold">{isDirect ? 'Comprar obra' : 'Comprar fracciones'}</h3>
              <button className="btn btn-ghost" onClick={()=>setBuyOpen(false)} title="Cerrar">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {!buyOk ? (
                <>
                  <div className="text-sm text-slate-700">
                    <div className="font-semibold">{data.title}</div>
                    {isDirect ? (
                      <div>Precio: <strong>${fmt(unit)}</strong></div>
                    ) : (
                      <>
                        <div>Precio unitario: <strong>${fmt(unit)}</strong></div>
                        <div>Disponibles: <strong>{data.fractionsLeft}</strong></div>
                      </>
                    )}
                  </div>

                  {!isDirect && (
                    <div>
                      <label className="form-label">Cantidad</label>
                      <div className="flex items-stretch gap-2">
                        <button
                          className="btn btn-outline"
                          type="button"
                          onClick={()=> setQty(q => Math.max(1, Number(q||1) - 1))}
                          disabled={Number(qty) <= 1}
                          title="Restar 1"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, Number(data.fractionsLeft||1))}
                          step={1}
                          inputMode="numeric"
                          className="input flex-1 text-center"
                          value={qty}
                          onChange={e=>{
                            const v = Math.floor(Math.max(1, Number(e.target.value||1)))
                            const max = Number(data.fractionsLeft||1)
                            setQty(Math.min(v, max))
                          }}
                        />
                        <button
                          className="btn btn-outline"
                          type="button"
                          onClick={()=>{
                            const max = Number(data.fractionsLeft||1)
                            setQty(q => Math.min(max, Number(q||1) + 1))
                          }}
                          disabled={Number(qty) >= Math.max(1, Number(data.fractionsLeft||1))}
                          title="Sumar 1"
                        >+</button>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Total a pagar: <strong>${fmt(total)}</strong>
                      </div>
                    </div>
                  )}

                  {buyErr && <div className="text-sm text-red-600">{buyErr}</div>}

                  <div className="pt-1 flex gap-2">
                    <button className="btn btn-outline flex-1" onClick={()=>setBuyOpen(false)}>Cancelar</button>
                    <button
                      className="btn btn-primary flex-1 disabled:opacity-60"
                      disabled={buying || isSold || (!isDirect && (!qty || qty < 1))}
                      onClick={handleBuy}
                    >
                      {buying ? 'Procesando…' : (isSold ? 'Obra vendida' : `Comprar por $${fmt(total)}`)}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold">¡Compra exitosa!</h4>
                  <p className="text-slate-600 text-sm">
                    {isDirect
                      ? <>Adquiriste la obra por <strong>${fmt(total)}</strong>.</>
                      : <>Adquiriste <strong>{qty}</strong> fracción{qty>1?'es':''} por <strong>${fmt(total)}</strong>.</>
                    }
                  </p>
                  <button className="btn btn-primary w-full" onClick={()=>setBuyOpen(false)}>Aceptar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ===== FIN MODAL ===== */}
    </section>
  )
}

/* --- UI helpers --- */
function Metric({label, value}){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}
function Skeleton(){
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="aspect-[4/3] w-full rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="mt-3 flex gap-3">
          {Array.from({length:4}).map((_,i)=>(
            <div key={i} className="h-20 w-28 rounded-2xl bg-slate-200/70 animate-pulse"></div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="h-40 rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="h-32 rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
    </div>
  )
}
function Star(props){ return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>)}
function Share(props){ return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
  <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
</svg>)}
function fmt(n){ return Number(n||0).toLocaleString('es-AR') }

/* --- selector de estrellas --- */
function StarSelector({ value = 0, onChange }){
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div className="inline-flex items-center gap-1">
      {[1,2,3,4,5].map(v=>(
        <button
          key={v}
          type="button"
          className="p-0.5"
          onMouseEnter={()=>setHover(v)}
          onMouseLeave={()=>setHover(0)}
          onClick={()=>onChange?.(v)}
          aria-label={`Valorar con ${v} estrellas`}
          title={`${v} estrella${v>1?'s':''}`}
        >
          <StarIcon className={`h-6 w-6 ${v <= active ? 'text-yellow-500' : 'text-slate-300'}`} filled={v <= active}/>
        </button>
      ))}
    </div>
  )
}
function StarIcon({ className = '', filled = true }){
  return filled ? (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 17.3l-6.18 3.64 1.64-6.99L2 8.9l7.09-.61L12 1.5l2.91 6.79 7.09.61-5.46 5.05 1.64 6.99z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 17.3l-6.18 3.64 1.64-6.99L2 8.9l7.09-.61L12 1.5l2.91 6.79 7.09.61-5.46 5.05 1.64 6.99z" />
    </svg>
  )
}
