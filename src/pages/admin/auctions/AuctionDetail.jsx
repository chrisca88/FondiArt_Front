// src/pages/admin/auctions/AuctionDetail.jsx 
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import api from '../../../utils/api.js'

export default function AuctionDetail(){
  const { id } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()
  const location = useLocation()

  // ----------------------- HOOKS (todas arriba) -----------------------
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

  // BUSCADOR DE USUARIOS (GANADOR)
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersErr,  setUsersErr] = useState('')
  const [selectedWinner, setSelectedWinner] = useState(null) // { id, name, email, dni }
  const debounceRef = useRef(null)

  // Datos del ganador cuando la subasta ya está finalizada en el backend
  const [winnerUser, setWinnerUser] = useState(null) // {id,name,email,dni,avatarUrl}

  // ESTADO para cerrar subasta
  const [closing, setClosing] = useState(false)
  const [closeErr, setCloseErr] = useState('')
  const [closeOk, setCloseOk] = useState(false)
  // -------------------------------------------------------------------

  // ✅ Placeholder embebido (evita via.placeholder.com)
  const FALLBACK_IMG =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <rect width="100%" height="100%" fill="#f1f5f9"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial, sans-serif" font-size="28" fill="#64748b">
          Sin imagen
        </text>
      </svg>
    `)

  // ✅ Avatar genérico embebido (evita via.placeholder.com)
  const GENERIC_AVATAR =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="100%" height="100%" rx="32" ry="32" fill="#e2e8f0"/>
        <circle cx="32" cy="26" r="12" fill="#94a3b8"/>
        <path d="M12 56c4-12 16-16 20-16s16 4 20 16" fill="#94a3b8"/>
      </svg>
    `)

  async function searchUsers(q){
    const term = (q || '').trim().toLowerCase()
    if (term.length < 2){
      setUserResults([])
      setUsersErr('')
      return
    }
    setUsersLoading(true)
    setUsersErr('')
    try{
      // Intento server-side search
      const withSearch = `users/?search=${encodeURIComponent(term)}`
      console.log('[AuctionDetail][USERS][GET]', withSearch)
      let res = await api.get(withSearch)
      let payload = res?.data
      let list = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])

      // Si el back no filtra, traigo todo y filtro local
      if (!Array.isArray(list) || list.length === 0){
        const fallbackUrl = 'users/'
        console.log('[AuctionDetail][USERS][FALLBACK] GET', fallbackUrl)
        res = await api.get(fallbackUrl)
        payload = res?.data
        list = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])
      }

      const filtered = (list || []).filter(u =>
        String(u?.name || '').toLowerCase().includes(term)
      ).slice(0, 12)

      console.log('[AuctionDetail][USERS][OK] total=', filtered.length, 'sample=', filtered.slice(0,3))
      setUserResults(filtered)
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

  // ✅ Normalizador de URLs de imagen (corrige https:/ y http:/, encoded y relativas)
  const normalizeImageUrl = (u) => {
    if (!u || typeof u !== 'string') return ''
    let out = u.trim()
    if (!out) return ''

    const httpsMarker = 'https%3A/'
    const httpMarker  = 'http%3A/'

    if (out.includes(httpsMarker)) out = 'https://' + out.substring(out.indexOf(httpsMarker) + httpsMarker.length)
    else if (out.includes(httpMarker)) out = 'https://' + out.substring(out.indexOf(httpMarker) + httpMarker.length)

    // ✅ caso "https:/res.cloudinary..." (falta un slash)
    if (out.startsWith('https:/') && !out.startsWith('https://')) {
      out = 'https://' + out.slice('https:/'.length)
    }
    // ✅ caso "http:/..." (por las dudas)
    if (out.startsWith('http:/') && !out.startsWith('http://')) {
      out = 'https://' + out.slice('http:/'.length)
    }

    if (/^https?:\/\//i.test(out)) return out

    if (out.startsWith('/')) {
      const base = (api?.defaults?.baseURL || '').replace(/\/$/, '')
      return base + out
    }

    return out
  }

  // ✅ Avatar: si no hay avatar -> genérico embebido; si hay -> url normalizada
  const getAvatarSrc = (u) => {
    const raw =
      u?.avatarUrl ??
      u?.avatar_url ??
      u?.avatar ??
      u?.image ??
      u?.photo ??
      ''
    const fixed = normalizeImageUrl(typeof raw === 'string' ? raw : '')
    return fixed || GENERIC_AVATAR
  }

  // ✅ Si venís desde una card que sí tenía imagen, la tomamos como fallback
  const passedImage =
    location?.state?.artwork_image ||
    location?.state?.image ||
    location?.state?.imgSrc ||
    ''

  // --- función reutilizable para obtener el detalle ---
  async function fetchDetail(aliveRef = { current: true }) {
    const endpoint = `auctions/${id}/`
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
        status: item?.status,
        auction_date: item?.auction_date,
        artwork_title: item?.artwork_title,
        artist_name: item?.artist_name
      })

      setData(item || null)
      setFinalPrice(item?.final_price || '')
      setAuctionLocal(toLocalInputValue(item?.auction_date))

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

  // Si viene finalizada, intento traer info del comprador para mostrar DNI
  useEffect(()=>{
    async function fetchWinner(){
      if (!data) return
      if (data.status !== 'finished') { setWinnerUser(null); return }
      const buyerId = data?.buyer_id || (typeof data?.buyer === 'number' ? data.buyer : null)
      if (!buyerId) return
      try{
        console.log('[AuctionDetail][WINNER][LOOKUP] GET /api/v1/users/')
        const res = await api.get('users/')
        const list = Array.isArray(res?.data?.results) ? res.data.results : (Array.isArray(res?.data) ? res.data : [])
        const found = list.find(u => Number(u.id) === Number(buyerId))
        if (found) {
          setWinnerUser(found)
          console.log('[AuctionDetail][WINNER][FOUND]', { id: found.id, name: found.name, dni: found.dni })
        }
      }catch(e){
        console.error('[AuctionDetail][WINNER][ERROR]', e?.response?.status, e?.response?.data || e?.message)
      }
    }
    fetchWinner()
  }, [data])

  // --- FETCH de LISTADO (solo para LOGS de filtros) ---
  useEffect(()=> {
    let alive = true
    const listEndpoint = 'auctions/'
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

  // ----------------------- EARLY RETURNS (después de hooks) -----------------------
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
  // -------------------------------------------------------------------------------

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
      const { data: updatedPartial } = await api.patch(`auctions/${id}/`, { auction_date: isoZ })
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

  // --------- 🔁 NUEVO FLUJO COMPLETO DE CIERRE ---------
  async function onCloseAuction(){
    setCloseErr('')
    setCloseOk(false)

    // Validaciones básicas
    if (!selectedWinner?.id){
      setCloseErr('Seleccioná un usuario ganador.')
      return
    }
    const priceNumber = Number(finalPrice)
    if (!isFinite(priceNumber) || priceNumber <= 0){
      setCloseErr('Ingresá un precio final válido.')
      return
    }

    // Intentamos identificar la obra para liquidar
    const artworkIdForLiquidation =
      data?.artwork_id ??
      data?.artwork ??
      data?.id

    if (!artworkIdForLiquidation){
      setCloseErr('No se pudo identificar la obra para liquidar.')
      return
    }

    setClosing(true)

    try {
      // 1. Chequear fondos del ganador
      const checkBody = {
        user_id: selectedWinner.id,
        amount: priceNumber
      }
      console.log('[AuctionDetail][CHECK-FUNDS][POST] /api/v1/finance/check-funds/', checkBody)

      const checkRes = await api.post('finance/check-funds/', checkBody)

      const hasFunds = (typeof checkRes?.data === 'object')
        ? !!checkRes?.data?.has_sufficient_funds
        : !!checkRes?.data

      if (!hasFunds){
        console.warn('[AuctionDetail][CHECK-FUNDS][FAIL] Fondos insuficientes')
        setCloseErr('El usuario ganador no tiene fondos suficientes. No se puede marcar como subastada.')
        return
      }

      // 2. Transferir el dinero del ganador al admin
      const transferBody = {
        user_id: selectedWinner.id,
        amount: priceNumber.toFixed(2)
      }
      console.log('[AuctionDetail][TRANSFER][POST] /api/v1/finance/transfer-to-admin/', transferBody)

      const transferRes = await api.post('finance/transfer-to-admin/', transferBody)
      console.log('[AuctionDetail][TRANSFER][OK]', transferRes?.data)

      // 3. Liquidar la obra entre los dueños
      const liquidateBody = {
        artwork_id: artworkIdForLiquidation,
        total_amount: priceNumber.toFixed(2)
      }
      console.log('[AuctionDetail][LIQUIDATE][POST] /api/v1/finance/liquidate-artwork/', liquidateBody)

      const liquidateRes = await api.post('finance/liquidate-artwork/', liquidateBody)
      console.log('[AuctionDetail][LIQUIDATE][OK]', liquidateRes?.data)

      // 4. Marcar la subasta como finalizada
      const payload = {
        buyer: selectedWinner.id,
        final_price: priceNumber.toFixed(2),
        status: 'finished',
      }
      console.log('[AuctionDetail][CLOSE-AUCTION][PATCH] /api/v1/auctions/%s/ body=', id, payload)

      const { data: updatedPartial } = await api.patch(`auctions/${id}/`, payload)
      console.log('[AuctionDetail][CLOSE-AUCTION][OK] partial keys=', updatedPartial ? Object.keys(updatedPartial) : '(null)')

      setData(prev => ({ ...(prev || {}), ...(updatedPartial || {}) }))
      setCloseOk(true)

      // Re-fetch para objeto completo y estado actualizado
      await fetchDetail({ current: true })
      setWinnerUser(selectedWinner)

    } catch(e){
      const p = e?.response?.data
      console.error('[AuctionDetail][CLOSE-AUCTION][ERROR]', e?.response?.status, p || e?.message)
      setCloseErr(
        p?.detail ||
        p?.message ||
        e?.message ||
        'No se pudo cerrar la subasta.'
      )
    } finally {
      setClosing(false)
    }
  }
  // ---------------------------------------------------------------------------

  // Log final
  console.log('[AuctionDetail][RENDER]', {
    id,
    status,
    hasImage: !!(data.artwork_image || data.image),
    auction_date: data.auction_date,
    auctionLocal,
    selectedWinner,
    winnerUser
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
                src={normalizeImageUrl(data.artwork_image || data.image || passedImage || '')}
                alt={artworkTitle}
                className="w-full aspect-[4/3] object-cover"
                loading="eager"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG }}
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
                  {status === 'finished' ? 'Finalizada' : status}
                </span>
              </div>

              {status !== 'finished' && (
                <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                  <label className="form-label" htmlFor="auctionLocal">Nueva fecha/hora de subasta</label>
                  <input
                    id="auctionLocal"
                    type="datetime-local"
                    className="input"
                    value={auctionLocal}
                    onChange={(e)=>setAuctionLocal(e.target.value)}
                  />
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
              )}

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

                    {userResults.length > 0 && (
                      <ul className="mt-2 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white/90 divide-y">
                        {userResults.map(u => (
                          <li
                            key={u.id}
                            className="px-3 py-2 cursor-pointer hover:bg-slate-50 flex items-center gap-3"
                            onClick={()=>{ setSelectedWinner({ id: u.id, name: u.name, email: u.email, dni: u.dni }); setUserQuery(u.name); setUserResults([]) }}
                          >
                            <img
                              src={getAvatarSrc(u)}
                              alt={u.name}
                              className="h-8 w-8 rounded-full object-cover"
                              onError={(e)=>{ e.currentTarget.src = GENERIC_AVATAR }}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {u.name} {u.dni ? <span className="text-xs text-slate-500">(DNI: {u.dni})</span> : null}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {selectedWinner && (
                      <div className="mt-2 text-sm text-emerald-700">
                        Seleccionado: <strong>{selectedWinner.name}</strong>{' '}
                        <span className="text-slate-500">
                          {selectedWinner.dni ? `(DNI: ${selectedWinner.dni})` : ''}
                        </span>
                      </div>
                    )}
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

                  {closeErr && <div className="text-sm text-red-600">{closeErr}</div>}
                  {closeOk  && <div className="text-sm text-emerald-700">¡Subasta marcada como finalizada!</div>}

                  <button
                    className="btn btn-primary w-full disabled:opacity-60"
                    disabled={closing}
                    onClick={onCloseAuction}
                  >
                    {closing ? 'Guardando…' : 'Marcar como subastada'}
                  </button>
                </>
              )}

              {status === 'finished' && (
                <div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm">
                  <div>
                    <strong>Ganador:</strong>{' '}
                    {winnerUser?.name || selectedWinner?.name || data.buyer || '—'}
                    {' '}
                    {winnerUser?.dni || selectedWinner?.dni
                      ? <span className="text-emerald-800">(DNI: {winnerUser?.dni || selectedWinner?.dni})</span>
                      : null}
                  </div>
                  <div>
                    <strong>Precio final:</strong>{' '}
                    ${Number(data.final_price||finalPrice||0).toLocaleString('es-AR')}
                  </div>
                </div>
              )}

              <Link to="/admin/subastas" className="btn btn-outline w-full">Volver</Link>
            </div>
          </aside>
        </div>
      </div>

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
