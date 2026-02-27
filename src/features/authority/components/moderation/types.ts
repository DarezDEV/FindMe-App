export type PendingStatus = 'pending'

export interface PendingCaseItem {
  id: string
  caseNumber: string
  name: string
  age: number
  gender?: string | null
  location: string
  lastSeenPlace: string
  description: string
  createdBy: string
  createdAt: string
  missingDate: string
  birthDate?: string | null
  missingDateIso?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  caseStatusLabel: string
  workflowStatusLabel: string
  status: PendingStatus
  photoUrl?: string
}
