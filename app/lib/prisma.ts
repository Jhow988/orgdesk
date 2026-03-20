import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks'

export const tenantStorage = new AsyncLocalStorage<{ orgId: string }>()

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  client.$use(async (params, next) => {
    const store = tenantStorage.getStore()
    const orgId = store?.orgId

    if (!orgId) return next(params)

    // Injeta organization_id em creates (exceto Organization e User que são globais)
    const TENANT_MODELS = [
      'Client', 'ClientContact', 'Boleto', 'Invoice', 'Campaign',
      'CampaignSend', 'EmailLog', 'Ticket', 'TicketMessage', 'TicketAttachment',
      'Notification', 'ActivityLog', 'EmailTemplate', 'WebhookEvent', 'Membership',
    ]

    if (params.model && TENANT_MODELS.includes(params.model)) {
      if (params.action === 'create') {
        params.args.data = { ...params.args.data, organization_id: orgId }
      }
      if (params.action === 'createMany') {
        params.args.data = params.args.data.map((d: Record<string, unknown>) => ({
          ...d,
          organization_id: orgId,
        }))
      }
      if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
        params.args = params.args ?? {}
        params.args.where = { ...params.args.where, organization_id: orgId }
      }
      if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(params.action)) {
        params.args = params.args ?? {}
        params.args.where = { ...params.args.where, organization_id: orgId }
      }
    }

    return next(params)
  })

  return client
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Client admin sem RLS (para operações de super admin e resolução de tenant)
export const adminPrisma = new PrismaClient()
