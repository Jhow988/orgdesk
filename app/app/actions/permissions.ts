'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { buildModuleAccessMap, getEffectiveAccess, hasAccess, MODULES } from '@/lib/modules'
import type { AccessLevel } from '@/lib/modules'
import { logActivity } from '@/lib/activity'
import { getCustomPermissions, invalidatePermissionsCache } from '@/lib/permissions-cache'

/**
 * Checks if the current user has the required access level for a module.
 * Returns an error string if denied, null if allowed.
 * ORG_ADMIN / SUPER_ADMIN always pass (sem consulta ao banco).
 * Demais roles: consulta cacheada (TTL 2 min) para evitar query por action.
 */
export async function checkModuleAccess(
  module: string,
  required: AccessLevel,
): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.orgId) return 'Não autenticado.'

  const role = session.user.role
  if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(role)) return null

  const custom = await getCustomPermissions(session.user.id, session.user.orgId)
  const effective = getEffectiveAccess(role, module, custom)
  return hasAccess(effective, required) ? null : 'Sem permissão para esta operação.'
}

async function requireOrgAdmin() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado.')
  if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) throw new Error('Sem permissão.')
  return { orgId: session.user.orgId, userId: session.user.id }
}

/** Load custom permissions for the current user (used in layout) — cacheado */
export async function getMyModuleAccessAction(): Promise<Record<string, AccessLevel>> {
  const session = await auth()
  if (!session?.user?.orgId) return {}

  const role = session.user.role

  if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(role)) {
    return buildModuleAccessMap(role, {})
  }

  const custom = await getCustomPermissions(session.user.id, session.user.orgId)
  return buildModuleAccessMap(role, custom)
}

/** List users in org with their membership_id and current custom permissions */
export async function listUsersWithPermissionsAction() {
  const { orgId } = await requireOrgAdmin()

  const memberships = await prisma.membership.findMany({
    where: { organization_id: orgId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      permissions: true,
    },
    orderBy: { created_at: 'asc' },
  })

  return memberships.map(m => ({
    membership_id: m.id,
    user_id:       m.user.id,
    name:          m.user.name,
    email:         m.user.email,
    role:          m.role as string,
    permissions:   Object.fromEntries(m.permissions.map(p => [p.module, p.access as AccessLevel])),
  }))
}

/** Save all module permissions for a given membership (full replace) */
export async function saveUserPermissionsAction(
  membershipId: string,
  permissions: Record<string, AccessLevel>,
): Promise<{ error?: string }> {
  const { orgId } = await requireOrgAdmin()

  // Confirm membership belongs to this org
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organization_id: orgId },
  })
  if (!membership) return { error: 'Usuário não encontrado.' }

  // Prevent restricting another ORG_ADMIN
  if (['ORG_ADMIN', 'SUPER_ADMIN'].includes(membership.role)) {
    return { error: 'Não é possível restringir permissões de administradores.' }
  }

  // Upsert each module permission
  const validModules = new Set(MODULES.map(m => m.key))

  await prisma.$transaction(
    Object.entries(permissions)
      .filter(([module]) => validModules.has(module))
      .map(([module, access]) =>
        prisma.memberPermission.upsert({
          where:  { membership_id_module: { membership_id: membershipId, module } },
          update: { access: access as any },
          create: { membership_id: membershipId, module, access: access as any },
        })
      )
  )

  // Invalida cache do usuário afetado para que a mudança seja refletida imediatamente
  invalidatePermissionsCache(membership.user_id, orgId)

  const session = await auth()
  await logActivity({ orgId, userId: session?.user?.id, action: 'permissions.updated', entity: 'permissions', entityId: membershipId })
  revalidatePath('/settings/permissions')
  return {}
}
