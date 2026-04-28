import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { supabase } from '../../../lib/supabase/client'

export type DashboardRole = 'admin' | 'authority'
export type DateWindow = 7 | 30
export type WorkflowFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'found' | 'closed'

export interface DashboardFilters {
  dateWindow: DateWindow
  status: WorkflowFilter
  city: string
}

export interface DashboardCaseRow {
  id: string
  numero_caso: string
  nombres: string
  apellidos: string
  ciudad: string | null
  workflow_status: WorkflowFilter | null
  created_at: string
  status: string
}

export interface DashboardMetrics {
  totalCases: number
  activeCases: number
  resolvedCases: number
  pendingCases: number
  resolutionRate: number
  usersRegistered: number
  recentUsersRegistered: number
  cityBreakdown: Array<{ city: string; count: number }>
  byDate: Array<{ date: string; count: number }>
  recentActivity: DashboardCaseRow[]
  filteredCases: DashboardCaseRow[]
  recentUsers: DashboardUserRow[]
  uniqueCities: string[]
}

function getLabelDate(dateIso: string): string {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'N/D'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short' }).format(parsed)
}

function getStartDate(windowDays: DateWindow): string {
  const now = new Date()
  now.setDate(now.getDate() - windowDays)
  return now.toISOString()
}

export async function getDashboardMetrics(
  role: DashboardRole,
  filters: DashboardFilters,
): Promise<DashboardMetrics> {
  // Consulta única de casos con filtros para alimentar métricas, gráficas y exportes.
  let query = supabase
    .from('cases')
    .select('id, numero_caso, nombres, apellidos, ciudad, workflow_status, created_at, status')
    .eq('eliminado', false)
    .gte('created_at', getStartDate(filters.dateWindow))
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters.status !== 'all') {
    query = query.eq('workflow_status', filters.status)
  }
  if (filters.city !== 'all') {
    query = query.eq('ciudad', filters.city)
  }

  const { data: caseRows, error } = await query
  if (error) {
    throw new Error('No se pudieron cargar las metricas del dashboard.')
  }

  const rows = (caseRows ?? []) as DashboardCaseRow[]
  const cityMap = new Map<string, number>()
  const dateMap = new Map<string, number>()
  const citySet = new Set<string>()

  let activeCases = 0
  let resolvedCases = 0
  let pendingCases = 0

  rows.forEach((row) => {
    if (row.ciudad?.trim()) {
      citySet.add(row.ciudad)
      cityMap.set(row.ciudad, (cityMap.get(row.ciudad) ?? 0) + 1)
    }

    const dateLabel = getLabelDate(row.created_at)
    dateMap.set(dateLabel, (dateMap.get(dateLabel) ?? 0) + 1)

    if (row.workflow_status === 'found' || row.workflow_status === 'closed' || row.status === 'resuelto') {
      resolvedCases += 1
    } else {
      activeCases += 1
    }

    if (row.workflow_status === 'pending' || row.workflow_status === null) {
      pendingCases += 1
    }
  })

  let usersRegistered = 0
  let recentUsersRegistered = 0
  let recentUsers: DashboardUserRow[] = []
  if (role === 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    usersRegistered = count ?? 0

    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id, name, last_name, email, created_at')
      .gte('created_at', getStartDate(filters.dateWindow))
      .order('created_at', { ascending: false })
      .limit(8)

    recentUsers = (recentProfiles ?? []) as DashboardUserRow[]
    recentUsersRegistered = recentUsers.length
  }

  const resolutionRate = rows.length > 0 ? Math.round((resolvedCases / rows.length) * 100) : 0

  return {
    totalCases: rows.length,
    activeCases,
    resolvedCases,
    pendingCases,
    resolutionRate,
    usersRegistered,
    recentUsersRegistered,
    cityBreakdown: [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byDate: [...dateMap.entries()].map(([date, count]) => ({ date, count })).slice(-filters.dateWindow),
    recentActivity: rows.slice(0, 8),
    filteredCases: rows,
    recentUsers,
    uniqueCities: ['all', ...[...citySet].sort((a, b) => a.localeCompare(b, 'es'))],
  }
}

function caseExportRows(cases: DashboardCaseRow[]) {
  return cases.map((item) => ({
    'Numero de caso': item.numero_caso,
    Nombre: `${item.nombres} ${item.apellidos}`,
    Ciudad: item.ciudad ?? 'Sin ciudad',
    Estado: item.workflow_status ?? 'pending',
    'Fecha de creacion': new Date(item.created_at).toLocaleString('es-DO'),
  }))
}

