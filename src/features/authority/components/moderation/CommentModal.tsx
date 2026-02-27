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
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => {
          setValue('')
          onClose()
        }}
        aria-label="Cerrar modal de comentario"
      />
      <div className="relative card p-6 w-full max-w-lg space-y-4 border border-border/80 shadow-lg">
        <h2 className="text-lg font-semibold text-text-primary">Comentario de moderacion</h2>
        <p className="text-sm text-text-secondary">
          Caso seleccionado: <span className="font-medium">{caseName}</span>
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder="Escribe una observacion para la revision..."
          className="input-field resize-none !leading-relaxed"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setValue('')
              onClose()
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
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
