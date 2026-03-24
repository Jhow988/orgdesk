import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { adminPrisma } from '@/lib/prisma'
import ReceivablesPanel from './_components/ReceivablesPanel'

interface PageProps {
  searchParams: Promise<{
    from?:   string
    to?:     string
    status?: string
  }>
}

const STATUS_MAP: Record<number, string> = {
  1: 'Em Aberto',
  2: 'Recebido',
  3: 'Cancelado',
  9: 'Parcial',
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/login')

  const orgId = session.user.orgId as string
  const params = await searchParams

  const today    = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const from   = params.from   ? new Date(params.from)   : firstDay
  const to     = params.to     ? new Date(params.to)     : lastDay
  const status = params.status ? Number(params.status)   : undefined

  const [connected, receivables] = await Promise.all([
    adminPrisma.blingIntegration.findUnique({
      where:  { organization_id: orgId },
      select: { id: true },
    }),
    adminPrisma.accountReceivable.findMany({
      where: {
        organization_id: orgId,
        due_date: { gte: from, lte: to },
        ...(status ? { status } : {}),
      },
      orderBy: { due_date: 'asc' },
    }),
  ])

  const serialized = receivables.map(r => ({
    id:              r.id,
    bling_id:        r.bling_id,
    client_name:     r.client_name,
    client_cnpj:     r.client_cnpj,
    document_number: r.document_number,
    due_date:        r.due_date.toISOString(),
    value:           r.value.toString(),
    balance:         r.balance.toString(),
    status:          r.status,
    status_label:    STATUS_MAP[r.status] ?? String(r.status),
    category:        r.category,
    description:     r.description,
  }))

  const totalValue   = receivables.reduce((s, r) => s + Number(r.value),   0)
  const totalBalance = receivables.reduce((s, r) => s + Number(r.balance), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contas a Receber</h1>
        <p className="text-sm text-zinc-400">Importe e visualize contas a receber do Bling.</p>
      </div>

      <ReceivablesPanel
        blingConnected={!!connected}
        receivables={serialized}
        totalValue={totalValue}
        totalBalance={totalBalance}
        defaultFrom={from.toISOString().slice(0, 10)}
        defaultTo={to.toISOString().slice(0, 10)}
        defaultStatus={params.status ?? 'all'}
      />
    </div>
  )
}
