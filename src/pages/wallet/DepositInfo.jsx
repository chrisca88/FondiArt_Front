// src/pages/wallet/DepositInfo.jsx
import { Link, useNavigate } from 'react-router-dom'
import authService from '../../services/authService.js'
import { useState } from 'react'

export default function DepositInfo(){
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)

  async function handleConfirm(){
    try {
      setSending(true)

      // llamada al endpoint real
      await authService.client.post('/finance/credit-my-account/', {})

      // redirige a wallet
      navigate('/wallet')
    } catch (err) {
      console.error('[DepositInfo] ERROR credit-my-account:', err?.response?.data || err)
      // Igual redirigimos porque el usuario ya hizo la transferencia
      navigate('/wallet')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50">
      <div className="section-frame pt-10 pb-6">
        <div className="relative overflow-hidden rounded-3xl bg-white/60 ring-1 ring-slate-200 p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-pink-200 blur-3xl opacity-70" />
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow">Wallet</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">¿Cómo ingresar dinero?</h1>
              <p className="lead text-slate-600 mt-2 max-w-3xl">
                Realizá una transferencia bancaria desde una cuenta en la que seas{' '}
                <strong>Titular o Cotitular</strong> hacia nuestras cuentas de inversión en Argentina.
              </p>
            </div>
            <Link to="/wallet" className="btn btn-outline">Volver a mi wallet</Link>
          </div>
        </div>
      </div>

      <div className="section-frame pb-16 space-y-8">
        {/* Aviso */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-bold text-amber-800">Aviso</h3>
          <ul className="mt-2 text-amber-900 list-disc pl-5 space-y-1">
            <li>Sólo se permiten transferencias electrónicas desde cuentas a tu nombre (titular o cotitular).</li>
            <li>Si tenés más de una cuenta o una cuenta con cotitulares, incluí la <strong>Referencia/Concepto</strong> que figura en esta página.</li>
            <li>La primera acreditación puede demorar hasta <strong>24 h hábiles</strong>.</li>
          </ul>
        </div>

        {/* En pesos */}
        <Section title="En pesos (ARS)">
          <div className="grid md:grid-cols-2 gap-6">
            <BankCard
              bank="Banco Río del Sur"
              account="Cuenta Corriente en Pesos (AR$)"
              cbu="0001234500001234567890"
              alias="FONDI.pesos.rio"
              razon="FONDIART S.A.S."
              referencia="REF: tu_email@ejemplo.com"
            />
            <BankCard
              bank="Banco Andino Federal"
              account="Cuenta Corriente en Pesos (AR$)"
              cbu="3210987600006543210098"
              alias="FONDI.pesos.andino"
              razon="FONDIART S.A.S."
              referencia="REF: tu DNI"
            />
          </div>
        </Section>

        {/* En dólares */}
        <Section title="En dólares (USD)">
          <div className="grid md:grid-cols-2 gap-6">
            <BankCard
              bank="Banco Río del Sur"
              account="Cuenta Corriente en Dólares (US$)"
              cbu="0001234500001234567005"
              alias="FONDI.usd.rio"
              razon="FONDIART S.A.S."
              referencia="REF: tu_email@ejemplo.com"
            />
            <BankCard
              bank="Banco Andino Federal"
              account="Cuenta Corriente en Dólares (US$)"
              cbu="3210987600006543210071"
              alias="FONDI.usd.andino"
              razon="FONDIART S.A.S."
              referencia="REF: tu DNI"
            />
          </div>
        </Section>

        {/* Tips */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900">Tips útiles</h3>
          <ul className="mt-2 text-slate-700 list-disc pl-5 space-y-1">
            <li>Conservá el comprobante de tu Home Banking por si fuera necesario validarlo.</li>
            <li>Si el banco pide CUIT/CUIL: <strong>30-71234567-8</strong></li>
            <li>Si tu banco permite “alias”, ingresá exactamente el alias indicado arriba.</li>
          </ul>

          <div className="mt-4">
            <button
              onClick={handleConfirm}
              className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={sending}
            >
              {sending ? 'Procesando…' : 'Ya hice la transferencia'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Section({ title, children }){
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
      {children}
    </div>
  )
}

function BankCard({ bank, account, cbu, alias, razon, referencia }){
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-slate-900">{bank}</h4>
          <p className="text-slate-600 text-sm">{account}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <Row label="CBU" value={cbu}/>
        <Row label="Alias" value={alias}/>
        <Row label="Razón Social" value={razon}/>
        <Row label="Referencia / Concepto" value={referencia}/>
      </div>
    </div>
  )
}

function Row({ label, value }){
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <code className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-800">{value}</code>
    </div>
  )
}
