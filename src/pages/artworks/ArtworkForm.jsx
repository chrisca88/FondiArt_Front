import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { createArtwork } from '../../features/artworks/artworksSlice'

export default function ArtworkForm(){
  const [form, setForm] = useState({ title:'', description:'', price_reference:'', image:'' })
  const [message, setMessage] = useState(null)
  const dispatch = useDispatch()

  const onChange = (e)=> setForm({...form, [e.target.name]: e.target.value})

  const onSubmit = async (e)=>{
    e.preventDefault()
    setMessage(null)
    const action = await dispatch(createArtwork(form))
    if(createArtwork.fulfilled.match(action)){
      setMessage('Obra publicada con éxito.')
      setForm({ title:'', description:'', price_reference:'', image:'' })
    }else{
      setMessage('No se pudo publicar. Verificá los datos.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <div>
        <label className="block mb-1">Título</label>
        <input name="title" value={form.title} onChange={onChange} className="w-full border rounded px-3 py-2" required/>
      </div>
      <div>
        <label className="block mb-1">Descripción</label>
        <textarea name="description" value={form.description} onChange={onChange} className="w-full border rounded px-3 py-2" rows="4" required/>
      </div>
      <div>
        <label className="block mb-1">Precio de referencia</label>
        <input name="price_reference" value={form.price_reference} onChange={onChange} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block mb-1">URL de imagen</label>
        <input name="image" value={form.image} onChange={onChange} className="w-full border rounded px-3 py-2" />
      </div>
      {message && <p className="text-sm">{message}</p>}
      <button className="rounded bg-black text-white px-4 py-2">Publicar</button>
    </form>
  )
}
