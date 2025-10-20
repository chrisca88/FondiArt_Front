// src/pages/admin/auctions/AuctionDetail.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../../utils/api.js'

export default function AuctionDetail(){
  const { id } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // (placeholder no editable por ahora)
  const [finalPrice, setFinalPrice] = useState('')
  const [ok] = useState(false)

  // edición de fecha de subasta
  const [auctionLocal, setAuctionLocal] = useState('')  // YYYY-MM-DDTHH:mm
  const [savingDate, setSavingDate] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  useEffect(()=> {
    let alive = true
    setLoading(true)
    setErr(null)

    api.get(`/api/v1/auctions/${id}/`).then(res => {
      if(!alive) return
      const item = res?.data
      setData(item || null)
      setFinalPrice(item?.final_price || '')
      setAuctionLocal(toLocalInputValue(item?.auction_date))
      setLoading(false)
    }).catch(e => {
      if(!alive) return
      const payload = e?.response?.data
      setErr(payload?.detail || payload?.message || e?.message || 'No se pudo cargar la subasta')
      setLoading(false)
    })

    return ()=> { alive=false }
  }, [id])

  const isAuctioned = data?.status === 'auctioned'

  // Normalizador de URLs de imagen (evita prefijos indeseados)
  const normalizeImageUrl = (u) => {
    if (!u || typeof u !== 'string') return ''
    const httpsMarker = 'https%3A/'
    const httpMarker  = 'http%3A/'
    if (u.includes(httpsMarker)) return 'https://' + u.substring(u.indexOf(httpsMarker) + httpsMarker.length)
    if (u.includes(httpMarker))  return 'http://'  + u.substring(u.indexOf(httpMarker) + httpMarker.length)
    if (/^https?:\/\//i.test(u)) return u
    if (u.startsWith('/')) {
      const base = (api?.defaults?.baseURL || '').replace(/\/$/, '')
      return base + u
    }
    return u
  }

  // Helpers fecha (↔ input datetime-local)
  function toLocalInputValue(iso){
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d)) return ''
    const pad = n => String(n).padStart(2,'0')
    const yyyy = d.getFullYear()
    const mm   = pad(d.getMonth()+1)
    const dd   = pad(d.getDate())
    const hh   = pad(d.getHours())
    const mi   = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }
  function localToIsoZ(localStr){
    if (!localStr) return null
    const d = new Date(localStr)
    if (isNaN(d)) return null
    return d.toISOString().slice(0,19) + 'Z'
  }

  // Texto legible si hubieran datos legacy
  const auctionDateText = useMemo(()=> {
    const iso = data?.auctionDate
    if (!iso) return null
    const [yyyy, mm, dd] = String(iso).split('-')
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`
    try { return new Date(iso).toLocaleDateString('es-AR') } catch { return String(iso) }
  }, [data?.auctionDate])

  const canCloseToday = useMemo(()=> {
    const iso = String(data?.auctionDate || '')
    if (!iso) return false
    const today = new Date().toISOString().slice(0,10)
    return today >= iso
  }, [data?.auctionDate])

  if (user?.role !== 'admin'){
    return (
      <section className="section-frame py-16">
        <div className="card-surface p-8 text-center">
          <h3 className="text-xl font-bold">Acceso restringido</h3>
          <p className="text-slate-600 mt-1">Esta sección es solo para administradores.</p>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="section-frame py-16">
        <Skeleton/>
      </section>
    )
  }

  if (err) {
    return (
      <section className="section-frame py-16">
        <div className="card-surface p-8 text-center">
          <h3 className="text-xl font-bold">Error</h3>
          <p className="text-slate-600 mt-1">{err}</p>
          <div className="mt-4"><Link to="/admin/subastas" className="btn btn-primary">Volver</Link></div>
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="section-frame py-16">
        <div className="card-surface p-8 text-center">
          <h3 className="text-xl font-bold">Sin datos</h3>
          <p className="text-slate-600 mt-1">No se encontró información de la subasta.</p>
          <div className="mt-4"><Link to="/admin/subastas" className="btn btn-primary">Volver</Link></div>
        </div>
      </section>
    )
  }

  // Campos defensivos
  const artworkTitle = data.artwork_title || data.title || 'Obra'
  const artistName   = data.artist_name || 'Artista'
  const status       = data.status || '—'
  const auctionDate  = data.auction_date ? new Date(data.auction_date) : null

  // Guardar nueva fecha de subasta
  const onSaveAuctionDate = async () => {
    setSaveErr('')
    setSaveOk(false)
    const isoZ = localToIsoZ(auctionLocal)
    if (!isoZ) { setSaveErr('Elegí una fecha y hora válidas.'); return }
    setSavingDate(true)
    try{
      const { data: updated } = await api.patch(`/api/v1/auctions/${id}/`, { auction_date: isoZ })
      setData(updated)
      setAuctionLocal(toLocalInputValue(updated?.auction_date))
      setSaveOk(true)
    }catch(e){
      const payload = e?.response?.data
      setSaveErr(payload?.detail || payload?.auction_date || payload?.message || e?.message || 'No se pudo actualizar la fecha.')
    }finally{
      setSavingDate(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/admin" className="hover:underline">Admin</Link>
          <span className="mx-2">/</span>
          <Link to="/admin/subastas" className="hover:underline">Subastas</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">{artworkTitle}</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Imagen */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white/60">
              <img
                src={normalizeImageUrl(data.artwork_image || data.image || '')}
                alt={artworkTitle}
                className="w-full aspect-[4/3] object-cover"
                loading="eager"
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Sin+imagen' }}
              />
            </div>
          </div>

          {/* Panel */}
          <aside className="lg:col-span-2">
            <div className="card-surface p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold leading-tight">{artworkTitle}</h1>
                  <p className="text-slate-600">{artistName}</p>
                  <div className="text-sm text-slate-700 mt-1">
                    <strong>Fecha de subasta:</strong>{' '}
                    {auctionDate ? auctionDate.toLocaleString('es-AR') : '—'}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                  status === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {status}
                </span>
              </div>

              {/* Cambiar fecha de subasta */}
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <label className="form-label" htmlFor="auctionLocal">Nueva fecha/hora de subasta</label>
                <input
                  id="auctionLocal"
                  type="datetime-local"
                  className="input"
                  value={auctionLocal}
                  onChange={(e)=>setAuctionLocal(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Al guardar, se actualizará el campo <code>auction_date</code>.
                </p>
                {saveErr && <div className="text-sm text-red-600 mt-2">{saveErr}</div>}
                {saveOk &&  <div className="text-sm text-emerald-700 mt-2">¡Fecha de subasta actualizada!</div>}
                <button
                  type="button"
                  className="btn btn-primary w-full mt-3 disabled:opacity-60"
                  onClick={onSaveAuctionDate}
                  disabled={savingDate || !auctionLocal}
                >
                  {savingDate ? 'Guardando…' : 'Guardar fecha de subasta'}
                </button>
              </div>

              {/* Bloque ganador (placeholder, sin cambios) */}
              {status === 'finished' && (
                <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm">
                  <div><strong>Ganador:</strong> {data.buyer || '—'}</div>
                  <div><strong>Precio final:</strong> ${Number(data.final_price||0).toLocaleString('es-AR')}</div>
                </div>
              )}

              {status !== 'finished' && (
                <>
                  <div>
                    <label className="form-label">Nombre del ganador</label>
                    <input className="input" placeholder="Nombre y apellido" disabled />
                  </div>
                  <div>
                    <label className="form-label">DNI</label>
                    <input className="input" placeholder="Documento" disabled />
                  </div>
                  <div>
                    <label className="form-label">Precio final de subasta (ARS)</label>
                    <input type="number" className="input" min={0} placeholder="Ej. 150000" disabled />
                  </div>
                  <button className="btn btn-primary w-full" disabled>
                    Marcar como subastada (Próximamente)
                  </button>
                </>
              )}

              <Link to="/admin/subastas" className="btn btn-outline w-full">Volver</Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal éxito (reservado para futuros flujos) */}
      {ok && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">✓</div>
            <h3 className="text-lg font-bold">Subasta registrada</h3>
            <p className="text-slate-700 mt-1">La obra quedó marcada como subastada y ya no aparecerá en el marketplace.</p>
            <button className="btn btn-primary mt-5 w-full" onClick={()=>navigate('/admin/subastas', { replace: true })}>Aceptar</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Skeleton(){
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="aspect-[4/3] w-full rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="h-40 rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="h-32 rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
    </div>
  )
}
