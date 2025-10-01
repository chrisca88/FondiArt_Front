// src/pages/projects/ProjectForm.jsx
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { createProject } from '../../services/mockProjects.js'

export default function ProjectForm(){
  const user = useSelector(s => s.auth.user)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    cover: '',
    goalARS: '',
  })
  const [saving, setSaving] = useState(false)

  const onChange = (e)=>{
    const { name, value } = e.target
    setForm(f=>({ ...f, [name]: value }))
  }

  const onSubmit = async (e)=>{
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try{
      const created = await createProject({
        user,
        title: form.title,
        description: form.description,
        cover: form.cover,
        goalARS: Number(form.goalARS),
      })
      navigate(`/proyecto/${created.id}`, { replace:true })
    }finally{
      setSaving(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <p className="eyebrow">Proyectos</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Nuevo proyecto</h1>
          <p className="lead mt-2 max-w-2xl">Publicá una idea o serie a financiar mediante donaciones.</p>
        </div>

        <form onSubmit={onSubmit} className="card-surface p-6 max-w-3xl space-y-5">
          <div>
            <label className="form-label" htmlFor="title">Título</label>
            <input id="title" name="title" className="input" placeholder="Ej. Serie Montañas de Luz" value={form.title} onChange={onChange}/>
          </div>
          <div>
            <label className="form-label" htmlFor="description">Descripción</label>
            <textarea id="description" name="description" className="input h-36" placeholder="Contá de qué se trata…" value={form.description} onChange={onChange}/>
          </div>
          <div>
            <label className="form-label" htmlFor="cover">Imagen de portada (URL)</label>
            <input id="cover" name="cover" className="input" placeholder="https://…" value={form.cover} onChange={onChange}/>
          </div>
          <div>
            <label className="form-label" htmlFor="goalARS">Meta de recaudación (ARS)</label>
            <input id="goalARS" name="goalARS" type="number" min="0" className="input" placeholder="Ej. 250000" value={form.goalARS} onChange={onChange}/>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Publicando…' : 'Publicar proyecto'}</button>
            <Link to="/donaciones" className="btn btn-outline">Cancelar</Link>
          </div>
        </form>
      </div>
    </section>
  )
}
