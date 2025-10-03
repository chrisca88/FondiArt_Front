// src/pages/admin/AdminArtworkReview.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../utils/api.js'
const FRACTIONS_TOTAL = 100000

export default function AdminArtworkReview(){
  const { id } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const [idx, setIdx] = useState(0)
  const [contractAddress, setContractAddress] = useState(null)

  // precio base editable por el admin
  const [basePrice, setBasePrice] = useState(0)
  // fecha de subasta
  const [auctionDate, setAuctionDate] = useState('')
  const todayStr = useMemo(()=> new Date().toISOString().slice(0,10), [])

  // MODAL éxito
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(()=>{
    let alive = true
    setLoading(true)
    setContractAddress(null)
    api.get(`/api/v1/artworks/${id}/`).then(res => {
      if(!alive) return
      const item = res.data
      setData(item)
      setBasePrice(Number(item.price || 0))
      setAuctionDate(item.auctionDate || '')
      setLoading(false)

      if (item.status === 'Approved' && item.contract_address) {
        setContractAddress(item.contract_address)
      }
    }).catch(e=>{
      setErr(e.message || 'No se pudo cargar la obra'); setLoading(false)
    })
    return ()=>{ alive = false }
  }, [id])

  const isPending = useMemo(()=> data && (data.status === 'Pending'), [data])
  const unit = useMemo(() => Number(((Number(basePrice)||0) / FRACTIONS_TOTAL).toFixed(2)), [basePrice])

  const statusConfig = {
    Pending: { text: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    Approved: { text: 'Aprobado', className: 'bg-emerald-100 text-emerald-700' },
    Rejected: { text: 'Rechazada', className: 'bg-red-100 text-red-700' },
    default: { text: data?.status || 'Desconocido', className: 'bg-slate-100 text-slate-700' }
  };
  const currentStatus = statusConfig[data?.status] || statusConfig.default;

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

  if (loading) return <section className="section-frame py-16"><Skeleton/></section>
  if (err) return (
    <section className="section-frame py-16">
      <div className="card-surface p-8 text-center">
        <h3 className="text-xl font-bold">Error</h3>
        <p className="text-slate-600 mt-1">{err}</p>
        <div className="mt-4"><Link to="/admin" className="btn btn-primary">Volver</Link></div>
      </div>
    </section>
  )
  if (!data) return null

  const onGenerateSC = async () => {
    if (saving) return
    if (!basePrice || basePrice <= 0) {
      window.alert('Ingresá un precio base válido.')
      return
    }
    if (!auctionDate) {
      window.alert('Seleccioná la fecha de subasta.')
      return
    }
    setSaving(true)
    try {
      // 1. Update artwork details and status
      const artworkUpdatePayload = {
        price: Number(basePrice),
        fractionFrom: unit,
        fractionsTotal: FRACTIONS_TOTAL,
        fractionsLeft: 30000,
        auctionDate,
        status: 'Approved'
      }
      const { data: updatedArtwork } = await api.patch(`/api/v1/artworks/${data.id}/`, artworkUpdatePayload)

      // 2. Create the auction
      const startDate = new Date(`${auctionDate}T12:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7); // Auction ends 7 days after start

      const auctionPayload = {
        start_price: Number(basePrice),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };
      await api.post(`/api/v1/artworks/${data.id}/auctions/create/`, auctionPayload);

      // 3. Tokenize the artwork
      await api.post(`/api/v1/artworks/${data.id}/tokenize/`);

      // 4. Re-fetch artwork data to get the contract address and latest status
      try {
        const artworkRes = await api.get(`/api/v1/artworks/${data.id}/`)
        setData(artworkRes.data) // This is the most up-to-date version
        if (artworkRes.data.contract_address) {
          setContractAddress(artworkRes.data.contract_address)
        }
      } catch (e) {
        console.warn("Could not re-fetch artwork data after tokenization.", e)
        // Fallback to the data from the initial PATCH if re-fetch fails
        setData(updatedArtwork);
      }

      setSuccessMsg('Obra aprobada, subasta creada y tokenización iniciada.')
      setSuccessOpen(true)
    } catch (err) {
      console.error("Error during artwork approval, auction creation, or tokenization:", err)
      const errorMsg = err.response?.data?.detail || err.response?.data?.[0] || err.message || 'Ocurrió un error.'
      window.alert(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const onMarkPending = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api.patch(`/api/v1/artworks/${data.id}/`, { status: 'Pending' })
      setSuccessMsg('La obra volvió a estado pendiente.')
      setSuccessOpen(true)
      setTimeout(() => navigate('/admin', { replace: true }), 1200)
    } catch (err) {
      console.error("Error setting artwork to pending:", err)
      window.alert(err.response?.data?.detail || err.message || 'No se pudo actualizar la obra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/admin" className="hover:underline">Admin</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">Revisión</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* galería */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-3xl ring-1 ring-slate-200 bg-white/60">
              <img
                src={(() => {
                  let imageUrl = data.gallery[idx] || data.image;
                  if (typeof imageUrl === 'string') {
                    const marker = 'https%3A/';
                    const index = imageUrl.indexOf(marker);
                    if (index !== -1) {
                      imageUrl = 'https://' + imageUrl.substring(index + marker.length);
                    } else if (!imageUrl.startsWith('http')) {
                      imageUrl = `${api.defaults.baseURL}${imageUrl}`;
                    }
                  }
                  return imageUrl;
                })()}
                alt={data.title}
                className="w-full aspect-[4/3] object-cover"
                loading="eager"
              />
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {data.gallery.map((src, i)=>(
                <button key={i} onClick={()=>setIdx(i)}
                  className={`overflow-hidden rounded-2xl ring-1 ${idx===i ? 'ring-indigo-500' : 'ring-slate-200'} bg-white/60`}>
                  <img
                    src={(() => {
                      let imageUrl = src;
                      if (typeof imageUrl === 'string') {
                        const marker = 'https%3A/';
                        const index = imageUrl.indexOf(marker);
                        if (index !== -1) {
                          imageUrl = 'https://' + imageUrl.substring(index + marker.length);
                        } else if (!imageUrl.startsWith('http')) {
                          imageUrl = `${api.defaults.baseURL}${imageUrl}`;
                        }
                      }
                      return imageUrl;
                    })()}
                    alt={`mini ${i+1}`}
                    className="h-20 w-28 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ficha */}
          <aside className="lg:col-span-2">
            <div className="card-surface p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                  {data.artist?.name?.split(' ').map(s=>s[0]).slice(0,2).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-extrabold leading-tight">{data.title}</h1>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${currentStatus.className}`}>
                      {currentStatus.text}
                    </span>
                  </div>
                  <p className="text-slate-600">{data.artist?.name}</p>
                </div>
              </div>

              {/* Precio base editable */}
              <div>
                <label className="form-label">Precio base</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={basePrice}
                  onChange={(e)=> setBasePrice(e.target.value)}
                  placeholder="Ingresá el precio base de la obra"
                />
                <p className="text-xs text-slate-500 mt-1">
                  El valor “Desde” se calcula automáticamente como precio base / {FRACTIONS_TOTAL.toLocaleString('es-AR')}.
                </p>
              </div>

              {/* Fecha de subasta */}
              <div>
                <label className="form-label">Fecha de subasta</label>
                <input
                  type="date"
                  className="input"
                  value={auctionDate}
                  min={todayStr}
                  onChange={(e)=> setAuctionDate(e.target.value)}
                />
              </div>

              <div className="divider" />

              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Precio base" value={`$${fmt(basePrice)}`} />
                <Metric label="Desde" value={`$${fmt(unit)}`} />
                <Metric label="Fracciones" value={`${FRACTIONS_TOTAL.toLocaleString('es-AR')}`} />
              </div>

              <div className="flex flex-wrap gap-2">
                {data.tags.map(t => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-700">
                    {t}
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                {isPending ? (
                  <button
                    className="btn btn-primary w-full disabled:opacity-60"
                    onClick={onGenerateSC}
                    disabled={saving || !basePrice || Number(basePrice) <= 0 || !auctionDate}
                  >
                    {saving ? 'Generando…' : 'Generar Smart Contract'}
                  </button>
                ) : (
                  <button
                    className="btn btn-outline w-full disabled:opacity-60"
                    onClick={onMarkPending}
                    disabled={saving}
                  >
                    {saving ? 'Guardando…' : 'Marcar como pendiente'}
                  </button>
                )}
                <Link to="/admin" className="btn btn-outline w-full text-center">Volver al listado</Link>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-surface p-6">
            <h2 className="text-lg font-bold">Descripción provista por el artista</h2>
            <p className="mt-2 text-slate-700 leading-relaxed">{data.description}</p>
          </div>
          <div className="card-surface p-6">
            <h3 className="text-lg font-bold">Metadatos</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li><strong>Autor:</strong> {data.artist?.name}</li>
              <li><strong>Publicación:</strong> {new Date(data.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
              <li><strong>Estado:</strong> {data.status}</li>
              <li>
                <strong>Subasta:</strong>
                {contractAddress ? (
                  <a
                    href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-indigo-600 hover:underline break-all"
                    title="Ver en Etherscan"
                  >
                    {contractAddress}
                  </a>
                ) : (
                  <span className="ml-1">{data.auctionDate || '—'}</span>
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL de éxito */}
      {successOpen && (
        <SuccessModal
          message={successMsg}
          onClose={()=>{ setSuccessOpen(false) }}
        />
      )}
    </section>
  )
}

/* ----- Modal simple de éxito (igual estilo que en publicar/editar) ----- */
function SuccessModal({ message, onClose }){
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold">¡Listo!</h3>
        <p className="mt-1 text-slate-700">{message || 'Operación realizada correctamente.'}</p>
        <button onClick={onClose} className="btn btn-primary mt-5 w-full">Volver al listado</button>
      </div>
    </div>
  )
}

/* helpers UI */
function Metric({label, value}){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2">
      <div className="text-lg font-extrabold text-center">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 text-center">{label}</div>
    </div>
  )
}
function Skeleton(){
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <div className="aspect-[4/3] w-full rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="mt-3 flex gap-3">
          {Array.from({length:4}).map((_,i)=>(<div key={i} className="h-20 w-28 rounded-2xl bg-slate-200/70 animate-pulse"></div>))}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="h-40 rounded-3xl bg-slate-200/70 animate-pulse"></div>
        <div className="h-32 rounded-3xl bg-slate-200/70 animate-pulse"></div>
      </div>
    </div>
  )
}
function fmt(n){ return Number(n||0).toLocaleString('es-AR') }
