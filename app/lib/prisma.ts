import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { AsyncLocalStorage } from 'async_hooks'

export const tenantStorage = new AsyncLocalStorage<{ orgId: string }>()

const TENANT_MODELS = [
  'Client', 'ClientContact', 'Boleto', 'Invoice', 'Campaign',
  'CampaignSend', 'EmailLog', 'Ticket', 'TicketMessage', 'TicketAttachment',
  'Notification', 'ActivityLog', 'EmailTemplate', 'WebhookEvent', 'Membership',
]

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const store = tenantStorage.getStore()
          const orgId = store?.orgId

          if (!orgId || !model || !TENANT_MODELS.includes(model)) {
            return query(args)
          }

          const a = args as Record<string, unknown>

          if (operation === 'create') {
            a['data'] = { ...(a['data'] as object), organization_id: orgId }
          }
          if (operation === 'createMany') {
            a['data'] = (a['data'] as Record<string, unknown>[]).map(d => ({
              ...d,
              organization_id: orgId,
            }))
          }
          if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            a['where'] = { ...(a['where'] as object), organization_id: orgId }
          }
          if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
            a['where'] = { ...(a['where'] as object), organization_id: orgId }
          }

          return query(a)
        },
      },
    },
  })

  return client
}

function createAdminClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

type PrismaClientType = ReturnType<typeof createClient>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
  adminPrisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createClient()
export const adminPrisma = globalForPrisma.adminPrisma ?? createAdminClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.adminPrisma = adminPrisma
}
