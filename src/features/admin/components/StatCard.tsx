// src/features/admin/components/users/StatCard.tsx

interface Props {
  label: string
  value: number
  colorClass: string
}

export function StatCard({ label, value, colorClass }: Props) {
  return (
    <div className="card p-4">
      <p className="text-text-secondary text-xs font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  )
}