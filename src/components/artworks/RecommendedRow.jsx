// src/components/artworks/RecommendedRow.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { listArtworks } from '../../services/mockArtworks.js'

export default function RecommendedRow() {
  const user = useSelector(s => s.auth.user)
  const isBuyer = !!user && user.role === 'buyer'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listArtworks({ sort: 'relevance' }).then(data => {
      if (!alive) return
      setItems(data)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // Recomendadas: mejor rating con disponibilidad (máx. 5)
  const recommended = useMemo(() => {
    return items
      .filter(x => (x.fractionsLeft ?? 0) > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
  }, [items])

  if (!isBuyer) return null
  if (!loading && recommended.length === 0) return null

  return (
    <div className="section-frame pb-4">
      {/* Oculta la scrollbar nativa del carrusel */}
      <style>{`
        .reco-scroller { scrollbar-width: none; -ms-overflow-style: none; }
        .reco-scroller::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-50" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Para vos</p>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Obras <span className="text-indigo-600">recomendadas</span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Basado en el <span className="font-medium">rating</span> y la disponibilidad.
            </p>
          </div>
          <ScrollerControls />
        </div>

        <Strip loading={loading} items={recommended} />
      </div>
    </div>
  )
}

/* ---------- Tira con paginación por puntos ---------- */
function Strip({ loading, items }) {
  const scrollerRef = useRef(null)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(0)
  const pageWidthRef = useRef(1)
  const visiblePerPageRef = useRef(1)

  const computeLayout = () => {
    const el = scrollerRef.current
    if (!el) return
    const cards = el.querySelectorAll('[data-card]')
    if (!cards.length) { setPageCount(1); setPage(0); return }

    const first = cards[0]
    const second = cards[1]
    const cardW = first.getBoundingClientRect().width
    const firstLeft = first.offsetLeft
    const gap = second ? Math.max(0, second.offsetLeft - (firstLeft + cardW)) : 12

    const unit = cardW + gap
    const visible = Math.max(1, Math.floor(el.clientWidth / unit))

    visiblePerPageRef.current = visible
    pageWidthRef.current = visible * unit

    const count = Math.max(1, Math.ceil(cards.length / visible))
    setPageCount(count)
    setPage(p => Math.min(p, count - 1))
  }

  useEffect(() => {
    computeLayout()
    const ro = new ResizeObserver(() => computeLayout())
    if (scrollerRef.current) ro.observe(scrollerRef.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items.length])

  // Sincroniza el punto activo al hacer scroll manual
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth
      const x = el.scrollLeft
      const eps = 6 // tolerancia por redondeos

      let nextPage
      if (x <= eps) {
        nextPage = 0
      } else if (x >= max - eps) {
        nextPage = pageCount - 1
      } else {
        const width = pageWidthRef.current || el.clientWidth
        nextPage = Math.round(x / width)
        nextPage = Math.max(0, Math.min(pageCount - 1, nextPage))
      }

      if (nextPage !== page) setPage(nextPage)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [page, pageCount])

  // Navegación por flechas (eventos)
  useEffect(() => {
    const goTo = (p) => {
      const el = scrollerRef.current
      if (!el) return
      const next = Math.max(0, Math.min(pageCount - 1, p))
      setPage(next)
      const max = el.scrollWidth - el.clientWidth
      const left = next === pageCount - 1 ? max : next * pageWidthRef.current
      el.scrollTo({ left, behavior: 'smooth' })
    }
    const onLeft = () => goTo(page - 1)
    const onRight = () => goTo(page + 1)

    window.addEventListener('recos:left', onLeft)
    window.addEventListener('recos:right', onRight)
    return () => {
      window.removeEventListener('recos:left', onLeft)
      window.removeEventListener('recos:right', onRight)
    }
  }, [page, pageCount])

  // Click en un punto
  const selectPage = (p) => {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.max(0, Math.min(pageCount - 1, p))
    setPage(next)
    const max = el.scrollWidth - el.clientWidth
    const left = next === pageCount - 1 ? max : next * pageWidthRef.current
    el.scrollTo({ left, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <>
        <div
          ref={scrollerRef}
          className="reco-scroller mt-4 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
        >
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <Dots count={5} current={0} onSelect={() => {}} />
      </>
    )
  }

  return (
    <>
      <div
        ref={scrollerRef}
        className="reco-scroller mt-4 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
      >
        {items.map(item => <MiniArtworkCard key={item.id} item={item} />)}
      </div>
      <Dots count={pageCount} current={page} onSelect={selectPage} />
    </>
  )
}

function Dots({ count, current, onSelect }) {
  if (count <= 1) return null
  return (
    <div className="mt-3 flex justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={`Ir a la página ${i + 1}`}
          className={`h-2.5 w-2.5 rounded-full transition ${
            i === current ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-slate-400'
          }`}
        />
      ))}
    </div>
  )
}

function ScrollerControls() {
  return (
    <div className="hidden md:flex items-center gap-2">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('recos:left'))}
        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('recos:right'))}
        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label="Siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ---------- Card compacta ---------- */
function MiniArtworkCard({ item }) {
  const sold = (item.fractionsTotal || 0) - (item.fractionsLeft || 0)
  const pct = Math.round(sold / (item.fractionsTotal || 1) * 100)

  return (
    <div
      data-card
      className="snap-start w-[210px] sm:w-[230px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/70 hover:shadow-sm transition"
    >
      <div className="relative">
        <img
          src={item.image}
          alt={item.title}
          className="aspect-[3/2] w-full object-cover"
          loading="lazy"
        />
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
          {pct}% vendido
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">
            {item.artist.split(' ').map(s => s[0]).slice(0,2).join('')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{item.title}</div>
            <div className="text-[11px] text-slate-600 truncate">{item.artist}</div>
          </div>
          <div className="ml-auto flex items-center gap-0.5 text-amber-500">
            <StarFill className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold">{(item.rating || 0).toFixed(1)}</span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Precio ref.</div>
            <div className="font-extrabold">${fmt(item.price)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Desde</div>
            <div className="font-extrabold">${fmt(item.fractionFrom)}</div>
          </div>
        </div>

        <div className="mt-1.5">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Disponibles</span><span>{item.fractionsLeft}/{item.fractionsTotal}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {(item.tags || []).slice(0, 1).map(t => (
            <span key={t} className="rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] text-slate-700">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-2">
          <Link to={`/obra/${item.id}`} className="btn btn-primary w-full text-sm py-2">
            Ver obra
          </Link>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="snap-start w-[210px] sm:w-[230px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/70">
      <div className="aspect-[3/2] w-full animate-pulse bg-slate-200/70" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 w-2/3 bg-slate-200/70 animate-pulse rounded" />
        <div className="h-3 w-1/3 bg-slate-200/70 animate-pulse rounded" />
        <div className="mt-2 h-3.5 w-1/2 bg-slate-200/70 animate-pulse rounded" />
        <div className="h-3 w-2/5 bg-slate-200/70 animate-pulse rounded" />
        <div className="mt-2 h-8 w-full bg-slate-200/70 animate-pulse rounded-xl" />
      </div>
    </div>
  )
}

/* ---------- Iconos ---------- */
function ChevronLeft(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)}
function ChevronRight(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)}
function StarFill(props){ return (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
)}
function fmt(n){ return Number(n || 0).toLocaleString('es-AR') }
