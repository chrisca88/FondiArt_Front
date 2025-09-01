// src/pages/artworks/ArtworkDetail.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  getArtworkById,
  getArtworkRating,
  rateArtwork
} from '../../services/mockArtworks.js'

export default function ArtworkDetail(){
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useSelector(s => s.auth.user)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [idx, setIdx] = useState(0) // imagen seleccionada

  // rating agregado
  const [rating, setRating] = useState({ avg: 0, count: 0, my: 0 })
  const canRate = !!user && user.role === 'buyer'

  useEffect(()=>{
    let alive = true
    setLoading(true)
    Promise.all([
      getArtworkById(id),
      getArtworkRating(id, user?.id)
    ]).then(([item, r])=>{
      if(!alive) return
      setData(item)
      setRating(r)
      setLoading(false)
    }).catch(e=>{
      setErr(e.message || 'No se pudo cargar la obra'); setLoading(false)
    })
    return ()=>{ alive = false }
  }, [id, user?.id])

  const soldPct = useMemo(()=>{
    if(!data) return 0
    return Math.round(100 - (data.fractionsLeft / data.fractionsTotal) * 100)
  }, [data])

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
                <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                  {data.artist.split(' ').map(s=>s[0]).slice(0,2).join('')}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold leading-tight">{data.title}</h1>
                  <p className="text-slate-600">{data.artist}</p>
                  <div className="mt-1 flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4"/>
                    <span className="text-sm font-semibold">
                      { (rating.avg || data.rating || 0).toFixed ? (rating.avg || data.rating || 0).toFixed(1) : (rating.avg || data.rating || 0) }
                    </span>
                    <span className="text-xs text-slate-500">({rating.count} valoraciones)</span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Precio ref." value={`$${fmt(data.price)}`} />
                <Metric label="Desde" value={`$${fmt(data.fractionFrom)}`} />
                <Metric label="Vend." value={`${soldPct}%`} />
              </div>

              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Disponibles</span>
                  <span>{data.fractionsLeft}/{data.fractionsTotal}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${soldPct}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {data.tags.map(t => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-700">
                    {t}
                  </span>
                ))}
              </div>

              {/* ----- Bloque de valoración ----- */}
              <div className="mt-2 border-t pt-3">
                {canRate ? (
                  <div>
                    <div className="text-xs text-slate-600 mb-1">Tu valoración</div>
                    <StarSelector
                      value={rating.my}
                      onChange={async (v)=>{
                        const updated = await rateArtwork(data.id, user.id, v)
                        setData(updated)
                        const r = await getArtworkRating(data.id, user.id)
                        setRating(r)
                      }}
                    />
                    {!!rating.my && (
                      <div className="text-xs text-slate-500 mt-1">Gracias por valorar esta obra.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Iniciá sesión como comprador para valorar esta obra.
                  </div>
                )}
              </div>
              {/* -------------------------------- */}

              <div className="flex gap-2 pt-2">
                <button className="btn btn-primary flex-1" onClick={()=>alert('(Demo) Comprar fracción')}>
                  Comprar fracción
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
              <li><strong>Publicación:</strong> {data.createdAt}</li>
              <li><strong>Rating:</strong> {rating.avg || data.rating || 0}</li>
            </ul>
            <div className="mt-4">
              <button onClick={()=>navigate('/comprar')} className="btn btn-outline w-full">Volver al marketplace</button>
            </div>
          </div>
        </div>
      </div>
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
function fmt(n){ return n.toLocaleString('es-AR') }

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