export function exportCasesToExcel(cases: DashboardCaseRow[], fileName: string) {
  // El archivo conserva las columnas clave solicitadas para auditoría operativa.
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(caseExportRows(cases))
  XLSX.utils.book_append_sheet(wb, ws, 'Casos')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

export interface DashboardUserRow {
  id: string
  name: string | null
  last_name: string | null
  email: string | null
  created_at: string | null
}

export type ReportKind =
  | 'cases_detailed'
  | 'cases_by_status'
  | 'cases_by_city'
  | 'cases_timeline'
  | 'executive_summary'
  | 'users_recent'

export async function getUsersForReport(): Promise<DashboardUserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, last_name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    throw new Error('No se pudo generar el reporte de usuarios.')
  }

  return (data ?? []) as DashboardUserRow[]
}

export function exportUsersToExcel(users: DashboardUserRow[], fileName: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(
    users.map((user) => ({
      Nombre: `${user.name ?? ''} ${user.last_name ?? ''}`.trim() || 'Sin nombre',
      Email: user.email ?? 'Sin email',
      'Fecha de registro': user.created_at ? new Date(user.created_at).toLocaleString('es-DO') : 'Sin fecha',
    })),
  )
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

export async function exportCasesToPdf(cases: DashboardCaseRow[], title: string) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(10)
  let y = 28

  cases.slice(0, 30).forEach((item) => {
    const line = `${item.numero_caso} | ${item.nombres} ${item.apellidos} | ${item.ciudad ?? 'Sin ciudad'} | ${item.workflow_status ?? 'pending'}`
    if (y > 280) {
      doc.addPage()
      y = 16
    }
    doc.text(line, 14, y)
    y += 8
  })

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`)
}

function getStatusBreakdownRows(cases: DashboardCaseRow[]) {
  const map = new Map<string, number>()
  cases.forEach((item) => {
    const status = item.workflow_status ?? 'pending'
    map.set(status, (map.get(status) ?? 0) + 1)
  })
  return [...map.entries()].map(([estado, cantidad]) => ({ Estado: estado, Cantidad: cantidad }))
}

function getCityBreakdownRows(cases: DashboardCaseRow[]) {
  const map = new Map<string, number>()
  cases.forEach((item) => {
    const city = item.ciudad ?? 'Sin ciudad'
    map.set(city, (map.get(city) ?? 0) + 1)
  })
  return [...map.entries()].map(([Ciudad, Cantidad]) => ({ Ciudad, Cantidad }))
}

function getTimelineRows(cases: DashboardCaseRow[]) {
  const map = new Map<string, number>()
  cases.forEach((item) => {
    const day = new Date(item.created_at).toLocaleDateString('es-DO')
    map.set(day, (map.get(day) ?? 0) + 1)
  })
  return [...map.entries()].map(([Fecha, Cantidad]) => ({ Fecha, Cantidad }))
}

export function exportDashboardReportToExcel(args: {
  kind: ReportKind
  cases: DashboardCaseRow[]
  users: DashboardUserRow[]
  metrics: DashboardMetrics
  fileName: string
}) {
  const { kind, cases, users, metrics, fileName } = args
  const wb = XLSX.utils.book_new()

  if (kind === 'cases_detailed') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(caseExportRows(cases)), 'Casos Detallado')
  } else if (kind === 'cases_by_status') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getStatusBreakdownRows(cases)), 'Casos por Estado')
  } else if (kind === 'cases_by_city') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getCityBreakdownRows(cases)), 'Casos por Ciudad')
  } else if (kind === 'cases_timeline') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(getTimelineRows(cases)), 'Timeline Casos')
  } else if (kind === 'users_recent') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users.map((u) => ({
      Nombre: `${u.name ?? ''} ${u.last_name ?? ''}`.trim() || 'Sin nombre',
      Email: u.email ?? 'Sin email',
      'Fecha de registro': u.created_at ? new Date(u.created_at).toLocaleString('es-DO') : 'Sin fecha',
    }))), 'Usuarios')
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      'Total casos': metrics.totalCases,
      'Casos activos': metrics.activeCases,
      'Casos resueltos': metrics.resolvedCases,
      'Casos pendientes': metrics.pendingCases,
      'Tasa de resolucion (%)': metrics.resolutionRate,
      'Usuarios registrados': metrics.usersRegistered,
      'Usuarios recientes': metrics.recentUsersRegistered,
    }]), 'Resumen Ejecutivo')
  }

  XLSX.writeFile(wb, `${fileName}.xlsx`)
}
