import { ProfileAvatar } from '../../../shared/components/ui'

interface Props {
  name: string
  lastName: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes: Record<NonNullable<Props['size']>, number> = {
  sm: 28,
  md: 36,
  lg: 48,
}

export function UserAvatar({ name, lastName, avatarUrl = null, size = 'md' }: Props) {
  return (
    <ProfileAvatar
      name={name}
      lastName={lastName}
      src={avatarUrl}
      size={sizes[size]}
      rounded="xl"
    />
  )
}
