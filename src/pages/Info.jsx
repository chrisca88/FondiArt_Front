import { useSelector } from 'react-redux'

export default function Info(){
  const user = useSelector(s => s.auth.user) // si hay usuario logueado

  return (
    <div className="relative section-frame">
      {/* Halo decorativo */}
      <div className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-40
                      bg-gradient-to-b from-indigo-200/60 to-transparent blur-2xl" />
      <div className="card-surface p-8 sm:p-10 lg:p-14">
        <p className="eyebrow">Sobre FondiArt</p>
        <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight">
          Inversión en <span className="text-indigo-600">arte</span> tokenizado
        </h2>
        <p className="lead mt-4 max-w-3xl">
          FondiArt conecta artistas e inversores. Permitimos publicar obras y comprar
          fracciones tokenizadas de manera simple y segura.
        </p>

        <div className="divider my-8" />

        {/* Features */}
        <ul className="grid sm:grid-cols-2 gap-5">
          <Feature
            title="Tokenización segura"
            desc="Estructura on/off-chain y contratos listos para fraccionar propiedad."
          />
          <Feature
            title="Marketplace curado"
            desc="Catálogo con información de artista, historial y precio de referencia."
          />
          <Feature
            title="Flujo para artistas"
            desc="Publicación guiada, carga de imágenes y revisión."
          />
          <Feature
            title="Cuenta e identidad"
            desc="Registro por rol, autenticación y verificación de usuario."
          />
        </ul>

        {/* Stats / confianza */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
          <Stat label="Obras listadas" value="+120" />
          <Stat label="Artistas"       value="+60" />
          <Stat label="Inversores"     value="+1.2k" />
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {!user && <a href="/register" className="btn btn-primary">Crear cuenta</a>}
          <a href="/#faq" className="btn btn-outline">Preguntas frecuentes</a>
        </div>
      </div>
    </div>
  );
}

/* ---------- subcomponentes con ícono SVG liviano ---------- */

function Feature({ title, desc }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full
                       bg-indigo-600 text-white shadow-sm">
        {/* check icon */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">{desc}</p>
      </div>
    </li>
  );
}

function Stat({ label, value }){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/60 py-4">
      <div className="text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">{label}</div>
    </div>
  );
}
