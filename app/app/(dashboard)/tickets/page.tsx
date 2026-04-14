import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listTicketsAction, getTicketStatsAction } from '@/app/actions/tickets'
import { TicketsClient } from './_components/TicketsClient'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const sp = await searchParams
  const page     = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const status   = sp.status   ?? 'all'
  const priority = sp.priority ?? 'all'
  const search   = sp.search   ?? ''

  const [result, stats] = await Promise.all([
    listTicketsAction({ page, status, priority, search }),
    getTicketStatsAction(),
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
        tickets={result.tickets as any}
        stats={stats}
        total={result.total}
        page={result.page}
        pages={result.pages}
        currentStatus={status}
        currentPriority={priority}
        currentSearch={search}
      />
    </div>
  )
}
