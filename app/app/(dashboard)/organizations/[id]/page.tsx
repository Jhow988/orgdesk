import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { TabNav } from '../_components/TabNav'
import { SubscriptionBadge } from '../_components/SubscriptionBadge'
import { DadosTab } from './_tabs/DadosTab'
import { AssinaturaTab } from './_tabs/AssinaturaTab'
import { UsuariosTab } from './_tabs/UsuariosTab'
import { UsoTab } from './_tabs/UsoTab'
import {
  updateOrganizationDadosAction,
  updateOrganizationAssinaturaAction,
} from '@/app/actions/organizations'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function OrganizationDetailPage({ params, searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { id } = await params
  const { tab = 'dados' } = await searchParams

  const org = await adminPrisma.organization.findUnique({ where: { id } })
  if (!org) notFound()

  const dadosAction = updateOrganizationDadosAction.bind(null, org.id)
  const assinaturaAction = updateOrganizationAssinaturaAction.bind(null, org.id)

  const [members, stats] = await Promise.all([
    tab === 'usuarios'
      ? adminPrisma.membership.findMany({
          where: { organization_id: id },
          include: { user: true },
          orderBy: { created_at: 'asc' },
        })
      : Promise.resolve([]),
    tab === 'uso'
      ? Promise.all([
          adminPrisma.client.count({ where: { organization_id: id } }),
          adminPrisma.boleto.groupBy({
            by: ['status'],
            where: { organization_id: id },
            _count: true,
          }),
          adminPrisma.ticket.groupBy({
            by: ['status'],
            where: { organization_id: id },
            _count: true,
          }),
          adminPrisma.invoice.count({ where: { organization_id: id } }),
          adminPrisma.campaign.count({ where: { organization_id: id } }),
          adminPrisma.activityLog.findFirst({
            where: { organization_id: id },
            orderBy: { created_at: 'desc' },
            select: { created_at: true },
          }),
        ])
      : Promise.resolve(null),
  ])

  let usageStats = null
  if (stats) {
    const [clients, boletoGroups, ticketGroups, invoices, campaigns, lastAct] = stats as any[]
    const boletoMap = Object.fromEntries(boletoGroups.map((g: any) => [g.status, g._count]))
    const ticketMap = Object.fromEntries(ticketGroups.map((g: any) => [g.status, g._count]))
    usageStats = {
      clients,
      boletos: {
        total: boletoGroups.reduce((s: number, g: any) => s + g._count, 0),
        paid: boletoMap.PAID ?? 0,
        overdue: boletoMap.OVERDUE ?? 0,
        pending: boletoMap.PENDING ?? 0,
      },
      tickets: {
        total: ticketGroups.reduce((s: number, g: any) => s + g._count, 0),
        open: (ticketMap.OPEN ?? 0) + (ticketMap.IN_PROGRESS ?? 0) + (ticketMap.WAITING_CLIENT ?? 0),
        resolved: (ticketMap.RESOLVED ?? 0) + (ticketMap.CLOSED ?? 0),
      },
      invoices,
      campaigns,
      lastActivity: lastAct?.created_at ?? null,
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/organizations" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
          ← Organizações
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-700">{org.name}</h1>
          <SubscriptionBadge status={org.subscription_status} />
          {!org.is_active && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">Inativa</span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          slug: <span className="font-mono">{org.slug}</span>
          {org.cnpj && <> · CNPJ: {org.cnpj}</>}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <Suspense fallback={null}>
          <TabNav orgId={org.id} />
        </Suspense>

        <div className="p-6">
          {tab === 'dados' && <DadosTab org={org as any} action={dadosAction} />}
          {tab === 'assinatura' && <AssinaturaTab org={org as any} action={assinaturaAction} />}
          {tab === 'usuarios' && <UsuariosTab members={members as any} />}
          {tab === 'uso' && usageStats && <UsoTab stats={usageStats} />}
          {tab === 'uso' && !usageStats && (
            <div className="py-12 text-center text-sm text-zinc-400">Carregando...</div>
          )}
        </div>
      </div>
    </div>
  )
}
