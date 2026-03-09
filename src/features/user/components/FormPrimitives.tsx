// Shared UI primitives reusable across all steps

interface LabelProps {
  children: React.ReactNode
  required?: boolean
}

export function Label({ children, required }: LabelProps) {
  return (
    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
      {children}
      {required && <span className="text-error normal-case font-normal ml-1">*</span>}
    </label>
  )
}

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: string[] | SelectOption[]
  placeholder?: string
}

interface SelectOption {
  value: string
  label: string
}

export function Select({ value, onChange, options, placeholder }: SelectProps) {
  const normalized: SelectOption[] = options.map(option =>
    typeof option === 'string' ? { value: option, label: option } : option
  )
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input-field">
      {placeholder && <option value="">{placeholder}</option>}
      {normalized.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
