import { useEffect, useState } from 'react'

export default function ScrollTopButton(){
  const [show, setShow] = useState(false)

  useEffect(()=>{
    const onScroll = ()=>{
      const y = window.scrollY || document.documentElement.scrollTop
      setShow(y > 300)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return ()=> window.removeEventListener('scroll', onScroll)
  },[])

  if(!show) return null

  return (
    <button
      onClick={()=> window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-xl bg-white border border-slate-200 text-slate-700
                 hover:bg-slate-50 transition flex items-center justify-center"
      aria-label="Volver arriba"
      title="Volver arriba"
    >
      ↑
    </button>
  )
}
