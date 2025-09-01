import { useState } from 'react'

export default function ArtworkCard({ item, onView }) {
  const [loaded, setLoaded] = useState(false)
  const FALLBACK =
    'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop'

  const soldOut = item.fractionsLeft === 0
  const soldPct = Math.round(100 - (item.fractionsLeft / item.fractionsTotal) * 100)
  const initials = item.artist.split(' ').map(s => s[0]).slice(0, 2).join('')

  return (
    <article className="group overflow-hidden rounded-3xl card-surface hover:shadow-2xl transition">
      {/* Imagen */}
      <div className="relative">
        {/* skeleton */}
        <div className={`aspect-[4/3] w-full bg-slate-200/70 ${loaded ? 'hidden' : 'animate-pulse'}`} />

        <img
          src={item.image}
          alt={item.title}
          decoding="async"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = FALLBACK
            setLoaded(true)
          }}
          className={`aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          {soldOut ? (
            <span className="rounded-full bg-slate-900/80 text-white text-xs px-3 py-1">Agotado</span>
          ) : (
            <span className="rounded-full bg-white/90 text-slate-900 text-xs px-3 py-1 shadow">
              {soldPct}% vendido
            </span>
          )}
        </div>
        {/* like */}
        <button
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 border border-slate-200 hover:bg-white"
          title="Agregar a favoritos"
        >
          <HeartIcon className="h-4 w-4" />
        </button>

        {/* overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>

      {/* contenido */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white text-xs font-bold">
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 leading-tight line-clamp-1">{item.title}</h3>
            <p className="text-xs text-slate-500">{item.artist}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-amber-500" title={`${item.rating} / 5`}>
            <StarIcon className="h-4 w-4" />
            <span className="text-xs font-semibold">{item.rating}</span>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Precio de referencia</div>
            <div className="text-lg font-extrabold">${fmt(item.price)}</div>
            <div className="text-xs text-slate-500">Fracciones desde ${fmt(item.fractionFrom)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Disponibles</div>
            <div className={`text-sm font-semibold ${soldOut ? 'text-red-600' : 'text-emerald-600'}`}>
              {item.fractionsLeft}/{item.fractionsTotal}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-700"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => onView?.(item)} className="btn btn-primary flex-1">
            Ver obra
          </button>
          <button className="btn btn-outline" title="Compartir">
            <ShareIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

function fmt(n) { return n.toLocaleString('es-AR') }

/* Icons */
function HeartIcon(props){ return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
</svg>)}
function StarIcon(props){ return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}>
  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
</svg>)}
function ShareIcon(props){ return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
  <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
</svg>)}
