import { useEffect, useState } from 'react'

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
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [avatarUrl])

  const initials = `${name?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'U'
  const showImage = Boolean(avatarUrl) && !imageFailed

  return (
    <div className={`${sizes[size]} rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden`}>
      {showImage ? (
        <img
          src={avatarUrl ?? ''}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-primary font-bold">
          {initials}
        </span>
      )}
    </div>
  )
}
