import { adminPrisma } from './prisma'

interface LogParams {
  orgId:     string
  userId?:   string
  action:    string
  entity?:   string
  entityId?: string
  payload?:  Record<string, unknown>
}

/** Write an entry to activity_log. Fire-and-forget safe — errors are swallowed. */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    await adminPrisma.activityLog.create({
      data: {
        organization_id: params.orgId,
        user_id:         params.userId ?? null,
        action:          params.action,
        entity:          params.entity ?? null,
        entity_id:       params.entityId ?? null,
        payload:         params.payload ?? undefined,
      },
    })
  } catch {
    // Never let logging break the main operation
  }
}
