// src/pages/donations/ArtistDonate.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getArtistProfile } from '../../services/mockArtists.js'
import { donate } from '../../services/mockWallet.js'

export default function ArtistDonate(){
  const { slug } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  useEffect(()=>{
    let alive = true
    setLoading(true)
    getArtistProfile(slug).then(p=>{
      if(!alive) return
      setData(p); setLoading(false)
    })
    return ()=>{ alive = false }
  }, [slug])

  const onDonate = async ()=>{
    setErr('')
    const v = Number(amount)
    if (!v || v <= 0){ setErr('Ingresá un monto válido.'); return }
    setSaving(true)
    try{
      await donate(user, slug, v)
      setOk(true)
    }catch(e){
      setErr(e?.message || 'No se pudo procesar la donación.')
    }finally{
      setSaving(false)
    }
  }

  if (loading) return <section className="section-frame py-16"><div className="h-48 bg-slate-200/70 animate-pulse rounded-3xl"/></section>
  if (!data) return null

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="text-sm text-slate-500">
          <Link to="/donaciones" className="hover:underline">Donaciones</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-700 font-medium">{data.name}</span>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Perfil */}
          <div className="lg:col-span-2 card-surface p-6">
            <div className="flex items-center gap-4">
              <Avatar name={data.name} src={data.avatar} size={14}/>
              <div>
                <h1 className="text-2xl font-extrabold leading-tight">{data.name}</h1>
                {data.socials?.website && (
                  <a href={data.socials.website} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                    {data.socials.website}
                  </a>
                )}
              </div>
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed">{data.bio || 'El artista aún no agregó una biografía.'}</p>

            {/* Donar */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4">
              <label className="form-label">Monto a donar (ARS)</label>
              <input
                type="number"
                className="input"
                placeholder="Ej. 1000"
                min={0}
                value={amount}
                onChange={e=>setAmount(e.target.value)}
              />
              {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
              <button className="btn btn-primary w-full mt-3 disabled:opacity-60" onClick={onDonate} disabled={saving || !amount}>
                {saving ? 'Procesando…' : 'Donar'}
              </button>
              <button className="btn btn-outline w-full mt-2" onClick={()=>navigate('/donaciones')}>Volver</button>
            </div>
          </div>

          {/* Obras del artista */}
          <div className="lg:col-span-3 card-surface p-6">
            <h3 className="text-lg font-bold">Obras publicadas</h3>
            {data.works.length === 0 ? (
              <p className="mt-2 text-slate-600">Aún no hay obras publicadas por este artista.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.works.slice(0, 9).map(w=>(
                  <Link key={w.id} to={`/obra/${w.id}`} className="block group">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white/60">
                      <img src={w.image} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition"/>
                    </div>
                    <div className="mt-1 text-sm font-medium line-clamp-1">{w.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal éxito */}
      {ok && (
        <SuccessModal
          message="¡Gracias por tu donación! Se descontó el saldo de tu wallet."
          onClose={()=>{ setOk(false); }}
        />
      )}
    </section>
  )
}

function Avatar({ name, src, size = 10 }){
  if (src) return <img src={src} alt={name} className={`h-${size} w-${size} rounded-full object-cover`} />
  const initials = name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()
  return <div className={`grid h-${size} w-${size} place-items-center rounded-full bg-indigo-600 text-white text-sm font-bold`}>{initials}</div>
}

/* Modal simple reutilizable */
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
