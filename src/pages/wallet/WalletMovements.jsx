// src/pages/wallet/WalletMovements.jsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import authService from '../../services/authService.js'

export default function WalletMovements(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  useEffect(()=>{
    let alive = true

    if (!user?.id) {
      setError('No hay usuario autenticado.')
      setLoading(false)
      return
    }

    const path = `/finance/users/${user.id}/movimientos/`
    if (import.meta.env.DEV) {
      console.log('[WALLET MOVEMENTS] GET', (authService.client.defaults.baseURL || '') + path)
    }

    authService.client.get(path)
      .then(res => {
        if (!alive) return

        const data = res.data
        let raw = []

        if (Array.isArray(data)) {
          raw = data
        } else if (Array.isArray(data?.results)) {
          raw = data.results
        } else if (data && typeof data === 'object') {
          const firstArray = Object.values(data).find(v => Array.isArray(v))
          raw = Array.isArray(firstArray) ? firstArray : []
        }

        const mapped = raw.map((m, idx) => ({
          id: idx + 1,
          fecha: m.fecha ?? m.timestamp ?? null,
          tipo: m.tipo ?? null,
          tipoMovimiento: m.tipo_movimiento ?? m.sentido ?? null,
          monto: Number(m.monto ?? m.monto_pesos ?? m.amount ?? 0),
          destino: m.destino ?? m.descripcion ?? '',
        })).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))

        setItems(mapped)
        setLoading(false)
      })
      .catch(err => {
        if (!alive) return
        if (import.meta.env.DEV) {
          console.error('[WALLET MOVEMENTS] Error', err?.response?.status, err?.response?.data || err?.message)
        }
        setError(
          err?.response?.data?.message ||
          err.message ||
          'No se pudo cargar el historial de movimientos.'
        )
        setLoading(false)
      })

    return () => { alive = false }
  }, [user?.id])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Wallet</p>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Historial de movimientos
              </h1>
              <p className="lead mt-2">
                Revisá los ingresos y egresos de tu saldo en pesos.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={()=> navigate('/wallet')}
              >
                Volver a Mi wallet
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2">
            {error}
          </div>
        )}

        {/* Contenido principal */}
        {loading ? (
          <div className="card-surface p-6 rounded-3xl">
            <div className="h-6 w-48 bg-slate-200/70 rounded-xl animate-pulse mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full bg-slate-200/70 rounded-xl animate-pulse mb-2"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card-surface p-8 rounded-3xl text-center text-slate-600">
            No registramos movimientos aún.
          </div>
        ) : (
          <div className="card-surface p-0 overflow-hidden rounded-3xl">
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Tus movimientos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-t border-b border-slate-200">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-semibold text-slate-600">Fecha y hora</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Tipo</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Movimiento</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 text-right">Monto (ARS)</th>
                    <th className="px-6 py-3 font-semibold text-slate-600">Destino</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(mov => {
                    const isIngreso = mov.tipoMovimiento === 'ingreso'
                    const isEgreso = mov.tipoMovimiento === 'egreso'
                    const movimientoLabel =
                      mov.tipoMovimiento === 'ingreso'
                        ? 'Ingreso'
                        : mov.tipoMovimiento === 'egreso'
                        ? 'Egreso'
                        : mov.tipoMovimiento || '—'

                    const movimientoClass = isIngreso
                      ? 'px-6 py-3 text-emerald-600 font-semibold'
                      : isEgreso
                      ? 'px-6 py-3 text-red-600 font-semibold'
                      : 'px-6 py-3 text-slate-700'

                    const montoClass = isIngreso
                      ? 'px-6 py-3 text-right font-semibold text-emerald-600'
                      : isEgreso
                      ? 'px-6 py-3 text-right font-semibold text-red-600'
                      : 'px-6 py-3 text-right font-semibold text-slate-900'

                    return (
                      <tr key={mov.id}>
                        <td className="px-6 py-3 text-slate-700">
                          {formatDate(mov.fecha)}
                        </td>
                        <td className="px-6 py-3 text-slate-700">
                          {mov.tipo || '—'}
                        </td>
                        <td className={movimientoClass}>
                          {movimientoLabel}
                        </td>
                        <td className={montoClass}>
                          {fmtARS(mov.monto)}
                        </td>
                        <td className="px-6 py-3 text-slate-700">
                          {mov.destino || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function formatDate(value){
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function fmtARS(n){
  return `$${Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
