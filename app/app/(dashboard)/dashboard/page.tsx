import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { tenantStorage, prisma } from '@/lib/prisma'

async function getSuperAdminStats() {
  const [orgsCount, usersCount, ticketsCount, boletosCount] = await Promise.all([
    adminPrisma.organization.count({ where: { is_active: true } }),
    adminPrisma.user.count({ where: { is_active: true } }),
    adminPrisma.ticket.count(),
    adminPrisma.boleto.count(),
  ])
  return { orgsCount, usersCount, ticketsCount, boletosCount }
}

async function getOrgStats(orgId: string) {
  return tenantStorage.run({ orgId }, async () => {
    const [clientsCount, boletosCount, ticketsCount, openTickets] = await Promise.all([
      prisma.client.count(),
      prisma.boleto.count(),
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ])
    return { clientsCount, boletosCount, ticketsCount, openTickets }
  })
}

export default async function DashboardPage() {
  const session = await auth()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const orgId = session?.user?.orgId ?? null

  let stats: Record<string, number> = {}
  let orgName = ''

  if (isSuperAdmin) {
    stats = await getSuperAdminStats()
  } else if (orgId) {
    const org = await adminPrisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })
    orgName = org?.name ?? ''
    stats = await getOrgStats(orgId)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">
          {orgName ? `Dashboard — ${orgName}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Bem-vindo de volta, {session?.user?.name}
        </p>
      </div>

      {isSuperAdmin ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Organizações ativas" value={stats.orgsCount ?? 0} />
          <StatCard label="Usuários ativos" value={stats.usersCount ?? 0} />
          <StatCard label="Chamados total" value={stats.ticketsCount ?? 0} />
          <StatCard label="Boletos total" value={stats.boletosCount ?? 0} />
        </div>
      ) : orgId ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Clientes" value={stats.clientsCount ?? 0} />
          <StatCard label="Boletos" value={stats.boletosCount ?? 0} />
          <StatCard label="Chamados abertos" value={stats.openTickets ?? 0} />
          <StatCard label="Chamados total" value={stats.ticketsCount ?? 0} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Nenhuma organização associada à sua conta.</p>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value.toLocaleString('pt-BR')}</p>
    </div>
  )
}
