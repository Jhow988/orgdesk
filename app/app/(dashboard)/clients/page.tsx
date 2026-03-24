import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ClientsTable } from './_components/ClientsTable'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ bling_connected?: string; bling_error?: string }>
}) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId = session.user.orgId
  const sp    = await searchParams

  const [clients, blingRow] = await Promise.all([
    adminPrisma.client.findMany({
      where:   { organization_id: orgId },
      orderBy: { name: 'asc' },
      select: {
        id:         true,
        cnpj:       true,
        name:       true,
        trade_name: true,
        email:      true,
        phone:      true,
        is_active:  true,
        bling_id:   true,
        created_at: true,
      },
    }),
    adminPrisma.blingIntegration.findUnique({
      where:  { organization_id: orgId },
      select: { last_sync_at: true },
    }),
  ])

  return (
    <div className="p-6">
      <ClientsTable
        clients={clients.map(c => ({ ...c, created_at: c.created_at.toISOString() }))}
        blingConnected={!!blingRow}
        lastSyncAt={blingRow?.last_sync_at?.toISOString() ?? null}
        flashConnected={sp.bling_connected === '1'}
        flashError={sp.bling_error}
      />
    </div>
  )
}
