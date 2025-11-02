// src/pages/dashboard/BuyerDashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import authService from '../../services/authService.js'
import ArtworkCard from '../../components/artworks/ArtworkCard.jsx'
import RecommendedRow from '../../components/artworks/RecommendedRow.jsx'

/** Mapea el sort del UI al sort del backend */
const toApiSort = (ui) => {
  if (ui === 'newest') return 'newest'
  if (ui === 'price-asc') return 'price-asc'
  if (ui === 'price-desc') return 'price-desc'
  return undefined // 'relevance' -> orden por defecto del queryset
}

/** Corrige URLs con https%3A/ incrustado */
const fixImageUrl = (url) => {
  if (typeof url !== 'string') return url
  const marker = 'https%3A/'
  const idx = url.indexOf(marker)
  if (idx !== -1) return 'https://' + url.substring(idx + marker.length)
  return url
}

/** Normaliza para comparar (sin tildes, lowercase) */
const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Redondeo a 1 decimal (manteniendo número) */
const round1 = (n) => Math.round(Number(n || 0) * 10) / 10

/**
 * ¿Es venta directa?
 * - Usa el campo `venta_directa` del backend si viene presente (true/false, 1/0, 'true'/'false', '1'/'0').
 * - Solo si viene nulo/undefined aplica fallback heurístico.
 */
const detectDirect = (a) => {
  const vd = a?.venta_directa
  if (vd === true || vd === 1 || vd === '1' || vd === 'true') return true
  if (vd === false || vd === 0 || vd === '0' || vd === 'false') return false
  // Fallback SOLO si el backend no envió el campo
  const noFraction = a?.fractionFrom == null
  const noTotals   = a?.fractionsTotal == null
  return !!(noFraction && noTotals)
}

/** Normaliza un item de API al shape que espera ArtworkCard */
const mapApiItemToCard = (a) => {
  const isDirect = detectDirect(a)

  // Valores por defecto (tokenizadas)
  let fractionsTotal = Number(a.fractionsTotal || 0)
  let fractionsLeft  = a.fractionsLeft
  if (fractionsLeft == null) fractionsLeft = fractionsTotal
  let fractionFrom   = Number(a.fractionFrom || 0)

  // --- OVERRIDES UI: venta directa ---
  // Para venta directa ocultamos cualquier rastro de fracciones en la card:
  // - nada de “0% vendido” -> el componente no podrá calcular % si no hay totales
  // - nada de “Fracciones desde $ …” -> no enviamos fractionFrom
  // - nada de “Disponibles 1/1” -> no enviamos totals/left
  // Además mandamos un badge textual para que la card pueda mostrar “Disponible” si lo contempla.
  if (isDirect) {
    fractionsTotal = undefined
    fractionsLeft  = undefined
    fractionFrom   = undefined
  }

  return {
    id: a.id,
    title: a.title,
    artist: a.artist?.name || a.artist || '',
    price: Number(a.price || 0),          // precio final en venta directa
    fractionFrom: fractionFrom,           // undefined en directa -> oculta leyenda “Fracciones desde…”
    fractionsTotal: fractionsTotal,       // undefined en directa -> oculta % y “Disponibles”
    fractionsLeft: Number(fractionsLeft ?? 0),
    image: fixImageUrl(a.image),
    tags: Array.isArray(a.tags) ? a.tags : (a.tags ? [String(a.tags)] : []),
    rating: round1(a.rating?.avg),
    createdAt: a.createdAt,

    // Flags internos para lógicas de disponibilidad/badges
    __isDirect: isDirect,
    __estadoVenta: String(a.estado_venta || '').toLowerCase(),
    __status: String(a.status || '').toLowerCase(),

    // Sugerencia de badge para la UI (si el componente lo usa)
    __badge: isDirect ? 'Disponible' : undefined,
  }
}

/** Disponible en marketplace según reglas */
const isAvailable = (item) => {
  if (item.__status !== 'approved') return false
  if (item.__isDirect) {
    const sold = item.__estadoVenta === 'vendida' || item.sold === true
    return !sold
  }
  const left = item.fractionsLeft ?? 0
  return Number(left) > 0
}

