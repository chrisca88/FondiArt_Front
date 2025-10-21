// src/pages/admin/auctions/AuctionDetail.jsx
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../../utils/api.js'

export default function AuctionDetail(){
  const { id } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // (placeholder no editable por ahora)
  const [finalPrice, setFinalPrice] = useState('')
  const [ok] = useState(false)

  // edición de fecha de subasta
  const [auctionLocal, setAuctionLocal] = useState('')  // YYYY-MM-DDTHH:mm
  const [savingDate, setSavingDate] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  // ---------- BUSCADOR DE USUARIOS (GANADOR) ----------
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersErr, setUsersErr] = useState('')
  const [selectedWinner, setSelectedWinner] = useState(null) // { id, name, email }
  const debounceRef = useRef(null)

  async function searchUsers(q){
    if (!q || q.trim().length < 2){
      setUserResults([])
      setUsersErr('')
      return
    }
    setUsersLoading(true)
    setUsersErr('')
    try{
      // 1) Intento con query server-side (?search=)
      const withSearch = `/api/v1/users/?search=${encodeURIComponent(q.trim())}`
      console.log('[AuctionDetail][USERS][GET]', withSearch)
      let res = await api.get(withSearch)

      // si el back no soporta search y devuelve 404/400, lo tratamos en catch
      let payload = res?.data
      let list = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])
      // 2) Si vino todo sin search o vino vacío, intento sin filtro y filtro en cliente
      if (!Array.isArray(list) || list.length === 0){
        const fallbackUrl = '/api/v1/users/'
        console.log('[AuctionDetail][USERS][FALLBACK] GET', fallbackUrl)
        res = await api.get(fallbackUrl)
        payload = res?.data
        const all = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])
        list = all.filter(u => String(u?.name || '').toLowerCase().includes(q.trim().toLowerCase()))
      }

      console.log('[AuctionDetail][USERS][OK] total=', list.length, 'sample=', list.slice(0,3))
      setUserResults(list)
    }catch(e){
      console.error('[AuctionDetail][USERS][ERROR]', e?.response?.status, e?.response?.data || e?.message)
      setUsersErr('No se pudieron cargar usuarios.')
      setUserResults([])
    }finally{
      setUsersLoading(false)
    }
  }

  // debounce al tipear
  useEffect(()=>{
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(()=> searchUsers(userQuery), 300)
    return ()=> clearTimeout(debounceRef.current)
  }, [userQuery])
  // -----------------------------------------------------

  // --- helpers fecha ---
  function toLocalInputValue(iso){
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d)) return ''
    const pad = n => String(n).padStart(2,'0')
    const yyyy = d.getFullYear()
    const mm   = pad(d.getMonth()+1)
    const dd   = pad(d.getDate())
    const hh   = pad(d.getHours())
    const mi   = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }
  function localToIsoZ(localStr){
    if (!localStr) return null
    const d = new Date(localStr)
    if (isNaN(d)) return null
    return d.toISOString().slice(0,19) + 'Z'
  }

  // Normalizador de URLs de imagen (evita prefijos indeseados)
  const normalizeImageUrl = (u) => {
    if (!u || typeof u !== 'string') return ''
    const httpsMarker = 'https%3A/'
    const httpMarker  = 'http%3A/'
    if (u.includes(httpsMarker)) return 'https://' + u.substring(u.indexOf(httpsMarker) + httpsMarker.length)
    if (u.includes(httpMarker))  return 'http://'  + u.substring(u.indexOf(httpMarker) + httpMarker.length)
    if (/^https?:\/\//i.test(u)) return u
    if (u.startsWith('/')) {
      const base = (api?.defaults?.baseURL || '').replace(/\/$/, '')
      const out = base + u
      console.log('[AuctionDetail][IMG] relative→absolute', { in: u, out })
      return out
    }
    return u
  }

  // --- función reutilizable para obtener el detalle ---
  async function fetchDetail(aliveRef = { current: true }) {
    const endpoint = `/api/v1/auctions/${id}/`
    const base = api?.defaults?.baseURL
    const auth = api?.defaults?.headers?.Authorization || api?.defaults?.headers?.common?.Authorization
    console.log('[AuctionDetail][FETCH-DETAIL] GET', { endpoint, baseURL: base, hasAuth: !!auth, id })

    try {
      const res = await api.get(endpoint)
      if (!aliveRef.current) return
      const item = res?.data

      console.log('[AuctionDetail][FETCH-DETAIL][OK] status=', res?.status)
      console.log('[AuctionDetail][FETCH-DETAIL][DATA] keys=', item ? Object.keys(item) : '(null)')
      console.log('[AuctionDetail][FETCH-DETAIL][ForFilters]', {
        id: item?.id,
        status: item?.status,           // 'upcoming' | 'finished' | 'cancelled'
        auction_date: item?.auction_date,
        artwork_title: item?.artwork_title,
        artist_name: item?.artist_name
      })

      setData(item || null)
      setFinalPrice(item?.final_price || '')
      setAuctionLocal(toLocalInputValue(item?.auction_date))

      // si la subasta ya tuviera buyer, podrías precargarlo como seleccionado (opcional)
      // setSelectedWinner(item?.buyer ? { id: item.buyer_id, name: item.buyer, email: '' } : null)

      setLoading(false)
    } catch (e) {
      if (!aliveRef.current) return
      const payload = e?.response?.data
      console.error('[AuctionDetail][FETCH-DETAIL][ERROR]', {
        status: e?.response?.status,
        payload,
        message: e?.message
      })
      setErr(payload?.detail || payload?.message || e?.message || 'No se pudo cargar la subasta')
      setLoading(false)
    }
  }

  // --- FETCH de DETALLE ---
  useEffect(()=> {
    let alive = { current: true }
    setLoading(true)
    setErr(null)
    fetchDetail(alive)
    return ()=> { alive.current = false }
  }, [id])

  // --- FETCH de LISTADO (solo para LOGS de filtros) ---
  useEffect(()=> {
    let alive = true
    const listEndpoint = '/api/v1/auctions/'
    console.log('[AuctionDetail][FETCH-LIST] GET', listEndpoint)

    api.get(listEndpoint)
      .then(res => {
        if (!alive) return
        const payload = res?.data
        const results = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])
        const buckets = results.reduce((acc, x) => {
          const k = (x?.status ?? '(sin status)')
          acc[k] = (acc[k] || 0) + 1
          return acc
        }, {})
        console.log('[AuctionDetail][FETCH-LIST][OK]', {
          httpStatus: res?.status,
          total_from_count: payload?.count,
          results_len: results.length,
          buckets_by_status: buckets,
          expected_statuses: ['upcoming', 'finished', 'cancelled']
        })
      })
      .catch(e => {
        const payload = e?.response?.data
        console.error('[AuctionDetail][FETCH-LIST][ERROR]', {
          status: e?.response?.status,
          payload,
          message: e?.message
        })
      })

    return () => { alive = false }
  }, [])

  const isAuctioned = data?.status === 'auctioned'

  // Compat (si hubiera datos legacy en otros entornos)
  const auctionDateText = useMemo(()=> {
    const iso = data?.auctionDate
    if (!iso) return null
    const [yyyy, mm, dd] = String(iso).split('-')
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`
    try { return new Date(iso).toLocaleDateString('es-AR') } catch { return String(iso) }
  }, [data?.auctionDate])

  const canCloseToday = useMemo(()=> {
    const iso = String(data?.auctionDate || '')
    if (!iso) return false
    const today = new Date().toISOString().slice(0,10)
    return today >= iso
  }, [data?.auctionDate])

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

  if (loading) {
    console.log('[AuctionDetail] UI loading…')
    return (
      <section className="section-frame py-16">
        <Skeleton/>
      </section>
    )
  }

  if (err) {
    console.warn('[AuctionDetail] UI error:', err)
    return (
      <section className="section-frame py-16">
        <div className="card-surface p-8 text-center">
          <h3 className="text-xl font-bold">Error</h3>
          <p className="text-slate-600 mt-1">{err}</p>
          <div className="mt-4"><Link to="/admin/subastas" className="btn btn-primary">Volver</Link></div>
        </div>
      </section>
    )
  }

  if (!data) {
    console.warn('[AuctionDetail] UI sin data (null)')
    return (
      <section className="section-frame py-16">
        <div className="card-surface p-8 text-center">
          <h3 className="text-xl font-bold">Sin datos</h3>
          <p className="text-slate-600 mt-1">No se encontró información de la subasta.</p>
          <div className="mt-4"><Link to="/admin/subastas" className="btn btn-primary">Volver</Link></div>
        </div>
      </section>
    )
  }

  // Campos defensivos
  const artworkTitle = data.artwork_title || data.title || 'Obra'
  const artistName   = data.artist_name || 'Artista'
  const status       = data.status || '—'   // 'upcoming' | 'finished' | 'cancelled'
  const auctionDate  = data.auction_date ? new Date(data.auction_date) : null

  // Guardar nueva fecha de subasta (FIX: merge + refetch)
  const onSaveAuctionDate = async () => {
    setSaveErr('')
    setSaveOk(false)
    const isoZ = localToIsoZ(auctionLocal)
    if (!isoZ) { setSaveErr('Elegí una fecha y hora válidas.'); return }
    setSavingDate(true)

    console.log('[AuctionDetail][PATCH] /api/v1/auctions/%s/ body=', id, { auction_date: isoZ })

    try{
      const { data: updatedPartial } = await api.patch(`/api/v1/auctions/${id}/`, { auction_date: isoZ })
      console.log('[AuctionDetail][PATCH][OK] partial keys=', updatedPartial ? Object.keys(updatedPartial) : '(null)')
      setData(prev => ({ ...(prev || {}), ...(updatedPartial || {}) }))
      setAuctionLocal(toLocalInputValue((updatedPartial && updatedPartial.auction_date) || (data && data.auction_date)))
      setSaveOk(true)

      // Re-fetch para garantizar objeto completo
      setTimeout(() => {
        let aliveRef = { current: true }
        fetchDetail(aliveRef)
      }, 0)
    }catch(e){
      const payload = e?.response?.data
      console.error('[AuctionDetail][PATCH][ERROR]', {
        status: e?.response?.status,
        payload,
        message: e?.message
      })
      setSaveErr(payload?.detail || payload?.auction_date || payload?.message || e?.message || 'No se pudo actualizar la fecha.')
    }finally{
      setSavingDate(false)
    }
  }

  // Log final
  console.log('[AuctionDetail][RENDER]', {
    id,
    status,
    hasImage: !!(data.artwork_image || data.image),
    auction_date: data.auction_date,
    auctionLocal,
    selectedWinner
  })

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/admin" className="hover:underline">Admin</Link>
          <span className="mx-2">/</span>
          <Link to="/admin/subastas" className="hover:underline">Subastas</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">{artworkTitle}</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Imagen */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white/60">
              <img
                src={normalizeImageUrl(data.artwork_image || data.image || '')}
                alt={artworkTitle}
                className="w-full aspect-[4/3] object-cover"
                loading="eager"
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Sin+imagen' }}
              />
            </div>
          </div>

          {/* Panel */}
          <aside className="lg:col-span-2">
            <div className="card-surface p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold leading-tight">{artworkTitle}</h1>
                  <p className="text-slate-600">{artistName}</p>
                  <div className="text-sm text-slate-700 mt-1">
                    <strong>Fecha de subasta:</strong>{' '}
                    {auctionDate ? auctionDate.toLocaleString('es-AR') : '—'}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                  status === 'finished' ? 'bg-emerald-100 text-emerald-700'
                    : status === 'cancelled' ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {status}
                </span>
              </div>

              {/* Cambiar fecha de subasta */}
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                <label className="form-label" htmlFor="auctionLocal">Nueva fecha/hora de subasta</label>
                <input
                  id="auctionLocal"
                  type="datetime-local"
                  className="input"
                  value={auctionLocal}
                  onChange={(e)=>setAuctionLocal(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Al guardar, se actualizará el campo <code>auction_date</code>.
                </p>
                {saveErr && <div className="text-sm text-red-600 mt-2">{saveErr}</div>}
                {saveOk &&  <div className="text-sm text-emerald-700 mt-2">¡Fecha de subasta actualizada!</div>}
                <button
                  type="button"
                  className="btn btn-primary w-full mt-3 disabled:opacity-60"
                  onClick={onSaveAuctionDate}
                  disabled={savingDate || !auctionLocal}
                >
                  {savingDate ? 'Guardando…' : 'Guardar fecha de subasta'}
                </button>
              </div>

              {/* Ganador: selector por búsqueda */}
              {status !== 'finished' && (
                <>
                  <div>
                    <label className="form-label" htmlFor="winnerSearch">Buscar ganador (usuario)</label>
                    <input
                      id="winnerSearch"
                      className="input"
                      placeholder="Escribí al menos 2 letras del nombre…"
                      value={userQuery}
                      onChange={(e)=>{ setUserQuery(e.target.value); setSelectedWinner(null) }}
                    />
                    {usersLoading && <div className="text-xs text-slate-500 mt-1">Buscando usuarios…</div>}
                    {usersErr && <div className="text-sm text-red-600 mt-1">{usersErr}</div>}

                    {/* Resultados */}
                    {userResults.length > 0 && (
                      <ul className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white/90 divide-y">
                        {userResults.map(u => (
                          <li
                            key={u.id}
                            className="px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center gap-3"
                            onClick={()=>{ setSelectedWinner({ id: u.id, name: u.name, email: u.email }); setUserQuery(u.name); setUserResults([]) }}
                          >
                            <img
                              src={u.avatarUrl || 'https://via.placeholder.com/32?text=U'}
                              alt={u.name}
                              className="h-8 w-8 rounded-full object-cover"
                              onError={(e)=>{ e.currentTarget.src='https://via.placeholder.com/32?text=U' }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{u.name}</div>
                              <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Selección */}
                    {selectedWinner && (
                      <div className="mt-2 text-sm text-emerald-700">
                        Seleccionado: <strong>{selectedWinner.name}</strong> <span className="text-slate-500">({selectedWinner.id})</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Guardaremos el <code>id</code> del usuario ganador cuando implementemos el cierre de subasta.
                    </p>
                  </div>

                  <div>
                    <label className="form-label">Precio final de subasta (ARS)</label>
                    <input
                      type="number"
                      className="input"
                      min={0}
                      placeholder="Ej. 150000"
                      value={finalPrice}
                      onChange={(e)=>setFinalPrice(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary w-full" onClick={()=>{
                    console.log('[AuctionDetail][CLOSE_AUCTION][PENDING_IMPL]', {
                      auction_id: id,
                      winner_user_id: selectedWinner?.id,
                      winner_name: selectedWinner?.name,
                      final_price: finalPrice
                    })
                    alert('Acción de cierre pendiente de implementación en el backend.\nRevisa la consola para ver el payload que se enviaría.')
                  }}>
                    Marcar como subastada
                  </button>
                </>
              )}

              {status === 'finished' && (
                <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm">
                  <div><strong>Ganador:</strong> {data.buyer || (selectedWinner?.name ?? '—')}</div>
                  <div><strong>Precio final:</strong> ${Number(data.final_price||finalPrice||0).toLocaleString('es-AR')}</div>
                </div>
              )}

              <Link to="/admin/subastas" className="btn btn-outline w-full">Volver</Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal éxito (reservado para futuros flujos) */}
      {ok && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">✓</div>
            <h3 className="text-lg font-bold">Subasta registrada</h3>
            <p className="text-slate-700 mt-1">La obra quedó marcada como subastada y ya no aparecerá en el marketplace.</p>
            <button className="btn btn-primary mt-5 w-full" onClick={()=>navigate('/admin/subastas', { replace: true })}>Aceptar</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Skeleton(){
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="aspect-[4/3] w-full rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="h-40 rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="h-32 rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
    </div>
  )
}
