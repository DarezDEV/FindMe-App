import { useState } from 'react'

interface Props {
  name: string
  lastName: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function UserAvatar({ name, lastName, avatarUrl, size = 'md' }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const initials = `${name?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'U'
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl

  return (
    <div className={`${sizes[size]} rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden`}>
      {showImage ? (
        <img
          src={avatarUrl ?? ''}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={() => setFailedUrl(avatarUrl ?? null)}
        />
      ) : (
        <span className="text-primary font-bold">
          {initials}
        </span>
      )}
    </div>
  )
}
