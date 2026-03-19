import { useState } from 'react'

interface CommentModalProps {
  open: boolean
  caseName: string
  onClose: () => void
  onSave: (comment: string) => void
}

export function CommentModal({ open, caseName, onClose, onSave }: CommentModalProps) {
  const [value, setValue] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={() => {
          setValue('')
          onClose()
        }}
        aria-label="Cerrar modal de comentario"
      />
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
        <h2 className="text-base font-bold text-slate-900">Comentario de moderacion</h2>
        <p className="text-sm text-slate-500">
          Caso seleccionado: <span className="font-medium text-blue-600">{caseName}</span>
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder="Escribe una observacion para la revision..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-600 focus:border-blue-500/40 focus:outline-none"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            onClick={() => {
              setValue('')
              onClose()
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-500/15 transition-colors disabled:opacity-40"
            onClick={() => {
              onSave(value.trim())
              setValue('')
            }}
            disabled={!value.trim()}
          >
            Guardar comentario
          </button>
        </div>
      </div>
    </div>
  )
}

