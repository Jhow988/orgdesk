import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { resolveOrganizationBySlug } from '@/lib/tenant'
import { tenantStorage } from '@/lib/prisma'
import { prisma } from '@/lib/prisma'

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
  const hdrs = await headers()
  const orgSlug = hdrs.get('x-org-slug')

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  let stats: Record<string, number> = {}
  let orgName = ''

  if (isSuperAdmin && !orgSlug) {
    stats = await getSuperAdminStats()
  } else if (orgSlug) {
    const org = await resolveOrganizationBySlug(orgSlug)
    if (org) {
      orgName = org.name
      stats = await getOrgStats(org.id)
    }
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

      {isSuperAdmin && !orgSlug ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Organizações ativas" value={stats.orgsCount ?? 0} />
          <StatCard label="Usuários ativos" value={stats.usersCount ?? 0} />
          <StatCard label="Chamados total" value={stats.ticketsCount ?? 0} />
          <StatCard label="Boletos total" value={stats.boletosCount ?? 0} />
        </div>
      ) : orgSlug ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Clientes" value={stats.clientsCount ?? 0} />
          <StatCard label="Boletos" value={stats.boletosCount ?? 0} />
          <StatCard label="Chamados abertos" value={stats.openTickets ?? 0} />
          <StatCard label="Chamados total" value={stats.ticketsCount ?? 0} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Nenhuma organização selecionada.</p>
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
