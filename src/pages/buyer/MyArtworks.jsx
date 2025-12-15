// src/pages/buyer/MyArtworks.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import authService from '../../services/authService.js'

// -------- helpers ----------
const normalizeList = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.items)) return data.items
  return []
}

const coalesce = (obj, keys = []) => {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null) return v
  }
  return undefined
}

const toBool = (v) => {
  if (v === true || v === 1 || v === '1' || v === 'true') return true
  if (v === false || v === 0 || v === '0' || v === 'false') return false
  return Boolean(v)
}

// normaliza urls (cloudinary, encoded, relativas, etc.)
const getOriginFromAxios = () => {
  try {
    const base = authService?.client?.defaults?.baseURL
    if (!base) return ''
    return new URL(base).origin
  } catch {
    return ''
  }
}

const fixImageUrl = (url) => {
  if (typeof url !== 'string') return ''
  let u = url.trim()
  if (!u) return ''

  // caso encoded: "...https%3A/...."
  const marker = 'https%3A/'
  const idx = u.indexOf(marker)
  if (idx !== -1) return 'https://' + u.substring(idx + marker.length)

  // caso "https:/res.cloudinary..." (falta un slash)
  if (u.startsWith('https:/') && !u.startsWith('https://')) {
    u = 'https://' + u.slice('https:/'.length)
  }

  // caso protocol-relative: //res.cloudinary.com/...
  if (u.startsWith('//')) return 'https:' + u

  // caso relativa: /media/...
  if (u.startsWith('/')) {
    const origin = getOriginFromAxios()
    return origin ? `${origin}${u}` : u
  }

  return u
}

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function MyArtworks() {
  const user = useSelector(s => s.auth.user)

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        if (!user?.id) {
          if (alive) {
            setItems([])
            setError('Necesitás iniciar sesión para ver tus obras.')
          }
          return
        }

        const url = `/users/${user.id}/purchased-artworks/`
        console.log('[MyArtworks] GET', url)

        const res = await authService.client.get(url)
        console.log('[MyArtworks] RAW response:', res?.data)

        const list = normalizeList(res?.data)

        if (!alive) return
        setItems(list)
      } catch (e) {
        console.error('[MyArtworks] Error:', {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data
        })
        if (alive) {
          setItems([])
          setError('No se pudieron cargar tus obras. Intentá nuevamente.')
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [user?.id])

  const mapped = useMemo(() => {
    return items.map((raw) => {
      const ventaDirecta = toBool(coalesce(raw, ['venta_directa', 'ventaDirecta', 'directSale']))
      const artistObj = raw?.artist
      const artistName =
        typeof artistObj === 'string'
          ? artistObj
          : (artistObj?.name || raw?.artist_name || raw?.artistName || '—')

      const image = fixImageUrl(raw?.image)

      return {
        id: raw?.id,
        title: raw?.title || 'Obra',
        artist: artistName,
        image,
        ventaDirecta,
        createdAt: raw?.createdAt || raw?.created_at,
        status: raw?.status,
        estado_venta: raw?.estado_venta,
        price: raw?.price,
        fractionFrom: raw?.fractionFrom,
        fractionsTotal: raw?.fractionsTotal,
        fractionsLeft: raw?.fractionsLeft,
      }
    })
  }, [items])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-10 space-y-6">

        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <p className="eyebrow">Buyer</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mis obras</h1>
          <p className="lead text-slate-600 mt-1">
            Obras que compraste (venta directa o fracciones tokenizadas).
          </p>
        </div>

        {loading && (
          <div className="card-surface p-8 text-slate-600">
            Cargando tus obras…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error} {' '}
            {!user && <Link to="/login" className="underline font-semibold">Iniciar sesión</Link>}
          </div>
        )}

        {!loading && !error && mapped.length === 0 && (
          <div className="card-surface p-10 text-center">
            <h3 className="text-xl font-bold">Todavía no compraste obras</h3>
            <p className="text-slate-600 mt-1">Explorá el marketplace para adquirir una obra.</p>
            <div className="mt-4">
              <Link to="/comprar" className="btn btn-primary">Ir al marketplace</Link>
            </div>
          </div>
        )}

        {!loading && !error && mapped.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mapped.map(it => (
              <Link
                key={it.id}
                to={`/obra/${it.id}`}
                className="text-left overflow-hidden rounded-3xl border border-slate-200 bg-white/70 hover:shadow transition"
                title="Ver detalle"
              >
                <div className="aspect-[4/3] w-full bg-slate-100">
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={() => console.error('[MyArtworks] Image load error:', it.image)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold line-clamp-1">{it.title}</div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs shrink-0 ${
                        it.ventaDirecta
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                      title={it.ventaDirecta ? 'Venta directa' : 'Tokenizada'}
                    >
                      {it.ventaDirecta ? 'Directa' : 'Token'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 line-clamp-1">{it.artist}</div>

                  <div className="text-xs text-slate-500">
                    Comprada / registrada: {formatDate(it.createdAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Link to="/comprar" className="btn btn-outline">Volver al marketplace</Link>
        </div>

      </div>
    </section>
  )
}
