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

  // editar fecha de fin
  const [endLocal, setEndLocal] = useState('')      // YYYY-MM-DDTHH:mm (local)
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
      setEndLocal(toLocalInputValue(item?.end_date))
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

  // Normalizador de URLs de imagen
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

  // Helpers fecha
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
    // localStr: "YYYY-MM-DDTHH:mm"
    if (!localStr) return null
    const d = new Date(localStr)
    if (isNaN(d)) return null
    // Enviar con Z y segundos
    return d.toISOString().slice(0,19) + 'Z'
  }

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

  const artworkTitle = data.artwork_title || data.title || 'Obra'
  const artistName   = data.artist_name || 'Artista'
  const status       = data.status || '—'
  const startDate    = data.start_date ? new Date(data.start_date) : null
  const endDate      = data.end_date   ? new Date(data.end_date)   : null

  // Guardar nueva end_date
  const onSaveEndDate = async () => {
    setSaveErr('')
    setSaveOk(false)
    const isoZ = localToIsoZ(endLocal)
    if (!isoZ) { setSaveErr('Elegí una fecha y hora válidas.'); return }
    setSavingDate(true)
    try{
      const { data: updated } = await api.patch(`/api/v1/auctions/${id}/`, { end_date: isoZ })
      setData(updated)
      setEndLocal(toLocalInputValue(updated?.end_date))
      setSaveOk(true)
    }catch(e){
      const payload = e?.response?.data
      setSaveErr(payload?.detail || payload?.end_date || payload?.message || e?.message || 'No se pudo actualizar la fecha.')
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
                    <strong>Inicio:</strong>{' '}
                    {startDate ? startDate.toLocaleString('es-AR') : '—'}
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Finaliza:</strong>{' '}
                    {endDate ? endDate.toLocaleString('es-AR') : '—'}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                  status === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {status}
                </span>
              </div>

              {/* Cambiar fecha de finalización */}
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <label className="form-label" htmlFor="endLocal">Nueva fecha/hora de finalización</label>
                <input
                  id="endLocal"
                  type="datetime-local"
                  className="input"
                  value={endLocal}
                  onChange={(e)=>setEndLocal(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Al guardar, se actualizará el campo <code>end_date</code> de la subasta.
                </p>
                {saveErr && <div className="text-sm text-red-600 mt-2">{saveErr}</div>}
                {saveOk &&  <div className="text-sm text-emerald-700 mt-2">¡Fecha actualizada!</div>}
                <button
                  type="button"
                  className="btn btn-primary w-full mt-3 disabled:opacity-60"
                  onClick={onSaveEndDate}
                  disabled={savingDate || !endLocal}
                >
                  {savingDate ? 'Guardando…' : 'Guardar nueva fecha'}
                </button>
              </div>

              <Link to="/admin/subastas" className="btn btn-outline w-full">Volver</Link>
            </div>
          </aside>
        </div>
      </div>
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
