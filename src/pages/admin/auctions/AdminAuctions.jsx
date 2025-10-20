// src/pages/admin/auctions/AdminAuctions.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../../utils/api.js'

export default function AdminAuctions(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [tab, setTab] = useState('today') // today | upcoming | finished
  const [allAuctions, setAllAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    let alive = true
    setLoading(true)
    setError(null)
    api.get('/api/v1/auctions/').then(res=>{
      if(!alive) return
      const payload = res?.data
      const list = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])
      setAllAuctions(list || [])
      setLoading(false)
    }).catch(err => {
      if(!alive) return
      console.error("Error fetching auctions:", err)
      setError('No se pudieron cargar las subastas.')
      setLoading(false)
    })
    return ()=>{ alive=false }
  }, [])

  // Helpers de fecha para "hoy" (límites locales del día)
  function getTodayRange(){
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return { start, end }
  }

  // Normaliza URL de imagen (maneja cloudinary url-encoded y rutas relativas)
  function normalizeImageUrl(u){
    if (!u || typeof u !== 'string') return u
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

  const items = useMemo(() => {
    const { start: todayStart, end: todayEnd } = getTodayRange()
    // Filtramos por auction_date
    const parse = (a) => a?.auction_date ? new Date(a.auction_date) : null

    const filtered = allAuctions.filter(a => {
      const d = parse(a)
      if (!d || isNaN(d)) return false
      if (tab === 'today')    return d >= todayStart && d <= todayEnd
      if (tab === 'upcoming') return d >  todayEnd
      if (tab === 'finished') return d <  todayStart
      return false
    })

    console.log(`Recalculating filtered items. Tab=${tab}, Total=${allAuctions.length}, Showing=${filtered.length}`)
    return filtered
  }, [allAuctions, tab])

  const handleDeleteAuction = async (id, title) => {
    console.log(`Attempting to delete auction ID: ${id}`);
    if (!window.confirm(`¿Estás seguro de que querés eliminar la subasta para la obra "${title}"? Esta acción no se puede deshacer.`)) {
      console.log("Deletion cancelled by user.");
      return
    }
    try {
      await api.delete(`/api/v1/auctions/${id}/`)
      console.log(`Successfully deleted auction ID: ${id} from API.`);
      setAllAuctions(prev => {
        console.log("Previous auctions count:", prev.length);
        const newAuctions = prev.filter(a => a.id !== id);
        console.log("New auctions count:", newAuctions.length);
        return newAuctions;
      })
    } catch (err) {
      console.error("Error deleting auction:", err)
      window.alert(err.response?.data?.detail || 'No se pudo eliminar la subasta.')
    }
  }


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
            <Tab label="Hoy"        active={tab==='today'}    onClick={()=>setTab('today')} />
            <Tab label="Próximas"   active={tab==='upcoming'} onClick={()=>setTab('upcoming')} />
            <Tab label="Finalizadas" active={tab==='finished'} onClick={()=>setTab('finished')} />
          </div>
        </div>
      </div>

      <div className="section-frame pb-16">
        {loading ? <GridSkeleton/> : error ? (
          <div className="card-surface p-8 text-center text-red-600">
            {error}
          </div>
        ) : (
          items.length === 0 ? (
            <div className="card-surface p-8 text-center text-slate-600">
              No hay subastas en esta categoría.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map(it => (
                <article key={it.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
                  <img
                    src={normalizeImageUrl(it.artwork_image)}
                    alt={it.artwork_title}
                    className="aspect-[4/3] w-full object-cover"
                    onError={(e)=>{ e.currentTarget.src='https://via.placeholder.com/800x600?text=Sin+imagen' }}
                  />
                  <div className="p-4 space-y-2">
                    <div className="font-bold line-clamp-1">{it.artwork_title}</div>
                    <div className="text-sm text-slate-600">{it.artist_name}</div>

                    <div className="text-xs text-slate-500">
                      Fecha de subasta: {it.auction_date ? new Date(it.auction_date).toLocaleString('es-AR') : '—'}
                    </div>

                    {tab === 'finished' && (
                      <div className="mt-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs p-2">
                        Ganador: <strong>{it.buyer || '—'}</strong><br/>
                        Precio final: ${Number(it.final_price||0).toLocaleString('es-AR')}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      <Link to={`/admin/subastas/${it.id}`} className="btn btn-outline w-full">
                        {tab === 'finished' ? 'Ver detalle' : 'Gestionar'}
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAuction(it.id, it.artwork_title); }}
                        className="btn btn-outline shrink-0 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        title="Eliminar subasta"
                      >
                        <TrashIcon/>
                      </button>
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

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
    </svg>
  )
}
