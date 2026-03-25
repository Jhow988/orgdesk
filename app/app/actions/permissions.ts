'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { buildModuleAccessMap, getEffectiveAccess, hasAccess, MODULES } from '@/lib/modules'
import type { AccessLevel } from '@/lib/modules'
import { logActivity } from '@/lib/activity'

/**
 * Checks if the current user has the required access level for a module.
 * Returns an error string if denied, null if allowed.
 * ORG_ADMIN / SUPER_ADMIN always pass.
 */
export async function checkModuleAccess(
  module: string,
  required: AccessLevel,
): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.orgId) return 'Não autenticado.'

  const role = session.user.role
  if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(role)) return null

  const membership = await prisma.membership.findUnique({
    where: { user_id_organization_id: { user_id: session.user.id, organization_id: session.user.orgId } },
    include: { permissions: true },
  })

  const custom: Record<string, AccessLevel> = {}
  for (const p of membership?.permissions ?? []) {
    custom[p.module] = p.access as AccessLevel
  }

  const effective = getEffectiveAccess(role, module, custom)
  return hasAccess(effective, required) ? null : 'Sem permissão para esta operação.'
}

async function requireOrgAdmin() {
  const session = await auth()
  if (!session?.user?.orgId) throw new Error('Não autenticado.')
  if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(session.user.role)) throw new Error('Sem permissão.')
  return { orgId: session.user.orgId, userId: session.user.id }
}

/** Load custom permissions for the current user (used in layout) */
export async function getMyModuleAccessAction(): Promise<Record<string, AccessLevel>> {
  const session = await auth()
  if (!session?.user?.orgId) return {}

  const role = session.user.role

  // ORG_ADMIN / SUPER_ADMIN always get full access — no custom restrictions
  if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(role)) {
    return buildModuleAccessMap(role, {})
  }

  const membership = await prisma.membership.findUnique({
    where: { user_id_organization_id: { user_id: session.user.id, organization_id: session.user.orgId } },
    include: { permissions: true },
  })

  const custom: Record<string, AccessLevel> = {}
  for (const p of membership?.permissions ?? []) {
    custom[p.module] = p.access as AccessLevel
  }

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

  const session = await auth()
  await logActivity({ orgId, userId: session?.user?.id, action: 'permissions.updated', entity: 'permissions', entityId: membershipId })
  revalidatePath('/settings/permissions')
  return {}
}
