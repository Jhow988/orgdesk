import { UserRole } from '@prisma/client'

type Permission =
  | 'org:read' | 'org:write'
  | 'members:read' | 'members:manage'
  | 'clients:read' | 'clients:write' | 'clients:delete'
  | 'boletos:read' | 'boletos:write' | 'boletos:delete'
  | 'invoices:read' | 'invoices:write'
  | 'campaigns:read' | 'campaigns:write'
  | 'tickets:read' | 'tickets:write' | 'tickets:assign' | 'tickets:internal'
  | 'reports:financial' | 'reports:tickets'
  | 'settings:read' | 'settings:write'
  | 'activity:read'
  | 'portal:access'
  | 'admin:access'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'org:read', 'org:write',
    'members:read', 'members:manage',
    'clients:read', 'clients:write', 'clients:delete',
    'boletos:read', 'boletos:write', 'boletos:delete',
    'invoices:read', 'invoices:write',
    'campaigns:read', 'campaigns:write',
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:internal',
    'reports:financial', 'reports:tickets',
    'settings:read', 'settings:write',
    'activity:read',
    'admin:access',
  ],
  ORG_ADMIN: [
    'org:read', 'org:write',
    'members:read', 'members:manage',
    'clients:read', 'clients:write', 'clients:delete',
    'boletos:read', 'boletos:write', 'boletos:delete',
    'invoices:read', 'invoices:write',
    'campaigns:read', 'campaigns:write',
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:internal',
    'reports:financial', 'reports:tickets',
    'settings:read', 'settings:write',
    'activity:read',
  ],
  ORG_FINANCE: [
    'org:read',
    'members:read',
    'clients:read', 'clients:write',
    'boletos:read', 'boletos:write',
    'invoices:read', 'invoices:write',
    'campaigns:read', 'campaigns:write',
    'tickets:read',
    'reports:financial',
    'settings:read',
  ],
  ORG_SUPPORT: [
    'org:read',
    'members:read',
    'clients:read',
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:internal',
    'reports:tickets',
    'settings:read',
  ],
  CLIENT_PORTAL: [
    'portal:access',
    'boletos:read',
    'invoices:read',
    'tickets:read', 'tickets:write',
  ],
}

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Forbidden: role ${role} cannot perform ${permission}`)
  }
}

export function isInternalRole(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_FINANCE', 'ORG_SUPPORT'].includes(role)
}

export function isPortalRole(role: UserRole): boolean {
  return role === 'CLIENT_PORTAL'
}
