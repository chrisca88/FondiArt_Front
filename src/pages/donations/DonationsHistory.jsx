// src/pages/donations/DonationsHistory.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import authService from '../../services/authService.js'

export default function DonationsHistory(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  useEffect(()=>{
    let alive = true
    setLoading(true)
    setError('')
    setItems([])

    if (!user?.id){
      setError('Debés iniciar sesión para ver tu historial.')
      setLoading(false)
      return
    }

    const path = `/finance/users/${user.id}/donations/` // baseURL ya incluye /api/v1
    if (import.meta.env.DEV) {
      console.log('[DONATIONS HISTORY] GET', (authService.client.defaults.baseURL || '') + path)
    }

    authService.client.get(path)
      .then(res=>{
        if (!alive) return
        const data = Array.isArray(res?.data) ? res.data : []
        // normalizamos & ordenamos por fecha desc
        const mapped = data.map(d => ({
          id: Number(d?.id),
          projectId: Number(d?.project),
          projectTitle: d?.project_title || 'Proyecto',
          artistName: d?.artist_name || 'Artista',
          amount: Number(d?.monto_pesos ?? 0),
          timestamp: d?.fecha || null
        })).sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0))
        setItems(mapped)
        setLoading(false)
      })
      .catch(err=>{
        if (!alive) return
        setError(err?.response?.data?.message || err.message || 'No se pudo cargar el historial de donaciones.')
        setLoading(false)
        if (import.meta.env.DEV) console.error('[DONATIONS HISTORY] error:', err?.response?.status, err?.response?.data || err?.message)
      })

    return ()=>{ alive = false }
  }, [user?.id])

  const total = useMemo(()=> items.reduce((acc, it)=> acc + (Number.isFinite(it.amount) ? it.amount : 0), 0), [items])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Donaciones</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Historial de donaciones
              </h1>
              <p className="lead mt-2">Revisá tus aportes realizados en la plataforma.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={()=> navigate('/donaciones')}>
                Volver a Donaciones
              </button>
            </div>
          </div>
        </div>

        {!!error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card-surface p-6 rounded-3xl">
            <div className="h-6 w-48 bg-slate-200/70 rounded-xl animate-pulse mb-4" />
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} className="h-12 w-full bg-slate-200/70 rounded-xl animate-pulse mb-2" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card-surface p-8 rounded-3xl text-center text-slate-600">
            No registramos donaciones aún.
          </div>
        ) : (
          <div className="card-surface p-0 overflow-hidden rounded-3xl">
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tus movimientos</h2>
              <div className="text-sm text-slate-600">
                Total donado:&nbsp;
                <span className="font-bold">
                  ${fmtMoney(total)}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-t border-b border-slate-200">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-semibold text-slate-600">Proyecto</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Artista</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Monto</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Fecha y hora</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map(it=>(
                    <tr key={it.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium">{it.projectTitle}</td>
                      <td className="px-6 py-3">{it.artistName}</td>
                      <td className="px-6 py-3">${fmtMoney(it.amount)}</td>
                      <td className="px-6 py-3">{fmtDateTime(it.timestamp)}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          className="btn btn-ghost text-indigo-700"
                          onClick={()=> navigate(`/proyecto/${it.projectId}`)}
                          title="Ver proyecto"
                        >
                          Ver proyecto
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function fmtMoney(n){
  const num = Number(n || 0)
  if (!Number.isFinite(num)) return '0,00'
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDateTime(iso){
  if (!iso) return '-'
  const d = new Date(iso)
  // Argentina: America/Argentina/Buenos_Aires (-03:00)
  return d.toLocaleString('es-AR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}
