'use server'

import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'

export interface ActivityEntry {
  id:         string
  action:     string
  entity:     string | null
  entity_id:  string | null
  payload:    Record<string, unknown> | null
  created_at: string
  user_name:  string | null
  user_email: string | null
}

export async function listActivityAction(limit = 200): Promise<ActivityEntry[]> {
  const session = await auth()
  if (!session?.user?.orgId) return []

  const rows = await prisma.activityLog.findMany({
    where:   { organization_id: session.user.orgId },
    orderBy: { created_at: 'desc' },
    take:    limit,
    include: { user: { select: { name: true, email: true } } },
  })

  return rows.map(r => ({
    id:         r.id,
    action:     r.action,
    entity:     r.entity,
    entity_id:  r.entity_id,
    payload:    r.payload as Record<string, unknown> | null,
    created_at: r.created_at.toISOString(),
    user_name:  r.user?.name  ?? null,
    user_email: r.user?.email ?? null,
  }))
}
