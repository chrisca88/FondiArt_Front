// src/pages/donations/ArtistDonate.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import authService from '../../services/authService.js'
import { getArtistProfile } from '../../services/mockArtists.js'

// helpers
const slugify = (s = '') =>
  String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const fixImageUrl = (url) => {
  if (typeof url !== 'string') return url
  const marker = 'https%3A/'
  const idx = url.indexOf(marker)
  if (idx !== -1) return 'https://' + url.substring(idx + marker.length)
  return url
}

export default function ArtistDonate(){
  const { slug } = useParams()
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  // DONACIÓN
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [okMsg, setOkMsg] = useState('')
  const [err, setErr] = useState('')

  // IDs y datos reales
  const [artistId, setArtistId] = useState(null)

  // OBRAS (API real)
  const [works, setWorks] = useState([])
  const [worksLoading, setWorksLoading] = useState(false)
  const [worksError, setWorksError] = useState('')

  // PROYECTOS (API real)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')

  const fmt = (n)=> Number(n||0).toLocaleString('es-AR')

  /* 1) Perfil (mock) */
  useEffect(()=>{
    let alive = true
    setLoading(true)
    setErr('')

    getArtistProfile(slug).then(p=>{
      if(!alive) return
      setData(p); setLoading(false)
    })

    return ()=>{ alive = false }
  }, [slug])

  /* 2) Resolver artistId desde /artists/ usando el mismo slugify que Donations.jsx */
  useEffect(()=>{
    let alive = true
    setArtistId(null)

    const path = '/artists/'
    if (import.meta.env.DEV) {
      console.log('[ARTIST DONATE] GET', (authService.client.defaults.baseURL || '') + path)
    }

    authService.client.get(path)
      .then(res=>{
        if(!alive) return
        const payload = res?.data
        const results = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : [])
        const found = results.find(a => slugify(a?.name || '') === slug)
        if (import.meta.env.DEV) {
          console.log('[ARTIST DONATE] /artists response count=', results.length, 'matchId=', found?.id, 'matchName=', found?.name)
        }
        if (found?.id != null) {
          setArtistId(Number(found.id))
        }
      })
      .catch(e=>{
        if(!alive) return
        if (import.meta.env.DEV) {
          console.error('[ARTIST DONATE] /artists error:', e?.response?.status, e?.response?.data || e?.message)
        }
      })

    return ()=>{ alive = false }
  }, [slug])

  /* 3) Con el artistId, pedir OBRAS: /users/<id>/artworks/ (soporta array o paginado) */
  useEffect(()=>{
    if (!artistId) return
    let alive = true
    setWorksLoading(true)
    setWorksError('')
    setWorks([])

    const path = `/users/${artistId}/artworks/`
    if (import.meta.env.DEV) {
      console.log('[ARTIST DONATE] GET', (authService.client.defaults.baseURL || '') + path)
    }

    authService.client.get(path)
      .then(res=>{
        if(!alive) return

        const payload = res?.data
        const results = Array.isArray(payload?.results) ? payload.results
                       : (Array.isArray(payload) ? payload : [])

        if (import.meta.env.DEV) {
          console.log('[ARTIST DONATE] /users/<id>/artworks RESPONSE -> status:', res?.status, 'count:', payload?.count ?? results.length, 'results.length:', results.length)
        }

        const mapped = results.map(w => ({
          id: Number(w?.id),
          title: w?.title || 'Obra',
          image: fixImageUrl(w?.image),
          price: Number(w?.price ?? 0),
          fractionFrom: Number(w?.fractionFrom ?? 0),
          fractionsTotal: Number(w?.fractionsTotal ?? 0),
          fractionsLeft: Number(w?.fractionsLeft ?? 0),
          status: String(w?.status || '').toLowerCase(),
          tags: Array.isArray(w?.tags) ? w.tags : [],
          createdAt: w?.createdAt,
          rating: {
            avg: Number(w?.rating?.avg ?? 0),
            count: Number(w?.rating?.count ?? 0),
            my: Number(w?.rating?.my ?? 0),
          }
        }))

        setWorks(mapped)
        setWorksLoading(false)
      })
      .catch(e=>{
        if(!alive) return
        setWorksError(e?.response?.data?.message || e?.message || 'No se pudieron cargar las obras del artista.')
        setWorksLoading(false)
        if (import.meta.env.DEV) {
          console.error('[ARTIST DONATE] /users/<id>/artworks error:', e?.response?.status, e?.response?.data || e?.message)
        }
      })

    return ()=>{ alive = false }
  }, [artistId])

  /* 4) Con el artistId, pedir PROYECTOS: /artists/<id>/projects/ (público) */
  useEffect(()=>{
    if (!artistId) return
    let alive = true
    setProjectsLoading(true)
    setProjectsError('')
    setProjects([])

    const path = `/artists/${artistId}/projects/`
    if (import.meta.env.DEV) {
      console.log('[ARTIST DONATE] GET', (authService.client.defaults.baseURL || '') + path)
    }

    authService.client.get(path)
      .then(res=>{
        if(!alive) return
        const payload = res?.data
        const results = Array.isArray(payload?.results) ? payload.results
                       : (Array.isArray(payload) ? payload : [])

        if (import.meta.env.DEV) {
          console.log('[ARTIST DONATE] /artists/<id>/projects RESPONSE -> status:', res?.status, 'count:', payload?.count ?? results.length)
        }

        const mapped = results.map(p => ({
          id: Number(p?.id),
          title: p?.title || '',
          description: p?.description || '',
          cover: fixImageUrl(p?.image || ''),            // backend "image" -> UI "cover"
          goalARS: Number(p?.funding_goal ?? 0),         // string decimal -> número
          raisedARS: Number(p?.amount_raised ?? 0),      // string decimal -> número
          backers: Number(p?.backers ?? 0),
          publicationDate: p?.publication_date || null,
          artistId: Number(p?.artist ?? artistId),
        }))

        setProjects(mapped)
        setProjectsLoading(false)
      })
      .catch(e=>{
        if(!alive) return
        setProjectsError(e?.response?.data?.message || e?.message || 'No se pudieron cargar los proyectos del artista.')
        setProjectsLoading(false)
        if (import.meta.env.DEV) {
          console.error('[ARTIST DONATE] /artists/<id>/projects error:', e?.response?.status, e?.response?.data || e?.message)
        }
      })

    return ()=>{ alive = false }
  }, [artistId])

  /* 5) DONAR con API real: POST /finance/donations/artist/ */
  const onDonate = async ()=>{
    setErr('')

    if (!user?.id) {
      setErr('Debés iniciar sesión para donar.')
      return
    }
    if (!artistId) {
      setErr('No se pudo identificar al artista. Intentá de nuevo.')
      return
    }
    if (Number(user?.id) === Number(artistId)) {
      setErr('No podés donar a tu propia cuenta.')
      return
    }

    const v = Number(amount)
    if (!Number.isFinite(v) || v < 0.01) {
      setErr('El monto debe ser al menos 0,01.')
      return
    }

    setSaving(true)
    try{
      const body = {
        artist: Number(artistId),          // <- clave correcta que espera el backend
        amount: Number(v).toFixed(2),      // <- string decimal con 2 dígitos
      }

      const path = '/finance/donations/artist/'
      if (import.meta.env.DEV) {
        const authHeader = authService.client.defaults.headers?.Authorization
        console.log('[DONATION ARTIST] REQUEST ->', {
          url: (authService.client.defaults.baseURL || '') + path,
          method: 'POST',
          body,
          headers: { Authorization: authHeader ? authHeader.slice(0, 32) + '…' : '(none)' }
        })
      }

      const res = await authService.client.post(path, body)
      if (import.meta.env.DEV) console.log('[DONATION ARTIST] RESPONSE ->', res?.status, res?.data)

      setOkMsg(`¡Gracias por tu donación de $${fmt(v)}!`)
      setOk(true)
      setAmount('')
    }catch(e){
      if (import.meta.env.DEV) {
        console.error('[DONATION ARTIST] ERROR ->', e?.response?.status, e?.response?.data || e?.message)
      }
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        (e?.response?.status === 402 ? 'Saldo insuficiente en la wallet.' :
         e?.response?.status === 404 ? 'El artista no existe o no es válido.' :
         e?.response?.status === 400 ? 'No se pudo procesar la donación (validación).' :
         e?.message) ||
        'No se pudo procesar la donación.'
      setErr(msg)
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
                min={0.01}
                step="0.01"
                value={amount}
                onChange={e=>setAmount(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Se aplicará una comisión del 2% al donante (cargo adicional).
              </p>
              {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
              <button
                className="btn btn-primary w-full mt-3 disabled:opacity-60"
                onClick={onDonate}
                disabled={saving || !amount}
              >
                {saving ? 'Procesando…' : 'Donar'}
              </button>
              <button className="btn btn-outline w-full mt-2" onClick={()=>navigate('/donaciones')}>Volver</button>
            </div>
          </div>

          {/* Obras del artista (API) */}
          <div className="lg:col-span-3 card-surface p-6">
            <h3 className="text-lg font-bold">Obras publicadas</h3>

            {worksLoading ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({length:6}).map((_,i)=>(
                  <div key={i} className="aspect-[4/3] rounded-2xl bg-slate-200/70 animate-pulse"/>
                ))}
              </div>
            ) : worksError ? (
              <p className="mt-2 text-red-600">{worksError}</p>
            ) : works.length === 0 ? (
              <p className="mt-2 text-slate-600">Aún no hay obras publicadas por este artista.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {works.slice(0, 9).map(w=>(
                  <Link key={w.id} to={`/obra/${w.id}`} className="block group">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white/60">
                      <img src={w.image} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition"/>
                    </div>
                    <div className="mt-1 text-sm font-medium line-clamp-1">{w.title}</div>
                  </Link>
                ))}
              </div>
            )}

            {/* Proyectos del artista (API) */}
            <div className="mt-6">
              <h3 className="text-lg font-bold">Proyectos del artista</h3>

              {projectsLoading ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({length:4}).map((_,i)=>(
                    <div key={i} className="rounded-2xl h-40 bg-slate-200/70 animate-pulse"/>
                  ))}
                </div>
              ) : projectsError ? (
                <p className="mt-2 text-red-600">{projectsError}</p>
              ) : projects.length === 0 ? (
                <p className="mt-2 text-slate-600">No hay proyectos publicados aún.</p>
              ) : (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {projects.map(p=>(
                    <article key={p.id} className="rounded-2xl ring-1 ring-slate-200 bg-white/70 overflow-hidden">
                      {p.cover ? (
                        <img src={p.cover} alt={p.title} className="w-full aspect-[4/3] object-cover"/>
                      ) : (
                        <div className="w-full aspect-[4/3] bg-slate-100"/>
                      )}
                      <div className="p-3">
                        <div className="font-semibold line-clamp-1">{p.title}</div>
                        <ProgressBar raised={p.raisedARS} goal={p.goalARS}/>
                        <button
                          type="button"
                          className="btn btn-outline w-full mt-2"
                          onClick={() => {
                            if (import.meta.env.DEV) console.log('[ARTIST DONATE] go project ->', p.id)
                            navigate(`/proyecto/${p.id}`)
                          }}
                        >
                          Ver proyecto
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal éxito */}
      {ok && (
        <SuccessModal
          message={okMsg || '¡Gracias por tu donación! Se descontó el saldo de tu wallet.'}
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

function ProgressBar({ raised=0, goal=0 }){
  const pct = Math.min(100, Math.round((Number(raised)/Math.max(1,Number(goal)))*100))
  const fmt = (n)=> Number(n||0).toLocaleString('es-AR')
  return (
    <div className="mt-2">
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }}/>
      </div>
      <div className="mt-1 text-xs text-slate-600">Recaudado ${fmt(raised)} de ${fmt(goal)} • {pct}%</div>
    </div>
  )
}
