// src/pages/admin/auctions/AdminAuctions.jsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { listAuctions } from '../../../services/mockArtworks.js'

export default function AdminAuctions(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [tab, setTab] = useState('today') // today | upcoming | finished
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let alive = true
    setLoading(true)
    listAuctions(tab).then(res=>{
      if(!alive) return
      setItems(res); setLoading(false)
    })
    return ()=>{ alive=false }
  }, [tab])

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

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Admin</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Subastas</h1>
              <p className="lead text-slate-600">Gestioná obras con fecha de subasta o ya subastadas.</p>
            </div>
            <Link to="/admin" className="btn btn-outline">Volver a revisión</Link>
          </div>

          <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            <Tab label="Hoy"      active={tab==='today'}    onClick={()=>setTab('today')} />
            <Tab label="Próximas" active={tab==='upcoming'} onClick={()=>setTab('upcoming')} />
            <Tab label="Finalizadas" active={tab==='finished'} onClick={()=>setTab('finished')} />
          </div>
        </div>
      </div>

      <div className="section-frame pb-16">
        {loading ? <GridSkeleton/> : (
          items.length === 0 ? (
            <div className="card-surface p-8 text-center text-slate-600">
              No hay obras en esta categoría.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map(it => (
                <article key={it.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
                  <img src={it.image} alt={it.title} className="aspect-[4/3] w-full object-cover"/>
                  <div className="p-4 space-y-2">
                    <div className="font-bold line-clamp-1">{it.title}</div>
                    <div className="text-sm text-slate-600">{it.artist}</div>
                    <div className="text-xs text-slate-500">Subasta: {it.auctionDate || '—'}</div>

                    {tab === 'finished' && it.auction && (
                      <div className="mt-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs p-2">
                        Ganador: <strong>{it.auction.winnerName || '—'}</strong><br/>
                        DNI: {it.auction.winnerDni || '—'} • Precio: ${Number(it.auction.finalPrice||0).toLocaleString('es-AR')}
                      </div>
                    )}

                    <div className="mt-3">
                      {tab === 'finished' ? (
                        <Link to={`/admin/subasta/${it.id}`} className="btn btn-outline w-full">Ver</Link>
                      ) : tab === 'upcoming' ? (
                        <Link to={`/admin/subasta/${it.id}`} className="btn btn-outline w-full">Ver</Link>
                      ) : (
                        <button className="btn btn-primary w-full" onClick={()=>navigate(`/admin/subasta/${it.id}`)}>Gestionar</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </div>
    </section>
  )
}

function Tab({ label, active, onClick }){
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}
    >
      {label}
    </button>
  )
}

function GridSkeleton(){
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({length:8}).map((_,i)=>(
        <div key={i} className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
          <div className="aspect-[4/3] w-full animate-pulse bg-slate-200/70" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-2/3 bg-slate-200/70 animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-slate-200/70 animate-pulse rounded" />
            <div className="mt-3 h-4 w-1/2 bg-slate-200/70 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
