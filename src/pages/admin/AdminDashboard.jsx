// src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api.js'

export default function AdminDashboard(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [allArtworks, setAllArtworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  // 'pending' | 'approved' | 'all'
  const [filter, setFilter] = useState('pending')

  // Fetch data from API when search query 'q' changes
  useEffect(()=>{
    let alive = true
    const load = async ()=>{
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q) params.set('q', q)

        const url = `/artworks/?${params.toString()}`

        console.log('[AdminDashboard] Fetching artworks...', {
          url,
          params: Object.fromEntries(params.entries())
        })

        const res = await api.get(url)

        console.log('[AdminDashboard] Response status:', res?.status)
        console.log('[AdminDashboard] Raw data:', res?.data)

        const data = res?.data
        const normalized = Array.isArray(data) ? data : (data?.results || [])

        console.log('[AdminDashboard] Normalized items count:', normalized.length)

        if(alive){
          setAllArtworks(normalized)
        }
      } catch (err) {
        if(alive){
          console.error('[AdminDashboard] Error fetching artworks for admin:', {
            message: err?.message,
            status: err?.response?.status,
            data: err?.response?.data
          })
          setAllArtworks([])
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return ()=>{ alive = false }
  }, [q])

  // ✅ Primero: excluir venta directa (mostrar solo tokenizadas)
  // ✅ Después: filtrar por estado (pending/approved/all)
  const items = useMemo(() => {
    const tokenizadas = allArtworks.filter(it => it?.venta_directa !== true)

    if (filter === 'all') return tokenizadas

    return tokenizadas.filter(it => {
      const s = (it?.status || '').toString().toLowerCase()
      return s === filter
    })
  }, [allArtworks, filter])

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
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="eyebrow">Admin</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Revisión de obras tokenizadas</h1>
              <p className="lead text-slate-600">Filtrá, buscá y aprobá publicaciones tokenizadas</p>
            </div>

            {/* filtros y búsqueda */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                <Tab label="Pendientes" active={filter==='pending'} onClick={()=>setFilter('pending')}/>
                <Tab label="Aprobadas" active={filter==='approved'} onClick={()=>setFilter('approved')}/>
                <Tab label="Todas" active={filter==='all'} onClick={()=>setFilter('all')}/>
              </div>
              <div className="relative">
                <input
                  className="input pr-10 w-64"
                  placeholder="Buscar por título, artista o tags…"
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon className="h-5 w-5"/>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-frame pb-16">
        {loading && <GridSkeleton/>}

        {!loading && items.length === 0 && (
          <div className="card-surface p-10 text-center">
            <h3 className="text-xl font-bold">Sin resultados</h3>
            <p className="text-slate-600 mt-1">Probá cambiar el filtro o la búsqueda.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(it => {
              let imageUrl = it.image
              if (typeof imageUrl === 'string') {
                const marker = 'https%3A/'
                const index = imageUrl.indexOf(marker)
                if (index !== -1) {
                  imageUrl = 'https://' + imageUrl.substring(index + marker.length)
                } else if (!imageUrl.startsWith('http')) {
                  imageUrl = `${api.defaults.baseURL}${imageUrl}`
                }
              }

              const normalizedStatus = (it.status || '').toString().toLowerCase()

              const statusConfig = {
                pending: { text: 'Pendiente', className: 'bg-amber-100 text-amber-700', title: 'Pendiente de aprobación' },
                approved: { text: 'Aprobado', className: 'bg-emerald-100 text-emerald-700', title: 'Aprobado' },
                rejected: { text: 'Rechazada', className: 'bg-red-100 text-red-700', title: 'Rechazada' },
                default: { text: it.status || 'Desconocido', className: 'bg-slate-100 text-slate-700', title: `Estado: ${it.status}` }
              }
              const currentStatus = statusConfig[normalizedStatus] || statusConfig.default

              return (
                <button
                  key={it.id}
                  onClick={()=>navigate(`/admin/obra/${it.id}`)}
                  className="text-left overflow-hidden rounded-3xl border border-slate-200 bg-white/70 hover:shadow transition"
                  title="Ver detalle y aprobar"
                >
                  <img src={imageUrl} alt={it.title} className="aspect-[4/3] w-full object-cover"/>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold line-clamp-1">{it.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${currentStatus.className}`}
                        title={currentStatus.title}
                      >
                        {currentStatus.text}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600">{it.artist?.name}</div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        {it.createdAt
                          ? new Date(it.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '—'}
                      </div>

                      {/* Badge opcional: confirma que NO es venta directa */}
                      <span className="rounded-full px-2 py-0.5 text-[11px] bg-indigo-100 text-indigo-700">
                        Tokenizada
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
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

function SearchIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-3.5-3.5"/>
  </svg>
)}
