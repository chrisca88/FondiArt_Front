// src/components/ui/ConfirmDialog.jsx
import { useEffect, useRef } from 'react'

/**
 * Modal de confirmación reutilizable
 * Props:
 * - open: boolean
 * - title, description: string
 * - confirmText, cancelText
 * - onConfirm, onCancel: fn
 * - loading: boolean
 * - confirmDisabled: boolean
 * - tone: 'primary' | 'danger'
 * - children: contenido adicional
 */
export default function ConfirmDialog({
  open,
  title = 'Confirmar acción',
  description = '',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  tone = 'primary',
  children
}) {
  const confirmRef = useRef(null)

  // Esc para cerrar
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  // Focus en confirmar
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 0)
  }, [open])

  if (!open) return null

  const confirmClass =
    tone === 'danger'
      ? 'btn btn-outline text-red-600 border-red-200 hover:bg-red-50'
      : 'btn btn-primary'

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      {/* Card */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-2xl bg-white ring-1 ring-slate-200 shadow-2xl p-6"
          onClick={(e)=> e.stopPropagation()}
        >
          <h3 className="text-lg font-bold">{title}</h3>
          {description && <p className="mt-1 text-slate-600">{description}</p>}

          {children && <div className="mt-4">{children}</div>}

          <div className="mt-6 flex justify-end gap-3">
            <button className="btn btn-outline" onClick={onCancel} disabled={loading}>
              {cancelText}
            </button>
            <button
              ref={confirmRef}
              className={confirmClass}
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
            >
              {loading ? 'Procesando…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
