// src/pages/projects/ProjectEdit.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getById, updateProject } from '../../services/mockProjects.js'

export default function ProjectEdit(){
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: '',
    goalARS: '',
  })

  useEffect(()=>{
    let alive = true
    setLoading(true)
    getById(id).then(p=>{
      if(!alive) return
      setForm({
        title: p.title || '',
        description: p.description || '',
        cover: p.cover || '',
        goalARS: p.goalARS ?? '',
      })
      setLoading(false)
    }).catch(()=>{
      navigate('/mis-proyectos', { replace:true })
    })
    return ()=>{ alive = false }
  }, [id, navigate])

  const onChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const onSubmit = async (e)=>{
    e.preventDefault()
    setError('')
    setSaving(true)
    try{
      await updateProject(id, {
        title: form.title?.trim(),
        description: form.description?.trim(),
        cover: form.cover?.trim(),
        goalARS: Number(form.goalARS) || 0,
      })
      setOk(true)
      setTimeout(()=> navigate('/mis-proyectos', { replace:true }), 1200)
    }catch(err){
      setError(err?.message || 'No se pudo guardar')
    }finally{
      setSaving(false)
    }
  }

  if (loading) return <section className="section-frame py-16"><div className="h-48 bg-slate-200/70 animate-pulse rounded-3xl"/></section>

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Proyectos</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Editar proyecto</h1>
          <p className="lead mt-2 max-w-2xl">Actualizá la información visible en la página del proyecto.</p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 sm:p-8 max-w-3xl space-y-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700 text-sm">{error}</div>}

          <div>
            <label className="form-label" htmlFor="title">Título</label>
            <input id="title" name="title" className="input" value={form.title} onChange={onChange}/>
          </div>

          <div>
            <label className="form-label" htmlFor="description">Descripción</label>
            <textarea id="description" name="description" className="input h-32" value={form.description} onChange={onChange}/>
          </div>

          <div>
            <label className="form-label" htmlFor="cover">URL de portada</label>
            <input id="cover" name="cover" className="input" placeholder="https://…" value={form.cover} onChange={onChange}/>
            {form.cover && (
              <div className="mt-3 rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white/60">
                <img src={form.cover} alt="cover preview" className="w-full max-h-64 object-cover"/>
              </div>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor="goalARS">Meta de recaudación (ARS)</label>
            <input id="goalARS" name="goalARS" type="number" className="input" value={form.goalARS} onChange={onChange}/>
          </div>

          <div className="pt-2 flex gap-3">
            <Link to="/mis-proyectos" className="btn btn-outline">Cancelar</Link>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>

          {ok && <div className="text-emerald-600 text-sm">¡Guardado!</div>}
        </form>
      </div>
    </section>
  )
}
