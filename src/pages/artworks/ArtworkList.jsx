import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchArtworks } from '../../features/artworks/artworksSlice'

export default function ArtworkList(){
  const dispatch = useDispatch()
  const { items, status } = useSelector(s=>s.artworks)

  useEffect(()=>{ dispatch(fetchArtworks()) }, [dispatch])

  if(status === 'loading') return <p>Cargando obras...</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((it)=> (
        <div key={it.id} className="border rounded shadow-sm overflow-hidden">
          {it.image && <img src={it.image} alt={it.title} className="w-full h-48 object-cover" />}
          <div className="p-4">
            <h2 className="font-semibold">{it.title}</h2>
            <p className="text-sm text-gray-600">{it.artist_name}</p>
            <p className="text-sm mt-2 line-clamp-3">{it.description}</p>
            <div className="mt-3 text-sm">Precio referencia: {it.price_reference ?? '—'}</div>
            <button className="mt-4 w-full rounded bg-black text-white py-2">Ver detalles</button>
          </div>
        </div>
      ))}
      {items.length===0 && <p>No hay obras disponibles por el momento.</p>}
    </div>
  )
}
