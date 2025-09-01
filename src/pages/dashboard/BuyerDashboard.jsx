import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listArtworks } from '../../services/mockArtworks.js'
import ArtworkCard from '../../components/artworks/ArtworkCard.jsx'
import RecommendedRow from '../../components/artworks/RecommendedRow.jsx'

export default function BuyerDashboard(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('relevance')
  const [tag, setTag] = useState('')   // filtro por tag
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  useEffect(()=>{
    let alive = true
    setLoading(true)
    listArtworks({ q, sort }).then(data=>{
      if (!alive) return
      setItems(data)
      setLoading(false)
    })
    return ()=>{ alive = false }
  }, [q, sort])

  // filtrado por tag en cliente
  const viewItems = useMemo(()=>{
    if (!tag) return items
    return items.filter(x => x.tags.includes(tag))
  }, [items, tag])

  const empty = !loading && viewItems.length === 0

  // métricas para el hero
  const metrics = useMemo(()=>{
    const total = viewItems.length
    const artists = new Set(viewItems.map(i=>i.artist)).size
    const avg = viewItems.length ? (viewItems.reduce((a,c)=>a+c.rating,0)/viewItems.length).toFixed(1) : '–'
    return { total, artists, avg }
  }, [viewItems])

  const tags = ['Abstracto','Mixta','Paisaje','Urbano','Naturaleza','Geométrico','Impresionismo','Minimal','Tinta','Óleo','Acrílico']

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className='mt-8'>
        {/* NUEVO: Recomendados para el comprador */}
      <RecommendedRow />
      </div>
      
      {/* HERO */}
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="eyebrow">Marketplace</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Obras <span className="text-indigo-600">disponibles</span>
              </h1>
              <p className="lead mt-2 max-w-2xl">
                Descubrí piezas únicas y comprá fracciones desde valores accesibles.
              </p>
            </div>

            {/* métricas */}
            <div className="grid grid-cols-3 gap-4 min-w-[260px]">
              <Metric label="Obras" value={metrics.total}/>
              <Metric label="Artistas" value={metrics.artists}/>
              <Metric label="Rating prom." value={metrics.avg}/>
            </div>
          </div>

          {/* controles */}
          <div className="mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <input
                  className="input pr-10 w-72"
                  placeholder="Buscar por título, artista o tag…"
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon className="h-5 w-5"/>
                </span>
              </div>
              <select className="input w-48" value={sort} onChange={e=>setSort(e.target.value)}>
                <option value="relevance">Relevancia</option>
                <option value="newest">Más nuevas</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </div>

            {/* chips de categorías (scroll horizontal en mobile) */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <Chip label="Todas" active={!tag} onClick={()=>setTag('')}/>
              {tags.map(t => (
                <Chip key={t} label={t} active={tag===t} onClick={()=>setTag(t)}/>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* GRID */}
      <div className="section-frame pb-16">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({length:8}).map((_,i)=> <SkeletonCard key={i}/>)}
          </div>
        )}

        {empty && <EmptyState/>}

        {!loading && !empty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {viewItems.map(item => (
              <ArtworkCard
                key={item.id}
                item={item}
                onView={()=> navigate(`/obra/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* --- componentes auxiliares --- */
function Metric({ label, value }){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-center">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-[11px] tracking-wider uppercase text-slate-500">{label}</div>
    </div>
  )
}
function Chip({ label, active, onClick }){
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition
                  ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                           : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'}`}
    >
      {label}
    </button>
  )
}
function SkeletonCard(){
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
      <div className="aspect-[4/3] w-full animate-pulse bg-slate-200/70" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 bg-slate-200/70 animate-pulse rounded" />
        <div className="h-3 w-1/3 bg-slate-200/70 animate-pulse rounded" />
        <div className="mt-3 h-4 w-1/2 bg-slate-200/70 animate-pulse rounded" />
        <div className="h-3 w-2/5 bg-slate-200/70 animate-pulse rounded" />
        <div className="mt-3 h-9 w-full bg-slate-200/70 animate-pulse rounded-xl" />
      </div>
    </div>
  )
}
function EmptyState(){
  return (
    <div className="card-surface p-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-indigo-600/10 text-indigo-600">
        <SearchIcon className="h-6 w-6"/>
      </div>
      <h3 className="text-xl font-bold">No encontramos obras con ese criterio</h3>
      <p className="text-slate-600 mt-1">Probá quitar filtros o buscá por otro término.</p>
    </div>
  )
}
function SearchIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-3.5-3.5"/>
  </svg>
)}