export default function BuyerDashboard(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('relevance')
  const [tag, setTag] = useState('')
  const [sale, setSale] = useState('all') // 'all' | 'direct' | 'tokenized'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // --- NUEVO: estado para recomendadas ---
  const [recommended, setRecommended] = useState([])
  const [recLoading, setRecLoading] = useState(true)
  const [recError, setRecError] = useState('')
  // ---------------------------------------

  const user = useSelector(s => s.auth.user)
  const favKey = useMemo(()=> user?.id ? `fav_${user.id}` : 'fav_anon', [user?.id])
  const [favs, setFavs] = useState(new Set())

  const navigate = useNavigate()

  // cargar favoritos por usuario
  useEffect(()=>{
    try{
      const arr = JSON.parse(localStorage.getItem(favKey) || '[]')
      setFavs(new Set(arr))
    }catch{
      setFavs(new Set())
    }
  }, [favKey])

  const toggleFav = (artId)=>{
    setFavs(prev => {
      const next = new Set(prev)
      if(next.has(artId)) next.delete(artId)
      else next.add(artId)
      localStorage.setItem(favKey, JSON.stringify([...next]))
      return next
    })
  }

  // Fetch obras recomendadas (reemplaza contenido estático del carrusel superior)
  useEffect(()=>{
    let alive = true
    setRecLoading(true)
    setRecError('')

    authService.client
      .get('/artworks/recommended-by-performance/')
      .then(res => {
        if (!alive) return
        const payload = res?.data
        const list = Array.isArray(payload) ? payload
                  : Array.isArray(payload?.results) ? payload.results
                  : []
        const mapped = list
          .map(mapApiItemToCard)
          .filter(isAvailable)

        setRecommended(mapped)
      })
      .catch(err => {
        console.error('[BuyerDashboard] GET /artworks/recommended-by-performance/ error:', err?.response?.data || err.message)
        setRecError(err?.response?.data?.detail || err?.message || 'No se pudieron cargar las recomendaciones.')
        setRecommended([])
      })
      .finally(()=>{
        if (alive) setRecLoading(false)
      })

    return ()=>{ alive = false }
  }, []) // sólo al montar

  // Fetch desde API real (lista general / marketplace)
  useEffect(()=>{
    let alive = true
    setLoading(true)
    setError('')

    const params = {}
    if (q?.trim()) params.q = q.trim()
    const apiSort = toApiSort(sort)
    if (apiSort) params.sort = apiSort

    authService.client
      .get('/artworks/', { params })
      .then(res => {
        if (!alive) return
        const payload = res?.data
        const list = Array.isArray(payload) ? payload
                  : Array.isArray(payload?.results) ? payload.results
                  : []
        let mapped = list.map(mapApiItemToCard).filter(isAvailable)

        // Filtro por tipo de venta (UI)
        if (sale === 'direct') mapped = mapped.filter(x => x.__isDirect)
        if (sale === 'tokenized') mapped = mapped.filter(x => !x.__isDirect)

        // Filtro por tag (cliente)
        if (tag?.trim()) {
          const wanted = norm(tag)
          mapped = mapped.filter(it => (it.tags || []).some(t => norm(t) === wanted))
        }

        setItems(mapped)
      })
      .catch(err => {
        console.error('[BuyerDashboard] GET /artworks/ error:', err?.response?.data || err.message)
        setError(err?.response?.data?.detail || err?.message || 'No se pudieron cargar las obras.')
      })
      .finally(()=>{
        if (alive) setLoading(false)
      })

    return ()=>{ alive = false }
  }, [q, sort, tag, sale])

  const viewItems = items
  const empty = !loading && !error && viewItems.length === 0

  const metrics = useMemo(()=>{
    const total = viewItems.length
    const artists = new Set(viewItems.map(i=>i.artist)).size
    const avg = viewItems.length
      ? (viewItems.reduce((a,c)=>a + Number(c.rating || 0),0)/viewItems.length).toFixed(1)
      : '–'
    return { total, artists, avg }
  }, [viewItems])

  const tags = ['Abstracto','Mixta','Paisaje','Urbano','Naturaleza','Geométrico','Impresionismo','Minimal','Tinta','Óleo','Acrílico']

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className='mt-8'>
        <RecommendedRow
          items={recommended}
          loading={recLoading}
          error={recError}
          onView={id => navigate(`/obra/${id}`)}
          favs={favs}
          onToggleFav={toggleFav}
        />
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
                Descubrí piezas únicas y comprá fracciones o directamente la obra.
              </p>
            </div>

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

              {/* Filtro tipo de venta usando venta_directa */}
              <select className="input w-48" value={sale} onChange={e=>setSale(e.target.value)}>
                <option value="all">Todas</option>
                <option value="direct">Venta directa</option>
                <option value="tokenized">Tokenizadas</option>
              </select>
            </div>

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

        {!loading && error && (
          <div className="card-surface p-6 text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && viewItems.length === 0 && <EmptyState/>}

        {!loading && !error && viewItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {viewItems.map(item => (
              <ArtworkCard
                key={item.id}
                item={item}
                isFav={favs.has(item.id)}
                onToggleFav={()=>toggleFav(item.id)}
                onView={()=> navigate(`/obra/${item.id}`)}
                showShare={false}  // ⬅️ ocultar botón "Compartir"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* --- auxiliares --- */
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
