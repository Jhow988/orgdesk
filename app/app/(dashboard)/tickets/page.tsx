import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { listTicketsAction, getTicketStatsAction } from '@/app/actions/tickets'
import { TicketsClient } from './_components/TicketsClient'

export default async function TicketsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId = session.user.orgId

  const [tickets, stats, clients] = await Promise.all([
    listTicketsAction(),
    getTicketStatsAction(),
    prisma.client.findMany({
      where:   { organization_id: orgId, is_active: true },
      select:  { id: true, name: true, cnpj: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Chamados</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie solicitações e chamados dos clientes.
        </p>
      </div>

      <TicketsClient
        tickets={tickets as any}
        stats={stats}
        clients={clients}
      />
    </div>
  )
}
