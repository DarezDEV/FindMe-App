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
    <div className="border border-border rounded-lg p-3 bg-background">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="input-field resize-none"
            disabled={disabled}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(comment.text)
                setIsEditing(false)
              }}
              className="btn-secondary !px-3 !py-1.5"
              disabled={disabled}
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary !px-3 !py-1.5"
              disabled={disabled || !draft.trim()}
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-text-secondary leading-relaxed">{comment.text}</p>
          {isAuthor && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-md hover:bg-primary-soft text-text-secondary"
                disabled={disabled}
                aria-label="Editar comentario"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-md hover:bg-error/10 text-error"
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
