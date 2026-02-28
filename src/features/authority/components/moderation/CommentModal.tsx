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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setValue('')
          onClose()
        }}
        aria-label="Cerrar modal de comentario"
      />
      <div className="relative w-full max-w-xl rounded-2xl border border-[#1a1f2e] bg-[#0d1018] p-6 shadow-2xl space-y-4">
        <h2 className="text-base font-bold text-slate-100">Comentario de moderacion</h2>
        <p className="text-sm text-slate-500">
          Caso seleccionado: <span className="font-medium text-amber-300">{caseName}</span>
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder="Escribe una observacion para la revision..."
          className="w-full resize-none rounded-xl border border-[#1e2535] bg-[#0f1117] px-4 py-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-amber-400/40 focus:outline-none"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-[#1e2535] bg-[#0f1117] px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            onClick={() => {
              setValue('')
              onClose()
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/15 transition-colors disabled:opacity-40"
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
