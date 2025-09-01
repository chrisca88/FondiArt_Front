import { useState } from "react";

export default function FAQ() {
  const faqs = [
    { q: "¿Qué es FondiArt?",
      a: "Plataforma para invertir en obras tokenizadas y para que artistas publiquen sus obras." },
    { q: "¿Cómo compro fracciones?",
      a: "Registrate como comprador/a e ingresá a la sección “Comprar”. Allí verás obras disponibles, precio de referencia y detalle." },
    { q: "¿Soy artista, cómo publico?",
      a: "Registrate como artista y completá el formulario en “Publicar”. Nuestro equipo revisará y aprobará tu obra." },
  ];

  const [openIdx, setOpenIdx] = useState(null);
  const toggle = (i) => setOpenIdx(openIdx === i ? null : i);

  return (
    <div className="section-frame">
      <div className="card-surface p-8 sm:p-10 lg:p-14">
        <p className="eyebrow">Ayuda</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">Preguntas frecuentes</h2>

        <div className="space-y-4">
          {faqs.map((item, i) => {
            const open = openIdx === i;
            return (
              <div key={i}
                   className={`rounded-2xl border transition
                               ${open ? "border-indigo-300 shadow-indigo-100 shadow-lg bg-white/80"
                                      : "border-slate-200 bg-white/60 hover:bg-white/70"}`}>
                {/* Cabezal */}
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-center gap-4 text-left px-5 py-4"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                >
                  <span className="text-slate-900 font-semibold">{item.q}</span>

                  {/* Botón + / chevron animado */}
                  <span
                    className={`ml-auto h-8 w-8 grid place-items-center rounded-full border
                                transition-all duration-200
                                ${open ? "bg-indigo-600 text-white rotate-45 border-indigo-600"
                                       : "text-slate-700 border-slate-300"}`}
                    aria-hidden="true"
                    title={open ? "Cerrar" : "Abrir"}
                  >
                    +
                  </span>
                </button>

                {/* Panel */}
                <div id={`faq-panel-${i}`}
                     className={`grid overflow-hidden transition-all duration-300
                                 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="min-h-0 px-5 pb-5 text-slate-600">
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
