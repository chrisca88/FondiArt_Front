import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../../utils/api.js'

export default function MyWorks(){
  const user = useSelector(s => s.auth.user)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterType, setFilterType] = useState('all') // 'all' | 'tokenized' | 'direct'
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

        // Normalizamos siempre a array:
        const payload = Array.isArray(res.data)
          ? res.data
          : (Array.isArray(res.data?.results) ? res.data.results : [])

        setItems(payload)
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

  // Asegurarnos de que items sea un array antes de filtrar
  const safeItems = Array.isArray(items) ? items : []

  // --- filtrado local basado en venta_directa ---
  const filteredItems = safeItems.filter(it => {
    if (filterType === 'tokenized') {
      // tokenizada => venta_directa === false
      return it.venta_directa === false
    }
    if (filterType === 'direct') {
      // compra directa => venta_directa === true
      return it.venta_directa === true
    }
    return true // 'all'
  })

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />

          {/* Header layout: título a la izquierda, filtros + publicar a la derecha */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* IZQ: título y subtítulo */}
            <div className="flex-1 min-w-0">
              <p className="eyebrow">Artista</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mis obras</h1>
              <p className="lead mt-2 max-w-2xl">Gestioná tus publicaciones, estado y estadísticas.</p>
            </div>

            {/* DER: filtros + botón publicar */}
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:flex-none">
              {/* segmented control */}
              <SegmentedControl
                value={filterType}
                onChange={setFilterType}
                options={[
                  { value: 'tokenized', label: 'Tokenizadas' },
                  { value: 'direct', label: 'Compra directa' },
                  { value: 'all', label: 'Todas' },
                ]}
              />

              <Link to="/publicar" className="btn btn-primary self-stretch sm:self-auto whitespace-nowrap">
                Publicar obra
              </Link>
            </div>
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

        {!loading && !error && safeItems.length === 0 && (
          <div className="card-surface p-10 text-center">
            <h3 className="text-xl font-bold">Todavía no publicaste obras</h3>
            <p className="text-slate-600 mt-1">Usá el botón “Publicar obra” para empezar.</p>
          </div>
        )}

        {!loading && !error && safeItems.length > 0 && (
          <>
            {filteredItems.length === 0 ? (
              <div className="card-surface p-10 text-center">
                <h3 className="text-xl font-bold">No hay obras en esta categoría</h3>
                <p className="text-slate-600 mt-1">
                  Probá cambiando el filtro de arriba.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(it => (
                  <OwnerArtworkCard
                    key={it.id}
                    item={it}
                    onStats={()=>navigate(`/obra/${it.id}/estadisticas`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function OwnerArtworkCard({ item, onStats }){
  const sold = (item.fractionsTotal || 0) - (item.fractionsLeft || 0)
  const pct = item.fractionsTotal
    ? Math.round(sold / item.fractionsTotal * 100)
    : 0

  const statusConfig = {
    pending: { text: 'Pendiente', className: 'bg-amber-100 text-amber-700', title: 'Pendiente de aprobación' },
    approved: { text: 'Aprobado', className: 'bg-emerald-100 text-emerald-700', title: 'Aprobado' },
    rejected: { text: 'Rechazada', className: 'bg-red-100 text-red-700', title: 'Rechazada' },
    default: { text: item.status || 'Desconocido', className: 'bg-slate-100 text-slate-700', title: `Estado: ${item.status}` }
  }

  // El backend manda "Approved", "Pending", etc. Lo pasamos a lowercase para mapear.
  const currentStatus = statusConfig[item.status?.toLowerCase?.()] || statusConfig.default

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
          {new Date(item.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>

        {/* Solo mostramos barra si es tokenizada (tiene fracciones) */}
        {item.fractionsTotal ? (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Vendidas</span>
              <span>{sold}/{item.fractionsTotal} ({pct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-600">
            <span>Precio: ${Number(item.price || 0).toLocaleString('es-AR')}</span>
          </div>
        )}

        <div className="text-xs">
          <Link to={`/obra/${item.id}`} className="text-indigo-600 hover:underline">
            Ver obra
          </Link>
          {item.status?.toLowerCase?.() === 'pending' && (
            <span className="text-slate-500"> · (aún no visible en marketplace)</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Link
            to={`/publicar/${item.id}`}
            className="btn btn-outline w-full sm:w-1/2 rounded-xl text-center"
            title="Editar publicación"
          >
            Editar publicación
          </Link>
          <button
            onClick={onStats}
            className="btn btn-primary w-full sm:w-1/2 rounded-xl text-center"
          >
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

/* segmented control con 3 opciones */
function SegmentedControl({ value, onChange, options }){
  return (
    <div className="inline-flex rounded-xl border border-slate-300 bg-white/80 text-sm font-semibold overflow-hidden shadow-sm">
      {options.map((opt, idx) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={()=>onChange(opt.value)}
            className={[
              'px-4 py-2 whitespace-nowrap transition',
              active
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 hover:bg-white',
              idx !== options.length - 1 ? 'border-r border-slate-300' : ''
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
