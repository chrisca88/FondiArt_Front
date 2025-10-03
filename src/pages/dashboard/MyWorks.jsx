// src/pages/dashboard/MyWorks.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../../utils/api.js'

export default function MyWorks(){
  const user = useSelector(s => s.auth.user)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(()=>{
    console.log('Current user:', user)
    if (!user?.id) {
      setLoading(false)
      setError("No user ID found. Cannot fetch artworks.")
      console.error("No user ID found in Redux store.")
      return
    }

    let alive = true
    setLoading(true)
    setError(null)
    
    api.get(`/api/v1/users/${user.id}/artworks/`)
      .then(res => {
        if (!alive) return
        console.log('Artworks fetched successfully:', res.data)
        setItems(res.data.results || [])
        setLoading(false)
      })
      .catch(err => {
        if (!alive) return
        const errorMsg = err.response?.data?.message || err.message || "An unknown error occurred."
        console.error("Error fetching artworks:", errorMsg, err)
        setError(errorMsg)
        setLoading(false)
      })

    return ()=>{ alive = false }
  }, [user])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="eyebrow">Artista</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mis obras</h1>
              <p className="lead mt-2 max-w-2xl">Gestioná tus publicaciones, estado y estadísticas.</p>
            </div>
            <Link to="/publicar" className="btn btn-primary self-start">Publicar obra</Link>
          </div>
        </div>
      </div>

      <div className="section-frame pb-16">
        {loading && <GridSkeleton/>}

        {error && (
          <div className="card-surface p-10 text-center bg-red-50 border-red-200">
            <h3 className="text-xl font-bold text-red-800">Ocurrió un error</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="card-surface p-10 text-center">
            <h3 className="text-xl font-bold">Todavía no publicaste obras</h3>
            <p className="text-slate-600 mt-1">Usá el botón “Publicar obra” para empezar.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(it => (
              <OwnerArtworkCard
                key={it.id}
                item={it}
                onStats={()=>navigate(`/obra/${it.id}/estadisticas`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function OwnerArtworkCard({ item, onStats }){
  const sold = item.fractionsTotal - item.fractionsLeft
  const pct = Math.round(sold / (item.fractionsTotal || 1) * 100)

  const statusConfig = {
    pending: { text: 'Pendiente', className: 'bg-amber-100 text-amber-700', title: 'Pendiente de aprobación' },
    approved: { text: 'Aprobado', className: 'bg-emerald-100 text-emerald-700', title: 'Aprobado' },
    rejected: { text: 'Rechazada', className: 'bg-red-100 text-red-700', title: 'Rechazada' },
    default: { text: item.status || 'Desconocido', className: 'bg-slate-100 text-slate-700', title: `Estado: ${item.status}` }
  }
  const currentStatus = statusConfig[item.status] || statusConfig.default

  let imageUrl = item.image;
  if (typeof imageUrl === 'string') {
    const marker = 'https%3A/';
    const index = imageUrl.indexOf(marker);
    if (index !== -1) {
      imageUrl = 'https://' + imageUrl.substring(index + marker.length);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 flex flex-col">
      <img src={imageUrl} alt={item.title} className="aspect-[4/3] w-full object-cover"/>
      <div className="p-4 space-y-2 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="font-bold">{item.title}</div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${currentStatus.className}`}
            title={currentStatus.title}
          >
            {currentStatus.text}
          </span>
        </div>
        <div className="text-sm text-slate-600">
          {new Date(item.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Vendidas</span><span>{sold}/{item.fractionsTotal} ({pct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="text-xs">
          <Link to={`/obra/${item.id}`} className="text-indigo-600 hover:underline">
            Ver obra
          </Link>
          {item.status === 'pending' && <span className="text-slate-500"> · (aún no visible en marketplace)</span>}
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            to={`/publicar?edit=${item.id}`}
            className="btn btn-outline flex-1 rounded-xl"
            title="Editar publicación"
          >
            Editar publicación
          </Link>
          <button onClick={onStats} className="btn btn-primary rounded-xl">
            Ver estadísticas
          </button>
        </div>
      </div>
    </div>
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
            <div className="h-3 w-2/5 bg-slate-200/70 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
