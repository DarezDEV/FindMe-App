import { useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'

interface Comment {
  id: string
  text: string
  authorId: string
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onDelete: () => void
  onEdit: (newText: string) => void
  disabled?: boolean
}

export function CommentItem({ comment, currentUserId, onDelete, onEdit, disabled = false }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.text)

  const isAuthor = comment.authorId === currentUserId

  const handleSave = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onEdit(trimmed)
    setIsEditing(false)
  }

  return (
    <div className="rounded-[22px] border border-border bg-slate-50 p-4">
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
            disabled={disabled}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(comment.text)
                setIsEditing(false)
              }}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-text-secondary transition-all hover:text-text-primary disabled:opacity-50"
              disabled={disabled}
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary-soft px-3 py-2 text-primary transition-all hover:border-primary/30 disabled:opacity-50"
              disabled={disabled || !draft.trim()}
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              {isAuthor ? 'Tu nota' : 'Nota del equipo'}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary">{comment.text}</p>
          </div>
          {isAuthor ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-xl border border-transparent p-2 text-text-secondary transition-all hover:border-info/20 hover:bg-info/8 hover:text-info"
                disabled={disabled}
                aria-label="Editar comentario"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-xl border border-transparent p-2 text-text-secondary transition-all hover:border-error/20 hover:bg-error/8 hover:text-error"
                disabled={disabled}
                aria-label="Eliminar comentario"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
