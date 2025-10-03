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

  // form ganador
  const [winnerName, setWinnerName] = useState('')
  const [winnerDni, setWinnerDni] = useState('')
  const [finalPrice, setFinalPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(()=>{
    let alive = true
    setLoading(true)
    setErr(null)
    api.get(`/api/v1/auctions/${id}/`).then(res => {
      if(!alive) return
      const item = res.data
      setData(item)
      setFinalPrice(item.final_price || '')
      setLoading(false)
    }).catch(e=>{
      if(!alive) return
      setErr(e.response?.data?.detail || e.message || 'No se pudo cargar la subasta');
      setLoading(false)
    })
    return ()=>{ alive=false }
  }, [id])

  const isAuctioned = data?.status === 'auctioned'

  // Fecha legible para UI
  const auctionDateText = useMemo(()=>{
    const iso = data?.auctionDate
    if (!iso) return null
    const [yyyy, mm, dd] = String(iso).split('-')
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`
    try { return new Date(iso).toLocaleDateString('es-AR') } catch { return String(iso) }
  }, [data?.auctionDate])

  // Permitir cerrar sólo si hoy >= fecha subasta
  const canCloseToday = useMemo(()=>{
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

  if (loading) return <section className="section-frame py-16"><Skeleton/></section>
  if (err) return (
    <section className="section-frame py-16">
      <div className="card-surface p-8 text-center">
        <h3 className="text-xl font-bold">Error</h3>
        <p className="text-slate-600 mt-1">{err}</p>
        <div className="mt-4"><Link to="/admin/subastas" className="btn btn-primary">Volver</Link></div>
      </div>
    </section>
  )
  if (!data) return null

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/admin" className="hover:underline">Admin</Link>
          <span className="mx-2">/</span>
          <Link to="/admin/subastas" className="hover:underline">Subastas</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">{data.title}</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Imagen */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white/60">
              <img
                src={(() => {
                  let imageUrl = data.artwork_image;
                  if (typeof imageUrl === 'string' && !imageUrl.startsWith('http')) {
                    imageUrl = `${api.defaults.baseURL}${imageUrl}`;
                  }
                  return imageUrl;
                })()}
                alt={data.artwork_title}
                className="w-full aspect-[4/3] object-cover"
                loading="eager"
              />
            </div>
          </div>

          {/* Formulario ganador */}
          <aside className="lg:col-span-2">
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold leading-tight">{data.artwork_title}</h1>
                  <p className="text-slate-600">{data.artist_name}</p>
                  <div className="text-sm text-slate-700 mt-1">
                    <strong>Inicio:</strong> {new Date(data.start_date).toLocaleString('es-AR')}
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>Finaliza:</strong> {new Date(data.end_date).toLocaleString('es-AR')}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${data.status === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {data.status}
                </span>
              </div>

              {data.status === 'finished' && (
                <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm">
                  <div><strong>Ganador:</strong> {data.buyer || '—'}</div>
                  <div><strong>Precio final:</strong> ${Number(data.final_price||0).toLocaleString('es-AR')}</div>
                </div>
              )}

              {data.status !== 'finished' && (
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

      {/* Modal éxito */}
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
