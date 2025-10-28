// src/pages/market/SecondaryMarket.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { cancelListing, buyListing } from '../../services/mockMarket.js'
import { getPortfolio } from '../../services/mockWallet.js'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx'
import authService from '../../services/authService.js'

export default function SecondaryMarket(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState([])
  const [portfolio, setPortfolio] = useState({ cashARS: 0, items: [] })
  const [q, setQ] = useState('')

  // Modal crear
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ artworkId: '', price: '', qty: 1 })

  // Tokens reales del usuario (desde backend real)
  const [userTokens, setUserTokens] = useState([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokensError, setTokensError] = useState('')

  // token seleccionado actualmente en el modal
  const selectedToken = useMemo(() => {
    return userTokens.find(t => String(t.token_id) === String(form.artworkId))
  }, [userTokens, form.artworkId])

  // Confirm dialog (comprar / cancelar)
  const [confirm, setConfirm] = useState({ open:false, mode:null, listing:null, loading:false })
  const [buyQty, setBuyQty] = useState(1)

  // Avisos simples
  const [notice, setNotice] = useState(null)
  const showNotice = (msg, type='ok') => {
    setNotice({ msg, type }); setTimeout(()=> setNotice(null), 1600)
  }

  // === NUEVO: cargar órdenes abiertas del backend real ===
  async function fetchOpenOrders() {
    try {
      setLoading(true)
      const res = await authService.client.get('/finance/sell-orders/open/')
      const data = Array.isArray(res?.data) ? res.data : []

      // Adaptamos cada orden a la forma que ya renderiza la tabla
      const mapped = data.map(o => ({
        id: o.id,
        symbol: `Token #${o.token}`,
        title: `Token ID ${o.token}`,
        price: o.price,
        qty: o.quantity,
        sellerId: o.user,
        sellerName: `Usuario ${o.user}`,
        status: o.status,
      }))

      setListings(mapped)
    } catch (err) {
      console.error('Error cargando órdenes:', err)
      showNotice('Error al cargar órdenes del mercado', 'err')
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  // Carga inicial de órdenes abiertas y portfolio
  useEffect(() => {
    let alive = true
    async function load() {
      // órdenes abiertas
      await fetchOpenOrders()

      // portfolio
      const pf = await getPortfolio(user)
      if (alive) {
        setPortfolio(pf)
      }
    }
    load()
    return () => { alive = false }
  }, [user])

  const mySellables = useMemo(
    () => (portfolio.items || []).filter(it => Number(it.qty) > 0),
    [portfolio]
  )

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return listings
    return listings.filter(l =>
      l.symbol.toLowerCase().includes(s) ||
      l.title.toLowerCase().includes(s) ||
      l.sellerName.toLowerCase().includes(s)
    )
  }, [q, listings])

  // Cuando se abre el modal, buscamos los tokens reales del usuario autenticado
  useEffect(() => {
    let alive = true
    async function fetchTokens() {
      if (!open) return
      try {
        setTokensLoading(true)
        setTokensError('')
        // GET /api/v1/finance/users/<user_id>/tokens/
        const res = await authService.client.get(`/finance/users/${user.id}/tokens/`)
        if (!alive) return

        // endpoint paginado { results: [...] }
        const data = res?.data?.results || []
        // cada item: { token_id, token_name, quantity, unit_price }
        setUserTokens(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!alive) return
        const msg = err?.response?.data?.message || err?.message || 'Error al cargar tokens'
        setTokensError(msg)
        setUserTokens([])
      } finally {
        if (!alive) return
        setTokensLoading(false)
      }
    }
    fetchTokens()
    return ()=>{ alive = false }
  }, [open, user?.id])

  // Crear nueva publicación
  async function handleCreate(e){
    e.preventDefault()

    const chosen = selectedToken
    if (!chosen) {
      return showNotice('Seleccioná un token válido', 'err')
    }

    // validación: no puede publicar más cantidad de la que tiene
    const desiredQty = Number(form.qty || 1)
    const maxAllowed = Number(chosen.quantity || 0)
    if (desiredQty < 1 || desiredQty > maxAllowed){
      return showNotice('Cantidad inválida (supera lo que tenés)', 'err')
    }

    try{
      // POST /api/v1/finance/sell-orders
      await authService.client.post('/finance/sell-orders/', {
        token: chosen.token_id,
        user: user.id,
        quantity: desiredQty,
        price: form.price
      })

      // refrescar órdenes abiertas (mercado) y portfolio
      await fetchOpenOrders()
      const pf = await getPortfolio(user)
      setPortfolio(pf)

      // cerrar modal y limpiar form
      setOpen(false)
      setForm({ artworkId:'', price:'', qty:1 })

      showNotice('Publicación creada')
    }catch(err){
      showNotice(err?.response?.data?.message || err.message || 'Error al publicar', 'err')
    }
  }

  // Abrir confirmaciones
  const askCancel = (listing) => setConfirm({ open:true, mode:'cancel', listing, loading:false })
  const askBuy    = (listing) => { setBuyQty(1); setConfirm({ open:true, mode:'buy', listing, loading:false }) }
  const closeConfirm = () => setConfirm({ open:false, mode:null, listing:null, loading:false })

  // Ejecutar confirmación (compra / cancelar)
  async function doConfirm(){
    const l = confirm.listing
    if (!l) return
    try{
      setConfirm(c=>({ ...c, loading:true }))
      if (confirm.mode === 'buy') {
        const qtyNum = Math.floor(Number(buyQty) || 0)
        await buyListing({ listingId: l.id, buyer: user, qty: qtyNum })
        showNotice('Compra realizada')
      } else {
        await cancelListing({ listingId: l.id, user })
        showNotice('Publicación cancelada')
      }

      await fetchOpenOrders()
      const pf = await getPortfolio(user)
      setPortfolio(pf)

      closeConfirm()
    }catch(err){
      setConfirm(c=>({ ...c, loading:false }))
      showNotice(err.message || 'Ocurrió un error', 'err')
    }
  }

  const fmt = (n)=> Number(n||0).toLocaleString('es-AR')

  // Validaciones compra parcial (confirm dialog existente)
  const maxQty = confirm.listing ? Number(confirm.listing.qty) : 1
  const qtyNum = Math.floor(Number(buyQty) || 0)
  const qtyValid = confirm.mode !== 'buy' || (qtyNum >= 1 && qtyNum <= maxQty)
  const buyTotal = (confirm.mode === 'buy' && confirm.listing && qtyValid)
    ? Number(confirm.listing.price) * qtyNum
    : 0

  // límite de cantidad para publicar en el modal, basado en lo que el usuario tiene
  const maxForSelectedToken = selectedToken ? Number(selectedToken.quantity || 0) : null

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">

        {/* Aviso */}
        {notice && (
          <div className={`rounded-xl border px-4 py-2 text-sm ${
            notice.type==='err'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {notice.msg}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="eyebrow">Mercado</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mercado secundario</h1>
            <p className="lead mt-2 max-w-2xl">Compra y venta entre usuarios de tokens de obras.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs uppercase text-slate-500">Tu saldo</div>
              <div className="text-lg font-extrabold">${fmt(portfolio.cashARS)}</div>
            </div>
            <button className="btn btn-primary" onClick={()=> setOpen(true)}>
              Nueva publicación
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card-surface p-4 flex flex-wrap items-center gap-4">
          <div className="relative">
            <input
              className="input pr-10 w-72"
              placeholder="Buscar por símbolo, título o vendedor…"
              value={q}
              onChange={e=>setQ(e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon className="h-5 w-5"/>
            </span>
          </div>
          <button className="btn btn-outline" onClick={()=> navigate('/wallet')}>Ir a mi wallet</button>
        </div>

        {/* Tabla de órdenes */}
        <div className="card-surface p-0 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="col-span-4">Token</div>
            <div className="col-span-2 text-right">Precio</div>
            <div className="col-span-2 text-right">Cantidad</div>
            <div className="col-span-2 text-right">Vendedor</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>
          <div className="h-px bg-slate-200/70" />

          {loading ? (
            <RowsSkeleton/>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-600">No hay publicaciones.</div>
          ) : (
            filtered.map(l => (
              <div key={l.id} className="grid grid-cols-12 items-center px-4 py-3">
                <div className="col-span-4">
                  <div className="font-semibold text-slate-900 leading-tight">{l.symbol}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{l.title}</div>
                </div>
                <div className="col-span-2 text-right text-slate-700">${fmt(l.price)}</div>
                <div className="col-span-2 text-right">{l.qty}</div>
                <div className="col-span-2 text-right text-slate-600">{l.sellerName}</div>
                <div className="col-span-2 text-right">
                  {l.sellerId === user.id ? (
                    <button className="btn btn-outline btn-sm w-[110px]" onClick={()=>askCancel(l)}>
                      Cancelar
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm w-[110px]" onClick={()=>askBuy(l)}>
                      Comprar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal nueva publicación */}
        {open && (
          <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={()=> setOpen(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6" onClick={e=>e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-1">Nueva publicación</h2>
              <p className="text-sm text-slate-600 mb-4">Elegí el token que querés vender y definí precio y cantidad.</p>

              <form onSubmit={handleCreate} className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium mb-1">Token</span>

                  <select
                    className="select w-full"
                    value={form.artworkId}
                    onChange={e=> setForm(f=>({ ...f, artworkId: e.target.value }))}
                    disabled={tokensLoading}
                  >
                    <option value="">
                      {tokensLoading
                        ? 'Cargando...'
                        : tokensError
                          ? 'Error al cargar tokens'
                          : 'Seleccionar…'}
                    </option>

                    {!tokensLoading && !tokensError && userTokens.map(t => (
                      <option key={t.token_id} value={t.token_id}>
                        {t.token_name} (tenés {t.quantity})
                      </option>
                    ))}
                  </select>

                  {tokensError && (
                    <div className="text-xs text-red-600 mt-1">{tokensError}</div>
                  )}

                  {selectedToken && !tokensError && (
                    <div className="mt-2 text-xs text-slate-600">
                      El precio de adquisición de tus tokens fue ${Number(selectedToken.unit_price || 0).toLocaleString('es-AR')} ARS
                    </div>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Precio (ARS por token)</span>
                    <input
                      className="input w-full"
                      type="number" step="0.01" min="0"
                      value={form.price}
                      onChange={e=> setForm(f=>({ ...f, price: e.target.value }))}
                      placeholder="Ej: 15000"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium mb-1">Cantidad</span>
                    <input
                      className="input w-full"
                      type="number"
                      step="1"
                      min="1"
                      max={maxForSelectedToken ?? undefined}
                      value={form.qty}
                      onChange={e=> {
                        const raw = e.target.value
                        let next = raw
                        // no permitir más que lo que tiene el usuario
                        if (maxForSelectedToken != null) {
                          const asNum = Number(raw)
                          if (!Number.isNaN(asNum) && asNum > maxForSelectedToken) {
                            next = String(maxForSelectedToken)
                          }
                        }
                        setForm(f=>({ ...f, qty: next }))
                      }}
                    />
                    {maxForSelectedToken != null && (
                      <div className="mt-1 text-xs text-slate-500">
                        Máximo disponible: {maxForSelectedToken}
                      </div>
                    )}
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button type="button" className="btn btn-outline" onClick={()=> setOpen(false)}>Cerrar</button>
                  <button type="submit" className="btn btn-primary">Publicar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmaciones profesionales (con compra parcial) */}
        <ConfirmDialog
          open={confirm.open}
          onCancel={closeConfirm}
          onConfirm={doConfirm}
          loading={confirm.loading}
          confirmDisabled={!qtyValid}
          tone={confirm.mode === 'cancel' ? 'danger' : 'primary'}
          title={confirm.mode === 'buy' ? 'Confirmar compra' : 'Cancelar publicación'}
          confirmText={confirm.mode === 'buy' ? 'Confirmar compra' : 'Confirmar'}
          cancelText="Volver"
          description={
            confirm.listing
              ? (confirm.mode === 'buy'
                  ? 'Estás a punto de comprar esta publicación.'
                  : 'Esta acción devolverá los tokens a tu wallet.')
              : ''
          }
        >
          {confirm.listing && (
            <div className="text-sm text-slate-700 space-y-3">
              <div><span className="font-medium">Token:</span> {confirm.listing.symbol} — {confirm.listing.title}</div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs uppercase text-slate-500 mb-1">Precio por token</div>
                  <div className="font-semibold">${fmt(confirm.listing.price)}</div>
                </div>
                {confirm.mode === 'buy' ? (
                  <label className="block">
                    <span className="block text-xs uppercase text-slate-500 mb-1">Cantidad a comprar</span>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      step="1"
                      className="input w-28"
                      value={buyQty}
                      onChange={e => setBuyQty(e.target.value)}
                    />
                    <div className="mt-1 text-xs text-slate-500">Disponibles: {maxQty}</div>
                  </label>
                ) : (
                  <div>
                    <div className="text-xs uppercase text-slate-500 mb-1">Cantidad publicada</div>
                    <div className="font-semibold">{confirm.listing.qty}</div>
                  </div>
                )}
              </div>

              {confirm.mode === 'buy' && (
                <div>
                  <span className="font-medium">Total: </span>
                  {qtyValid ? `$${fmt(buyTotal)}` : <span className="text-slate-500">—</span>}
                </div>
              )}
            </div>
          )}
        </ConfirmDialog>

      </div>
    </section>
  )
}

function RowsSkeleton(){
  return (
    <>
      {Array.from({length:4}).map((_,i)=>(
        <div key={i} className="grid grid-cols-12 items-center px-4 py-3">
          <div className="col-span-4"><div className="h-4 w-40 bg-slate-200/70 animate-pulse rounded" /></div>
          <div className="col-span-2 text-right"><div className="h-4 w-16 bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
          <div className="col-span-2 text-right"><div className="h-4 w-10 bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
          <div className="col-span-2 text-right"><div className="h-4 w-28 bg-slate-200/70 animate-pulse rounded ml-auto"/></div>
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
