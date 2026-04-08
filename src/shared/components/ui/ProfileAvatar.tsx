import { useMemo, useState } from 'react'

const DEFAULT_AVATAR_SRC = '/avatar-default.svg'

function getInitials(name: string | null | undefined, lastName: string | null | undefined): string {
  const first = (name ?? '').trim().charAt(0).toUpperCase()
  const second = (lastName ?? '').trim().charAt(0).toUpperCase()
  const combined = `${first}${second}`.trim()
  return combined || 'U'
}

export function ProfileAvatar({
  name,
  lastName,
  src,
  size = 32,
  rounded = 'full',
  className = '',
}: {
  name?: string | null
  lastName?: string | null
  src?: string | null
  size?: number
  rounded?: 'full' | 'xl'
  className?: string
}) {
  const [failedUserSrc, setFailedUserSrc] = useState<string | null>(null)
  const [defaultFailed, setDefaultFailed] = useState(false)

  const initials = useMemo(() => getInitials(name, lastName), [name, lastName])

  const normalizedSrc = (src ?? '').trim() || null
  const shouldUseUserSrc = Boolean(normalizedSrc) && failedUserSrc !== normalizedSrc

  const imgSrc = shouldUseUserSrc ? (normalizedSrc as string) : DEFAULT_AVATAR_SRC
  const borderRadius = rounded === 'xl' ? 12 : 9999

  if (defaultFailed) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius,
          background: 'rgba(50,102,219,0.10)',
          border: '1px solid rgba(50,102,219,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3266DB',
          fontWeight: 800,
          fontSize: Math.max(10, Math.round(size * 0.34)),
          lineHeight: 1,
          userSelect: 'none',
        }}
        aria-label="Avatar"
        title={`${(name ?? '').trim()} ${(lastName ?? '').trim()}`.trim() || 'Usuario'}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      className={className}
      src={imgSrc}
      alt={`${(name ?? '').trim()} ${(lastName ?? '').trim()}`.trim() || 'Avatar'}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{
        width: size,
        height: size,
        borderRadius,
        objectFit: 'cover',
        display: 'block',
        background: '#ffffff',
      }}
      onError={() => {
        if (shouldUseUserSrc) {
          setFailedUserSrc(normalizedSrc)
          return
        }
        setDefaultFailed(true)
      }}
    />
  )
}
