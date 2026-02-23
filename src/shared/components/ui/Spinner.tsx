interface SpinnerProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Spinner({ fullScreen = false, size = 'md' }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }

  const spinner = (
    <div className={`${sizes[size]} border-2 border-primary border-t-transparent rounded-full animate-spin`} />
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {spinner}
      </div>
    )
  }
  return spinner
}