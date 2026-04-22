import { createNotificationsForUsers, createNotificationForRole } from './notifications'

export type CaseNotificationType =
  | 'case_reported'
  | 'case_approved'
  | 'case_rejected'
  | 'case_found'
  | 'case_closed'
  | 'case_deleted'
  | 'case_updated'
  | 'sighting_reported'

interface CaseEventData {
  caseId: string
  caseNumber: string
  personName: string
  city?: string
  reportedBy?: string
  updatedBy?: string
  metadata?: Record<string, unknown>
}

export async function notifyCaseReported(data: CaseEventData): Promise<string[]> {
  const title = 'Nuevo caso reportado'
  const message = `Se ha reportado un nuevo caso: ${data.personName} (${data.caseNumber})`

  if (data.city) {
    return createNotificationForRole({
      role: 'authority',
      type: 'case_reported',
      title,
      message: `${message} - ${data.city}`,
      metadata: {
        caseId: data.caseId,
        caseNumber: data.caseNumber,
        personName: data.personName,
        city: data.city,
        ...data.metadata,
      },
    })
  }

  return createNotificationForRole({
    role: 'authority',
    type: 'case_reported',
    title,
    message,
    metadata: {
      caseId: data.caseId,
      caseNumber: data.caseNumber,
      personName: data.personName,
      ...data.metadata,
    },
  })
}

export async function notifyCaseApproved(data: CaseEventData): Promise<string[]> {
  const title = 'Caso aprobado'
  const message = `El caso ${data.caseNumber} - ${data.personName} ha sido aprobado`

  return createNotificationsForUsers({
    userIds: data.reportedBy ? [data.reportedBy] : [],
    type: 'case_approved',
    title,
    message,
    metadata: {
      caseId: data.caseId,
      caseNumber: data.caseNumber,
      personName: data.personName,
    },
  })
}

export async function notifyCaseRejected(data: CaseEventData): Promise<string[]> {
  const title = 'Caso rechazado'
  const message = `El caso ${data.caseNumber} - ${data.personName} ha sido rechazado`

  return createNotificationsForUsers({
    userIds: data.reportedBy ? [data.reportedBy] : [],
    type: 'case_rejected',
    title,
    message,
    metadata: {
      caseId: data.caseId,
      caseNumber: data.caseNumber,
      personName: data.personName,
    },
  })
}

export async function notifyCaseFound(data: CaseEventData): Promise<string[]> {
  const title = 'Caso encontrado'
  const message = `La persona del caso ${data.caseNumber} - ${data.personName} ha sido encontrada`

  const userIds = data.reportedBy ? [data.reportedBy] : []
  
  if (data.city) {
    createNotificationForRole({
      role: 'authority',
      type: 'case_found',
      title: `Caso encontrado en ${data.city}`,
      message: `${data.caseNumber} - ${data.personName} ha sido marcado como encontrado`,
      metadata: {
        caseId: data.caseId,
        caseNumber: data.caseNumber,
        personName: data.personName,
        city: data.city,
      },
    })
  }

  if (userIds.length > 0) {
    return createNotificationsForUsers({
      userIds,
      type: 'case_found',
      title,
      message,
      metadata: {
        caseId: data.caseId,
        caseNumber: data.caseNumber,
        personName: data.personName,
      },
    })
  }

  return []
}

export async function notifyCaseClosed(data: CaseEventData): Promise<string[]> {
  const title = 'Caso cerrado'
  const message = `El caso ${data.caseNumber} - ${data.personName} ha sido cerrado`

  return createNotificationsForUsers({
    userIds: data.reportedBy ? [data.reportedBy] : [],
    type: 'case_closed',
    title,
    message,
    metadata: {
      caseId: data.caseId,
      caseNumber: data.caseNumber,
      personName: data.personName,
    },
  })
}

export async function notifyCaseDeleted(data: CaseEventData): Promise<string[]> {
  const title = 'Caso eliminado'
  const message = `El caso ${data.caseNumber} - ${data.personName} ha sido eliminado`

  const userIds = data.reportedBy ? [data.reportedBy] : []

  if (userIds.length > 0) {
    return createNotificationsForUsers({
      userIds,
      type: 'case_deleted',
      title,
      message,
      metadata: {
        caseId: data.caseId,
        caseNumber: data.caseNumber,
        personName: data.personName,
      },
    })
  }

  return []
}

export async function notifyCaseUpdated(data: CaseEventData): Promise<string[]> {
  const title = 'Caso actualizado'
  const message = `El caso ${data.caseNumber} - ${data.personName} ha sido actualizado`

  return createNotificationsForUsers({
    userIds: data.reportedBy ? [data.reportedBy] : [],
    type: 'case_updated',
    title,
    message,
    metadata: {
      caseId: data.caseId,
      caseNumber: data.caseNumber,
      personName: data.personName,
      updatedBy: data.updatedBy,
    },
  })
}

export async function notifySightingReported(data: {
  caseId: string
  caseNumber: string
  personName: string
  location?: string
  reportedBy?: string
}): Promise<string[]> {
  const title = 'Nuevo avistamiento reportado'
  const message = `Se ha reportado un avistamiento relacionado con ${data.personName} (${data.caseNumber})`

  const metadata = {
    caseId: data.caseId,
    caseNumber: data.caseNumber,
    personName: data.personName,
    location: data.location,
  }

  if (data.location) {
    return createNotificationForRole({
      role: 'authority',
      type: 'sighting_reported',
      title,
      message: `${message} - ${data.location}`,
      metadata,
    })
  }

  return createNotificationForRole({
    role: 'authority',
    type: 'sighting_reported',
    title,
    message,
    metadata,
  })
}

export async function notifyAdminOfNewUser(userId: string, userName: string, userEmail: string): Promise<string[]> {
  return createNotificationForRole({
    role: 'admin',
    type: 'info',
    title: 'Nuevo usuario registrado',
    message: `${userName} (${userEmail}) se ha registrado en la plataforma`,
    metadata: { userId, userName, userEmail },
  })
}

export async function notifyUserOfRoleChange(userId: string, userName: string, oldRole: string, newRole: string): Promise<string[]> {
  const title = 'Rol actualizado'
  const message = `Tu rol ha cambiado de ${oldRole} a ${newRole}`

  return createNotificationsForUsers({
    userIds: [userId],
    type: 'account_status_changed',
    title,
    message,
    metadata: { userName, oldRole, newRole },
  })
}