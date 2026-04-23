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
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <h2 className="text-base font-bold text-text-primary">Comentario de moderacion</h2>
        <p className="text-sm text-text-secondary">
          Caso seleccionado: <span className="font-medium text-primary">{caseName}</span>
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder="Escribe una observacion para la revision..."
          className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-secondary focus:border-primary/40 focus:outline-none"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => {
              setValue('')
              onClose()
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors disabled:opacity-40"
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

