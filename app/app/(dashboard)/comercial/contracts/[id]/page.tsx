import { auth } from '@/auth'
import { adminPrisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { sendContractAction, cancelContractAction } from '@/app/actions/contracts'
import { LabelSelector } from '../../_components/LabelSelector'
import { FileCheck } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Rascunho',    className: 'bg-white/[0.08] text-zinc-400' },
  SENT:      { label: 'Enviado',     className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:    { label: 'Visualizado', className: 'bg-yellow-900/50 text-yellow-400' },
  SIGNED:    { label: 'Assinado',    className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',    className: 'bg-white/[0.08] text-zinc-500' },
  CANCELLED: { label: 'Cancelado',   className: 'bg-red-900/50 text-red-400' },
}

const PROPOSAL_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: 'Rascunho',  className: 'bg-white/[0.08] text-zinc-400' },
  SENT:     { label: 'Enviada',   className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:   { label: 'Visualizada', className: 'bg-yellow-900/50 text-yellow-400' },
  ACCEPTED: { label: 'Aceita',    className: 'bg-emerald-900/50 text-emerald-400' },
  REJECTED: { label: 'Recusada', className: 'bg-red-900/50 text-red-400' },
  EXPIRED:  { label: 'Expirada', className: 'bg-white/[0.08] text-zinc-500' },
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props { params: Promise<{ id: string }> }

export default async function ContractDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params

  const [contract, allLabels] = await Promise.all([
    adminPrisma.contract.findFirst({
      where: { id, organization_id: session.user.orgId },
      include: {
        client:    { select: { name: true, cnpj: true, email: true } },
        proposal:  { select: { title: true, number: true } },
        proposals: {
          orderBy: { created_at: 'desc' },
          select: {
            id: true, number: true, title: true, status: true,
            total: true, total_monthly: true, total_onetime: true,
            accepted_at: true, created_at: true,
          },
        },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      },
    }),
    adminPrisma.salesLabel.findMany({
      where:   { organization_id: session.user.orgId },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!contract) notFound()

  const cfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.DRAFT
  const portalLink = contract.sign_token
    ? `${process.env.NEXTAUTH_URL ?? ''}/portal/contracts/${contract.sign_token}`
    : null

  const currentLabels = contract.labels.map(cl => cl.label)

  return (
    <div className="p-6">
      <div className="mb-1">
        <Link href="/comercial/contracts" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Contratos
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-4">

        {/* ── Main column ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-zinc-100">{contract.title}</h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {contract.client.name}
              {contract.proposal && <> · Proposta #{String(contract.proposal.number).padStart(4, '0')}</>}
              {contract.expires_at && <> · Expira em {new Date(contract.expires_at).toLocaleDateString('pt-BR')}</>}
            </p>
            <div className="mt-3">
              <LabelSelector
                entityType="contract"
                entityId={id}
                allLabels={allLabels}
                currentLabels={currentLabels}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {contract.status === 'DRAFT' && (
              <form action={async () => { 'use server'; await sendContractAction(id) }}>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
                  Enviar para assinatura
                </button>
              </form>
            )}
            {['DRAFT', 'SENT', 'VIEWED'].includes(contract.status) && (
              <form action={async () => { 'use server'; await cancelContractAction(id) }}>
                <button type="submit" className="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
                  Cancelar
                </button>
              </form>
            )}
          </div>

          {/* Sign link */}
          {portalLink && contract.status !== 'SIGNED' && contract.status !== 'CANCELLED' && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Link de assinatura</p>
              <p className="break-all font-mono text-xs text-zinc-400">{portalLink}</p>
            </div>
          )}

          {/* Dates grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Criado',      value: contract.created_at },
              { label: 'Enviado',     value: contract.sent_at    },
              { label: 'Visualizado', value: contract.viewed_at  },
              { label: 'Assinado',    value: contract.signed_at  },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-1 text-sm text-zinc-100">
                  {value ? new Date(value).toLocaleDateString('pt-BR') : <span className="text-zinc-600">—</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Content */}
          {contract.content && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Conteúdo</p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-relaxed">{contract.content}</pre>
            </div>
          )}
        </div>

        {/* ── Proposals panel ── */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Propostas vinculadas</h2>
            <span className="text-xs text-zinc-500">
              {contract.proposals.length === 0 ? 'Nenhuma' : `${contract.proposals.length} proposta${contract.proposals.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {contract.proposals.length === 0 ? (
            <div className="py-8 text-center">
              <FileCheck size={22} className="mx-auto mb-2 text-zinc-700" />
              <p className="text-sm text-zinc-600">Nenhuma proposta vinculada.</p>
              <p className="text-xs text-zinc-700 mt-1">Ao aceitar uma proposta do cliente, ela aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contract.proposals.map((p: any) => {
                const pCfg = PROPOSAL_STATUS[p.status] ?? PROPOSAL_STATUS.DRAFT
                const monthly = Number(p.total_monthly)
                const onetime = Number(p.total_onetime)
                return (
                  <Link key={p.id} href={`/comercial/proposals/${p.id}`}
                    className="block rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500 mb-0.5">#{String(p.number).padStart(4, '0')}</p>
                        <p className="text-sm font-medium text-zinc-200 truncate">{p.title}</p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${pCfg.className}`}>
                        {pCfg.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                      {monthly > 0 && (
                        <span className="text-xs text-indigo-400">{fmt(monthly)}/mês</span>
                      )}
                      {onetime > 0 && (
                        <span className="text-xs text-sky-400">{fmt(onetime)} avulso</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {p.accepted_at
                        ? `Aceita em ${new Date(p.accepted_at).toLocaleDateString('pt-BR')}`
                        : `Criada em ${new Date(p.created_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <Link href={`/comercial/proposals/new?client_id=${contract.client_id}`}
              className="block w-full text-center rounded-md border border-white/[0.1] px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors">
              + Nova proposta para este cliente
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
