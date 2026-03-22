import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'

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
    <div className="rounded-xl border border-border bg-card p-3.5">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary/50 focus:outline-none"
            disabled={disabled}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(comment.text)
                setIsEditing(false)
              }}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              disabled={disabled}
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
              disabled={disabled || !draft.trim()}
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{comment.text}</p>
          {isAuthor && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md border border-transparent hover:border-primary/25 hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                disabled={disabled}
                aria-label="Editar comentario"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-md border border-transparent hover:border-error/25 hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                disabled={disabled}
                aria-label="Eliminar comentario"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

