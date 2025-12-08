import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../utils/api.js' // <-- usamos tu helper api

export default function ArtworkStats(){
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(()=>{
    let alive = true
    setLoading(true)
    setErr(null)

    api.get(`/artworks/${id}/stats/`)
      .then(res => {
        if(!alive) return
        setData(res?.data)
        setLoading(false)
      })
      .catch(e => {
        if(!alive) return
        console.error('[ArtworkStats][ERROR]', e?.response?.status, e?.response?.data || e?.message)
        setErr(e?.message || 'No se pudo cargar')
        setLoading(false)
      })

    return ()=>{ alive = false }
  }, [id])

  // --- KPIs SOLO PARA TOKENIZADAS ---
  const kpi = useMemo(()=>{
    if(!data) return null
    // si es venta directa, no calculamos KPIs de fracciones
    if (data.venta_directa === true) return null

    const sold = (data.fractionsTotal || 0) - (data.fractionsLeft || 0)
    const pct = Math.round((sold / (data.fractionsTotal || 1)) * 100)
    const unit = data.fractionFrom || 0
    const revenue = sold * unit
    const created = new Date(data.createdAt)
    const days = Math.max(1, Math.round((Date.now() - created.getTime()) / 86400000))
    const dailyAvg = sold / days

    return { sold, pct, unit, revenue, days, dailyAvg }
  }, [data])

  // --- SERIE SOLO PARA TOKENIZADAS ---
  const series = useMemo(()=>{
    if(!data) return []
    if (data.venta_directa === true) return []

    const sold = (data.fractionsTotal || 0) - (data.fractionsLeft || 0)
    const days = Math.max(
      6,
      Math.min(
        14,
        Math.round((Date.now() - new Date(data.createdAt)) / 86400000)
      )
    )

    // distribuimos ventas (mock) en los últimos 'days' días
    let remaining = sold
    const arr = []
    for(let i=days-1;i>=0;i--){
      const daySold = remaining > 0 ? Math.floor(Math.random()*Math.max(1, sold/days)) : 0
      remaining = Math.max(0, remaining - daySold)
      arr.push({ t: i, y: daySold })
    }
    // último día, sumamos lo que quede
    if (remaining > 0 && arr.length > 0) {
      arr[arr.length-1].y += remaining
    }
    return arr.reverse()
  }, [data])

  if (loading) {
    return (
      <section className="section-frame py-16">
        <div className="h-40 rounded-3xl bg-slate-200/70 animate-pulse"/>
      </section>
    )
  }

  if (err) {
    return (
      <section className="section-frame py-16">
        <div className="card-surface p-8 text-center">
          <h3 className="text-xl font-bold">Error</h3>
          <p className="text-slate-600 mt-1">{err}</p>
          <div className="mt-4">
            <Link to="/mis-obras" className="btn btn-primary">Volver</Link>
          </div>
        </div>
      </section>
    )
  }

  if (!data) return null

  const isDirectSale = data.venta_directa === true
  const soldOutDirect = (data.fractionsLeft === 0) // para direct sale usamos esto como "vendida"
  const priceFormatted = Number(data.price || 0).toLocaleString('es-AR')

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Estadísticas</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{data.title}</h1>
          <p className="lead mt-2 max-w-2xl">
            Visión general de la performance de la obra en el marketplace.
          </p>
        </div>

        {/* -------------------------------------- */}
        {/*    BLOQUE PARA TOKENIZADAS (default)   */}
        {/* -------------------------------------- */}
        {!isDirectSale && kpi && (
          <>
            {/* KPIs */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi
                label="Unidades vendidas"
                value={`${kpi.sold}/${data.fractionsTotal} (${kpi.pct}%)`}
              />
              <Kpi
                label="Ingresos brutos"
                value={`$${fmt(kpi.revenue)}`}
              />
              <Kpi
                label="Precio por fracción"
                value={`$${fmt(kpi.unit)}`}
              />
              <Kpi
                label="Promedio diario"
                value={`${kpi.dailyAvg.toFixed(2)} u/día`}
              />
            </div>

            {/* Barra de avance */}
            <div className="card-surface p-6">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Progreso de ventas</span>
                <span>{kpi.pct}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                  style={{ width: `${kpi.pct}%` }}
                />
              </div>
            </div>

            {/* Gráfico simple (SVG) */}
            <div className="card-surface p-6">
              <h3 className="font-bold mb-3">Historial de ventas (últimos días)</h3>
              <Sparkline data={series} />
              <div className="mt-3 text-sm text-slate-600">
                Este gráfico es demostrativo (datos generados localmente).
              </div>
            </div>
          </>
        )}

        {/* -------------------------------------- */}
        {/*    BLOQUE PARA COMPRA DIRECTA          */}
        {/* -------------------------------------- */}
        {isDirectSale && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              label="Precio de venta"
              value={`$${priceFormatted}`}
            />
            <Kpi
              label="Estado"
              value={soldOutDirect ? 'Vendida' : 'Disponible'}
            />
            <Kpi
              label="Publicada el"
              value={new Date(data.createdAt).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
          </div>
        )}

        {/* Links finales */}
        <div className="flex gap-2">
          <Link to={`/obra/${data.id}`} className="btn btn-outline">Ver en marketplace</Link>
          <Link to="/mis-obras" className="btn btn-primary">Volver a mis obras</Link>
        </div>
      </div>
    </section>
  )
}

function Kpi({ label, value }){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  )
}

function Sparkline({ data }){
  if (!data.length) return <div className="h-24 rounded-xl bg-slate-100" />
  const W = 600, H = 140, pad = 10
  const maxY = Math.max(...data.map(d=>d.y), 1)
  const step = (W - pad*2) / (data.length - 1 || 1)
  const points = data.map((d,i)=>{
    const x = pad + i*step
    const y = H - pad - (d.y / maxY) * (H - pad*2)
    return [x,y]
  })
  const d = points.map((p,i)=> (
    i===0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`
  )).join(' ')
  const area = `${d} L ${pad + (data.length-1)*step},${H-pad} L ${pad},${H-pad} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36">
      <rect x="0" y="0" width={W} height={H} rx="12" className="fill-slate-50" />
      <path d={area} className="fill-indigo-200/60" />
      <path d={d} className="stroke-indigo-600" strokeWidth="3" fill="none" />
    </svg>
  )
}

function fmt(n){ return Number(n || 0).toLocaleString('es-AR') }
