// src/pages/home/Home.jsx
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Info from './Info.jsx'
import FAQ from './FAQ.jsx'
import fondiartLogo from '../assets/fondiart-logo.png'

export default function Home(){
  const heroImg = "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop"

  const heroRef = useRef(null)
  const infoRef = useRef(null)
  const faqRef  = useRef(null)

  const [progress, setProgress] = useState({ hero:0, info:0, faq:0 })

  // 🔐 usuario autenticado
  const user = useSelector(s => s.auth.user)

  useEffect(()=>{
    const thresholds = Array.from({length: 21}, (_,i)=> i/20)
    const io = new IntersectionObserver((entries)=>{
      setProgress(prev=>{
        const next = { ...prev }
        entries.forEach(entry=>{
          const id = entry.target.id
          const ratio = Math.min(1, Math.max(0, entry.intersectionRatio))
          next[id] = Number((0.08 + ratio*0.22).toFixed(3))
        })
        return next
      })
    }, { threshold: thresholds, rootMargin: '-10% 0px -45% 0px' })
    ;[heroRef, infoRef, faqRef].forEach(r => r.current && io.observe(r.current))
    return ()=> io.disconnect()
  },[])

  const tints = {
    hero: '99 102 241',   // indigo-500
    info: '37 99 235',    // blue-600
    faq:  '234 88 12'     // orange-600
  }

  // utilidad para clases comunes de sección
  const sec = "section-bg scroll-mt-24 min-h-[calc(100vh-4rem)] flex items-center"

  return (
    <>
      {/* HERO */}
      <section
        ref={heroRef}
        id="hero"
        className={`${sec}`}
        style={{ '--tint': tints.hero, '--alpha': progress.hero }}
      >
        <div className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">

            {/* COLUMNA IZQUIERDA */}
            <div className="h-[420px] flex flex-col justify-center">
              <img
                src={fondiartLogo}
                alt="FondiArt"
                className="w-[260px] sm:w-[320px] lg:w-[360px] mb-6 object-contain"
                loading="eager"
              />

              <p className="text-lg text-slate-600 max-w-xl">
                Conectamos artistas e inversores. Comprá fracciones de obras o publicá tus obras si sos artista.
              </p>

              {/* Mostrar los botones SOLO si no hay usuario logueado */}
              {!user && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="/register" className="btn btn-primary">Crear cuenta</a>
                  <a href="/login" className="btn btn-outline">Iniciar sesión</a>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA */}
            <div className="relative">
              <div className="absolute -inset-2 -z-10 rounded-3xl bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-lg opacity-60"></div>
              <img
                src={heroImg}
                alt="Obras de arte"
                className="w-full h-[420px] object-cover rounded-3xl border border-slate-200 shadow-xl"
              />
            </div>

          </div>
        </div>
      </section>

      {/* INFO */}
      <section
        ref={infoRef}
        id="info"
        className={`${sec}`}
        style={{ '--tint': tints.info, '--alpha': progress.info }}
      >
        <div className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Info/>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        ref={faqRef}
        id="faq"
        className={`${sec}`}
        style={{ '--tint': tints.faq, '--alpha': progress.faq }}
      >
        <div className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FAQ/>
          </div>
        </div>
      </section>
    </>
  )
}
