// src/pages/admin/AdminArtworkReview.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getArtworkById, setArtworkStatus } from '../../services/mockArtworks.js'

export default function AdminArtworkReview(){
  const { id } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const [idx, setIdx] = useState(0)

  useEffect(()=>{
    let alive = true
    setLoading(true)
    getArtworkById(id).then(item=>{
      if(!alive) return
      setData(item); setLoading(false)
    }).catch(e=>{
      setErr(e.message || 'No se pudo cargar la obra'); setLoading(false)
    })
    return ()=>{ alive = false }
  }, [id])

  const isPending = useMemo(()=> data && (data.status === 'pending'), [data])

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
        <div className="mt-4"><Link to="/admin" className="btn btn-primary">Volver</Link></div>
      </div>
    </section>
  )
  if (!data) return null

  const onApprove = async ()=>{
    if (saving) return
    setSaving(true)
    try{
      await setArtworkStatus(data.id,'approved')
      alert('Obra aprobada correctamente.')
      navigate('/admin', { replace: true })
    }finally{ setSaving(false) }
  }

  const onMarkPending = async ()=>{
    if (saving) return
    setSaving(true)
    try{
      await setArtworkStatus(data.id,'pending')
      alert('La obra volvió a estado pendiente.')
      navigate('/admin', { replace: true })
    }finally{ setSaving(false) }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/admin" className="hover:underline">Admin</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">Revisión</span>
        </div>

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
                <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                  {data.artist.split(' ').map(s=>s[0]).slice(0,2).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-extrabold leading-tight">{data.title}</h1>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isPending ? 'Pendiente' : 'Aprobada'}
                    </span>
                  </div>
                  <p className="text-slate-600">{data.artist}</p>
                </div>
              </div>

              <div className="divider" />

              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Precio ref." value={`$${fmt(data.price)}`} />
                <Metric label="Desde" value={`$${fmt(data.fractionFrom)}`} />
                <Metric label="Fracciones" value={`${data.fractionsTotal}`} />
              </div>

              <div className="flex flex-wrap gap-2">
                {data.tags.map(t => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-700">
                    {t}
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                {isPending ? (
                  <button
                    className="btn btn-primary w-full disabled:opacity-60"
                    onClick={onApprove}
                    disabled={saving}
                  >
                    {saving ? 'Aprobando…' : 'Aprobar obra'}
                  </button>
                ) : (
                  <button
                    className="btn btn-outline w-full disabled:opacity-60"
                    onClick={onMarkPending}
                    disabled={saving}
                  >
                    {saving ? 'Guardando…' : 'Marcar como pendiente'}
                  </button>
                )}
                <Link to="/admin" className="btn btn-outline w-full text-center">Volver al listado</Link>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-surface p-6">
            <h2 className="text-lg font-bold">Descripción provista por el artista</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{data.description}</p>
          </div>
          <div className="card-surface p-6">
            <h3 className="text-lg font-bold">Metadatos</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li><strong>Autor:</strong> {data.artist}</li>
              <li><strong>Publicación:</strong> {data.createdAt}</li>
              <li><strong>Estado:</strong> {data.status}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* helpers UI */
function Metric({label, value}){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
      <div className="text-lg font-extrabold text-center">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 text-center">{label}</div>
    </div>
  )
}
function Skeleton(){
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="aspect-[4/3] w-full rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="mt-3 flex gap-3">
          {Array.from({length:4}).map((_,i)=>(<div key={i} className="h-20 w-28 rounded-2xl bg-slate-200/70 animate-pulse"></div>))}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="h-40 rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="h-32 rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
    </div>
  )
}
function fmt(n){ return Number(n||0).toLocaleString('es-AR') }
