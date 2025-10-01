// src/pages/projects/MyProjects.jsx
import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { listByOwner } from '../../services/mockProjects.js'

export default function MyProjects(){
  const user = useSelector(s => s.auth.user)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(()=>{
    let alive = true
    setLoading(true)
    listByOwner(user?.id).then(list=>{
      if(!alive) return
      setItems(list); setLoading(false)
    })
    return ()=>{ alive = false }
  }, [user?.id])

  const view = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(p =>
      p.title.toLowerCase().includes(s) ||
      (p.description||'').toLowerCase().includes(s)
    )
  }, [items, q])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Proyectos</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mis proyectos</h1>
              <p className="lead mt-2 max-w-2xl">Revisá el avance de la recaudación y editá la info.</p>
            </div>
            <Link to="/proyectos/nuevo" className="btn btn-primary">Nuevo proyecto</Link>
          </div>

          <div className="mt-6">
            <div className="relative max-w-md">
              <input
                className="input pr-10 w-full"
                placeholder="Buscar por título o descripción…"
                value={q}
                onChange={e=>setQ(e.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-5 w-5"/>
              </span>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length:6}).map((_,i)=><Skeleton key={i}/>)}
          </div>
        ) : view.length === 0 ? (
          <div className="card-surface p-8 text-center text-slate-600">
            No tenés proyectos todavía. <Link to="/proyectos/nuevo" className="text-indigo-600 hover:underline">Creá el primero</Link>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {view.map(p => {
              const pct = p.goalARS > 0 ? Math.min(100, Math.round((p.raisedARS / p.goalARS) * 100)) : 0
              return (
                <article key={p.id} className="card-surface overflow-hidden rounded-3xl">
                  <div className="aspect-[16/10] w-full bg-white/60 ring-1 ring-slate-200 overflow-hidden">
                    <img src={p.cover} alt={p.title} className="w-full h-full object-cover"/>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold leading-tight line-clamp-2">{p.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1">{p.description}</p>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Recaudado</span>
                        <span>${fmt(p.raisedARS)} / ${fmt(p.goalARS)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{pct}% • {p.backers} aportantes</div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link to={`/proyecto/${p.id}`} className="btn btn-outline flex-1">Ver</Link>
                      <button className="btn btn-primary flex-1" onClick={()=>navigate(`/proyecto/${p.id}/editar`)}>Editar</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function fmt(n){ return Number(n||0).toLocaleString('es-AR') }

function Skeleton(){
  return (
    <div className="card-surface rounded-3xl overflow-hidden">
      <div className="aspect-[16/10] bg-slate-200/70 animate-pulse"/>
      <div className="p-5 space-y-3">
        <div className="h-4 bg-slate-200/70 rounded w-2/3"/>
        <div className="h-3 bg-slate-200/70 rounded w-full"/>
        <div className="h-2 bg-slate-200/70 rounded w-full"/>
      </div>
    </div>
  )
}
function SearchIcon(props){
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-3.5-3.5"/>
  </svg>)
}
