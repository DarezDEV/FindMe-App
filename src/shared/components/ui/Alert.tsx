interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
}

export function Alert({ type, message }: AlertProps) {
  const styles = {
    error:   'bg-error/8 border-error/25 text-error',
    success: 'bg-success/8 border-success/25 text-success',
    warning: 'bg-warning/8 border-warning/25 text-warning',
    info:    'bg-info/8 border-info/25 text-info',
  }
  return (
    <div className={`border text-sm px-4 py-3 rounded-lg ${styles[type]}`}>
      {message}
    </div>
  )
}