// src/pages/donations/Donations.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listArtists } from '../../services/mockArtists.js'

export default function Donations(){
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(()=>{
    let alive = true
    setLoading(true)
    listArtists().then(a=>{
      if(!alive) return
      setItems(a); setLoading(false)
    })
    return ()=>{ alive = false }
  },[])

  const view = useMemo(()=>{
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(a => a.name.toLowerCase().includes(s))
  }, [items, q])

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <p className="eyebrow">Donaciones</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Apoyá a tu artista favorito</h1>
          <p className="lead mt-2 max-w-2xl">Explorá artistas de la plataforma y realizá una donación directa.</p>

          <div className="mt-6">
            <div className="relative max-w-md">
              <input
                className="input pr-10 w-full"
                placeholder="Buscar artista…"
                value={q}
                onChange={e=>setQ(e.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-5 w-5"/>
              </span>
            </div>
          </div>
        </div>

        {/* Grid de artistas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {loading ? Array.from({length:8}).map((_,i)=> <SkeletonCard key={i}/>) : (
            view.map(a => (
              <article key={a.slug} className="card-surface overflow-hidden rounded-3xl">
                <div className="flex items-center gap-3 p-4">
                  <Avatar name={a.name} src={a.avatar}/>
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-tight line-clamp-1">{a.name}</h3>
                    <div className="text-xs text-slate-500">{a.totalWorks} obra{a.totalWorks!==1?'s':''}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 px-4">
                  {a.samples.slice(0,3).map((s,idx)=>(
                    <img key={idx} src={s} className="h-20 w-full object-cover rounded-xl" alt="sample"/>
                  ))}
                </div>
                <div className="p-4">
                  <button
                    onClick={()=>navigate(`/donaciones/artista/${a.slug}`)}
                    className="btn btn-primary w-full"
                  >
                    Ver perfil y donar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function Avatar({ name, src }){
  if (src) return <img src={src} alt={name} className="h-10 w-10 rounded-full object-cover" />
  const initials = name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()
  return <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-white text-xs font-bold">{initials}</div>
}
function SkeletonCard(){
  return (
    <div className="card-surface rounded-3xl p-4">
      <div className="h-10 w-full bg-slate-200/70 rounded-xl animate-pulse mb-3" />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({length:3}).map((_,i)=> <div key={i} className="h-20 bg-slate-200/70 rounded-xl animate-pulse"/>)}
      </div>
      <div className="h-9 w-full bg-slate-200/70 rounded-xl animate-pulse mt-3"/>
    </div>
  )
}
function SearchIcon(props){
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-3.5-3.5"/>
  </svg>)
}
