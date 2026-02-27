interface Props {
  name: string
  lastName: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function UserAvatar({ name, lastName, size = 'md' }: Props) {
  return (
    <div className={`${sizes[size]} rounded-xl bg-primary/10 flex items-center justify-center shrink-0`}>
      <span className="text-primary font-bold">
        {name[0]}{lastName[0]}
      </span>
    </div>
  )
}