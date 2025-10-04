// src/pages/wallet/Wallet.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import authService from '../../services/authService.js'
import API_URL from '../../config.js'
import { IS_MOCK } from '../../features/auth/authSlice.js'

export default function Wallet(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  // Saldo en ARS (desde backend)
  const [cashARS, setCashARS] = useState(0)
  const [cashLoading, setCashLoading] = useState(true)
  const [cashError, setCashError] = useState('')

  // Dirección de wallet (desde backend)
  const [walletAddr, setWalletAddr] = useState(null)
  const [addrLoading, setAddrLoading] = useState(true)
  const [addrError, setAddrError] = useState('')

  // Tokens desde API /cuadro-tokens/
  const [tokens, setTokens] = useState([])
  const [tokensLoading, setTokensLoading] = useState(true)
  const [tokensError, setTokensError] = useState('')

  // Tenencias del usuario (nuevo endpoint)
  const [holdings, setHoldings] = useState({})
  const [holdingsLoading, setHoldingsLoading] = useState(true)
  const [holdingsError, setHoldingsError] = useState('')

  // UI state
  const [q, setQ] = useState('')
  const [showAmounts, setShowAmounts] = useState(true)
  const [hideSmall, setHideSmall]   = useState(false)

  // Log de contexto al montar
  useEffect(()=>{
    if (!import.meta.env.DEV) return
    const token = localStorage.getItem('token')
    console.log('[WALLET] ENV', {
      API_URL,
      IS_MOCK,
      hasToken: !!token,
      tokenSample: token ? (token.slice(0, 10) + '…') : '(none)',
      user,
      axiosBaseURL: authService.client.defaults.baseURL,
      hasAuthHeader: !!authService.client.defaults.headers?.Authorization,
      authHeaderSample: authService.client.defaults.headers?.Authorization
        ? authService.client.defaults.headers.Authorization.slice(0, 16) + '…'
        : '(none)',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Traer saldo ARS del backend
  useEffect(()=>{
    let alive = true
    setCashLoading(true)
    setCashError('')
    setCashARS(0)

    if (IS_MOCK) {
      setCashLoading(false)
      setCashError('Sesión de demostración activa (sin backend).')
      if (import.meta.env.DEV) console.log('[WALLET] Modo MOCK: no se llama a finance/cuenta/')
      return
    }

    if (!user?.id) {
      setCashLoading(false)
      setCashError('No hay usuario autenticado.')
      if (import.meta.env.DEV) console.log('[WALLET] Sin user.id, no se puede pedir saldo.')
      return
    }

    authService.client.get(`finance/cuenta/`)
      .then(res=>{
        if(!alive) return
        setCashARS(res.data?.balance || 0)
        setCashLoading(false)
      })
      .catch(err=>{
        if(!alive) return
        setCashError(err?.response?.data?.message || err.message || 'Error al obtener saldo')
        setCashLoading(false)
      })

    return ()=>{ alive = false }
  }, [user?.id])

  // Traer dirección de wallet del backend
  useEffect(()=>{
    let alive = true
    setAddrLoading(true)
    setAddrError('')
    setWalletAddr(null)

    const uid = user?.id

    if (IS_MOCK) {
      setAddrLoading(false)
      setAddrError('Sesión de demostración activa (sin backend).')
      if (import.meta.env.DEV) console.log('[WALLET] Modo MOCK: no se llama a /users/<id>/wallet/')
      return
    }

    if (!uid) {
      setAddrLoading(false)
      setAddrError('No hay usuario autenticado.')
      if (import.meta.env.DEV) console.log('[WALLET] Sin user.id, no se puede pedir wallet.')
      return
    }

    if (import.meta.env.DEV) console.log('[WALLET] Fetch wallet for userId=', uid)

    authService.getUserWalletAddress(uid)
      .then(({ address }) => {
        if (!alive) return
        setWalletAddr(address || null)
        setAddrLoading(false)
      })
      .catch((e) => {
        if (!alive) return
        setAddrError(e?.response?.data?.message || e?.message || 'No se pudo obtener la dirección')
        setAddrLoading(false)
      })

    return ()=>{ alive = false }
  }, [user?.id])

  // Traer tokens del backend: GET /cuadro-tokens/
  useEffect(()=>{
    let alive = true
    setTokensLoading(true)
    setTokensError('')
    setTokens([])

    authService.client.get('/cuadro-tokens/')
      .then(res=>{
        if(!alive) return
        const results = Array.isArray(res?.data?.results) ? res.data.results : []
        const mapped = results.map(t => ({
          // guardamos ambos ids
          tokenId: t.id,                 // id del token (lo conservamos)
          artworkId: t.artwork_id,       // id de la obra (para navegar)
          symbol: t.token_symbol || '',
          title: t.artwork_title || '',
          price: Number(t.FractionFrom ?? t.fractionFrom ?? 0),
          image: t.artwork_image || '',
          // qty/valueARS se completan luego con holdings
          qty: null,
          valueARS: null,
        }))
        setTokens(mapped)
        setTokensLoading(false)
      })
      .catch(err=>{
        if(!alive) return
        setTokensError(err?.response?.data?.message || err.message || 'No se pudieron cargar los tokens.')
        setTokensLoading(false)
      })

    return ()=>{ alive = false }
  }, [])

  // Traer tenencias del usuario: GET /finance/users/<user_id>/tokens/
  useEffect(()=>{
    let alive = true
    setHoldingsLoading(true)
    setHoldingsError('')
    setHoldings({})

    const uid = user?.id

    if (IS_MOCK) {
      setHoldingsLoading(false)
      setHoldingsError('Sesión de demostración activa (sin backend).')
      if (import.meta.env.DEV) console.log('[WALLET] MOCK: no se llama a /finance/users/<id>/tokens/')
      return
    }

    if (!uid) {
      setHoldingsLoading(false)
      setHoldingsError('No hay usuario autenticado.')
      if (import.meta.env.DEV) console.log('[WALLET] Sin user.id, no se puede pedir holdings.')
      return
    }

    if (import.meta.env.DEV) console.log('[WALLET] Fetch holdings for userId=', uid)

    authService.client.get(`/finance/users/${uid}/tokens/`)
      .then(res => {
        if(!alive) return
        const arr = Array.isArray(res?.data) ? res.data : []
        const map = {}
        for (const it of arr) {
          const tid = Number(it?.token_id)
          const qty = Number(it?.quantity)
          if (Number.isFinite(tid) && Number.isFinite(qty)) {
            map[tid] = qty
          }
        }
        setHoldings(map)
        setHoldingsLoading(false)
      })
      .catch(err => {
        if(!alive) return
        setHoldingsError(err?.response?.data?.message || err.message || 'No se pudieron cargar tus tenencias.')
        setHoldingsLoading(false)
      })

    return ()=>{ alive = false }
  }, [user?.id])

  // Mezclar tokens con tenencias del usuario (qty, valueARS=qty*price)
  const tokensView = useMemo(()=>{
    return tokens.map(t => {
      const qty = holdings?.[t.tokenId]
      const priceNum = Number(t.price)
      const value = (Number.isFinite(qty) && Number.isFinite(priceNum)) ? qty * priceNum : null
      return {
        ...t,
        qty: Number.isFinite(qty) ? qty : null,
        valueARS: Number.isFinite(value) ? value : null,
      }
    })
  }, [tokens, holdings])

  // búsqueda + filtro < $1 (usa tokensView)
  const filtered = useMemo(()=>{
    const term = q.trim().toLowerCase()
    let arr = tokensView
    if (term) {
      arr = arr.filter(it =>
        (it.symbol || '').toLowerCase().includes(term) ||
        (it.title || '').toLowerCase().includes(term)
      )
    }
    if (hideSmall) {
      arr = arr.filter(it => Number.isFinite(Number(it.valueARS)) ? Number(it.valueARS) >= 1 : true)
    }
    return arr
  }, [q, tokensView, hideSmall])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="eyebrow">Balance</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mi wallet</h1>
              <p className="lead mt-2 max-w-2xl">Resumen de tus tenencias y saldo disponible.</p>

              {/* Dirección de wallet */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {addrLoading ? (
                  <span className="text-slate-500">Obteniendo dirección…</span>
                ) : addrError ? (
                  <span className="text-red-600">{addrError}</span>
                ) : (
                  <>
                    <code className="px-2 py-1 rounded bg-gray-100 border text-gray-700 select-all break-all">
                      {walletAddr || '(sin dirección)'}
                    </code>
                    {walletAddr && <CopyButton text={walletAddr} />}
                  </>
                )}
              </div>
            </div>

            <BalanceBox
              value={cashARS}
              loading={cashLoading}
              error={cashError}
              masked={!showAmounts}
              onToggle={()=> setShowAmounts(v => !v)}
            />
          </div>

          {/* Search + filtros */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="relative">
              <input
                className="input pr-10 w-72"
                placeholder="Buscar por símbolo o título…"
                value={q}
                onChange={e=>setQ(e.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-5 w-5"/>
              </span>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={hideSmall}
                onChange={e=>setHideSmall(e.target.checked)}
              />
              Ocultar activos de menos de $1
            </label>
          </div>
        </div>

        {/* Mensaje opcional por error de holdings */}
        {!!holdingsError && !holdingsLoading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2">
            {holdingsError}
          </div>
        )}

        {/* Tabla */}
        <div className="card-surface p-0 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="col-span-4">Moneda</div>
            <div className="col-span-2 text-right">Precio</div>
            <div className="col-span-2 text-right">Disponible</div>
            <div className="col-span-2 text-right">Monto</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>
          <div className="h-px bg-slate-200/70" />

          {/* Fila de ARS */}
          <RowARS cash={cashARS} loading={cashLoading} error={cashError} masked={!showAmounts} />

          {/* Tokens desde API + holdings */}
          {(tokensLoading) ? (
            <SkeletonRows/>
          ) : tokensError ? (
            <>
              <div className="h-px bg-slate-200/60" />
              <div className="p-6 text-center text-red-600">{tokensError}</div>
            </>
          ) : filtered.length === 0 ? (
            <>
              <div className="h-px bg-slate-200/60" />
              <div className="p-6 text-center text-slate-600">No hay resultados.</div>
            </>
          ) : (
            filtered.map((it)=>(
              <RowToken
                key={it.tokenId ?? it.artworkId ?? it.symbol}
                item={it}
                masked={!showAmounts}
                onBuy={()=> navigate(`/obra/${it.artworkId ?? ''}`)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

/* -------------------- Filas -------------------- */
function RowARS({ cash = 0, masked = false, loading, error }){
  const renderValue = (val) => {
    if (loading) return <span className="text-slate-400">Cargando…</span>
    if (error) return <span className="text-red-500">Error</span>
    if (masked) return '******'
    return val
  }

  const qty = fmt(cash)
  const val = `$${fmt(cash)}`
  return (
    <div className="grid grid-cols-12 items-center px-4 py-3">
      <div className="col-span-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white text-xs font-bold">$</div>
        <div>
          <div className="font-semibold text-slate-900 leading-tight">Pesos (ARS)</div>
          <div className="text-xs text-slate-500">Moneda local</div>
        </div>
      </div>
      <div className="col-span-2 text-right text-slate-600">—</div>
      <div className="col-span-2 text-right font-semibold">{renderValue(qty)}</div>
      <div className="col-span-2 text-right font-extrabold">{renderValue(val)}</div>
      <div className="col-span-2 text-right">
        <span className="inline-block text-xs rounded-full bg-slate-100 text-slate-600 px-2 py-1">—</span>
      </div>
    </div>
  )
}

function RowToken({ item, masked = false, onBuy }){
  const showQty = Number.isFinite(Number(item.qty)) ? fmt(item.qty) : '—'
  const showAmount = Number.isFinite(Number(item.valueARS)) ? `$${fmt(item.valueARS)}` : '—'
  const showPrice = Number.isFinite(Number(item.price)) ? `$${fmt(item.price)}` : '—'
  const canBuy = !!item.artworkId

  return (
    <>
      <div className="h-px bg-slate-200/60" />
      <div className="grid grid-cols-12 items-center px-4 py-3">
        <div className="col-span-4 flex items-center gap-3">
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-9 w-9 rounded-full object-cover"/>
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-200" />
          )}
          <div>
            <div className="font-semibold text-slate-900 leading-tight">{item.symbol}</div>
            <div className="text-xs text-slate-500 line-clamp-1">{item.title}</div>
          </div>
        </div>
        <div className="col-span-2 text-right text-slate-700">{showPrice}</div>
        <div className="col-span-2 text-right">{masked ? '******' : showQty}</div>
        <div className="col-span-2 text-right font-extrabold">{masked ? '******' : showAmount}</div>
        <div className="col-span-2 text-right">
          {canBuy ? (
            <button
              className="btn btn-primary btn-sm w-[110px]"
              onClick={onBuy}
              title={`Ir a la obra${item.tokenId ? ` (token #${item.tokenId})` : ''}`}
            >
              Comprar
            </button>
          ) : (
            <span className="inline-block text-xs rounded-full bg-slate-100 text-slate-600 px-2 py-1">—</span>
          )}
        </div>
      </div>
    </>
  )
}

/* -------------------- UI helpers -------------------- */
function BalanceBox({ value = 0, masked = false, onToggle, loading, error }){
  const renderContent = () => {
    if (loading) return <div className="text-sm text-slate-500">Cargando saldo…</div>
    if (error) return <div className="text-sm text-red-600" title={error}>Error de saldo</div>
    if (masked) return '******'
    return `$${fmt(value)}`
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50 px-5 py-3 text-center shadow-sm min-w-[220px]">
      <button
        onClick={onToggle}
        className="absolute right-3 top-3 text-slate-500 hover:text-slate-700"
        title={masked ? 'Mostrar saldo' : 'Ocultar saldo'}
      >
        {masked ? <EyeOffIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
      </button>
      <div className="text-2xl font-extrabold">{renderContent()}</div>
      <div className="text-[11px] tracking-wider uppercase text-slate-500">Saldo en pesos</div>
    </div>
  )
}

function CopyButton({ text }){
  const [copied, setCopied] = useState(false)
  async function handleCopy(){
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(()=> setCopied(false), 1200)
    } catch (e) {
      console.error('No se pudo copiar', e)
    }
  }
  return (
    <button onClick={handleCopy} className="btn btn-outline btn-sm" title="Copiar dirección">
      {copied ? '¡Copiado!' : 'Copiar'}
    </button>
  )
}

function SkeletonRows(){
  return (
    <>
      {Array.from({length:4}).map((_,i)=>(
        <div key={i} className="grid grid-cols-12 items-center px-4 py-3">
          <div className="col-span-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200/70 animate-pulse" />
            <div className="h-4 w-40 bg-slate-200/70 animate-pulse rounded" />
          </div>
          <div className="col-span-2 text-right"><div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
          <div className="col-span-2 text-right"><div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
          <div className="col-span-2 text-right"><div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
          <div className="col-span-2 text-right"><div className="h-7 w-[110px] bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
        </div>
      ))}
    </>
  )
}

function SearchIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-3.5-3.5"/>
  </svg>
)}
function EyeIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)}
function EyeOffIcon(props){ return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-3.87 5.94"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)}
function fmt(n){ return Number(n || 0).toLocaleString('es-AR') }
