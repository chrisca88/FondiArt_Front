// src/pages/projects/ProjectDetail.jsx
import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getById as getProjectById, addDonation } from '../../services/mockProjects.js'
import { donate } from '../../services/mockWallet.js'

export default function ProjectDetail(){
  const { id } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [p, setP] = useState(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [okMsg, setOkMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(()=>{
    let alive = true
    setLoading(true)
    getProjectById(id).then(x=>{
      if(!alive) return
      setP(x); setLoading(false)
    }).catch(()=> navigate('/donaciones', { replace:true }))
    return ()=>{ alive = false }
  }, [id, navigate])

  const goal = useMemo(()=> Number(p?.goalARS || 0), [p?.goalARS])
  const raised = useMemo(()=> Number(p?.raisedARS || 0), [p?.raisedARS])
  const remaining = useMemo(()=> Math.max(0, goal - raised), [goal, raised])

  const pct = p ? Math.min(100, Math.round((raised/Math.max(1,goal))*100)) : 0
  const fmt = (n)=> Number(n||0).toLocaleString('es-AR')

  async function onDonate(){
    setErr('')
    const entered = Number(amount)
    if (!entered || entered <= 0){ setErr('Ingresá un monto válido.'); return }

    // Tope: no permitir superar la meta
    const applied = Math.min(entered, remaining)
    if (applied <= 0){
      setErr('Este proyecto ya alcanzó la meta.')
      return
    }

    setSaving(true)
    try{
      // 1) Descontar exactamente lo aplicado
      await donate(user, p.artistSlug, applied, p.id)
      // 2) Sumar exactamente lo aplicado al proyecto (con tope en servicio)
      const next = await addDonation(p.id, applied)
      setP(next)
      setOkMsg(
        applied < entered
          ? `¡Gracias por apoyar este proyecto! Se aplicaron $${fmt(applied)} hasta completar la meta.`
          : `¡Gracias por apoyar este proyecto! Se descontó $${fmt(applied)} de tu wallet.`
      )
      setOk(true)
      setAmount('')
    }catch(e){
      setErr(e?.message || 'No se pudo procesar la donación.')
    }finally{
      setSaving(false)
    }
  }

  if (loading) return <section className="section-frame py-16"><div className="h-48 bg-slate-200/70 animate-pulse rounded-3xl"/></section>
  if (!p) return null

  const goalReached = remaining <= 0

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/donaciones" className="hover:underline">Donaciones</Link>
          <span className="mx-2">/</span>
          <Link to={`/donaciones/artista/${p.artistSlug}`} className="hover:underline">{p.artistName}</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">{p.title}</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200 bg-white/70">
            <img src={p.cover} alt={p.title} className="w-full aspect-[16/9] object-cover" />
            <div className="p-6">
              <h1 className="text-2xl font-extrabold leading-tight">{p.title}</h1>
              <div className="text-sm text-slate-600">por {p.artistName}</div>

              <p className="mt-4 text-slate-700 leading-relaxed whitespace-pre-wrap">{p.description}</p>
            </div>
          </div>

          <aside className="lg:col-span-2 card-surface p-6">
            <h3 className="text-lg font-bold">Apoyá este proyecto</h3>

            <div className="mt-3">
              <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Recaudado <span className="font-semibold">${fmt(raised)}</span> de ${fmt(goal)} — {pct}%.
              </div>
              <div className="text-xs text-slate-500">{p.backers} aportes</div>
              {goalReached ? (
                <div className="mt-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  ¡Meta alcanzada! Gracias por tu apoyo.
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-600">
                  Faltan <strong>${fmt(remaining)}</strong> para llegar a la meta.
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="form-label">Monto a donar (ARS)</label>
              <input
                type="number"
                min={0}
                max={remaining || undefined}
                className="input"
                placeholder="Ej. 1000"
                value={amount}
                onChange={e=>setAmount(e.target.value)}
                disabled={goalReached}
              />
              {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
              <button
                className="btn btn-primary w-full mt-3 disabled:opacity-60"
                onClick={onDonate}
                disabled={saving || !amount || goalReached}
              >
                {saving ? 'Procesando…' : 'Donar al proyecto'}
              </button>
              <Link to={`/donaciones/artista/${p.artistSlug}`} className="btn btn-outline w-full mt-2">Volver al artista</Link>
            </div>
          </aside>
        </div>
      </div>

      {ok && (
        <SuccessModal
          message={okMsg || '¡Gracias por apoyar este proyecto!'}
          onClose={()=> setOk(false)}
        />
      )}
    </section>
  )
}

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
        <p className="mt-1 text-slate-700">{message}</p>
        <button onClick={onClose} className="btn btn-primary mt-5 w-full">Aceptar</button>
      </div>
    </div>
  )
}
