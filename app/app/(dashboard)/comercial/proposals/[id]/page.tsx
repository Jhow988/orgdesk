import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { updateProposalStatusAction, sendProposalEmailAction } from '@/app/actions/proposals'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: 'Rascunho',    className: 'bg-white/[0.08] text-zinc-400' },
  SENT:     { label: 'Enviada',     className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:   { label: 'Visualizada', className: 'bg-yellow-900/50 text-yellow-400' },
  ACCEPTED: { label: 'Aceita',      className: 'bg-emerald-900/50 text-emerald-400' },
  REJECTED: { label: 'Recusada',    className: 'bg-red-900/50 text-red-400' },
  EXPIRED:  { label: 'Expirada',    className: 'bg-white/[0.08] text-zinc-500' },
}

const ITEM_TYPE_CONFIG: Record<string, { label: string; textColor: string }> = {
  MONTHLY_SERVICE:    { label: 'Serviços Mensais',      textColor: 'text-indigo-400' },
  ONETIME_SERVICE:    { label: 'Serviços Avulsos',       textColor: 'text-sky-400' },
  EQUIPMENT_RENTAL:   { label: 'Equipamentos Alugados',  textColor: 'text-amber-400' },
  EQUIPMENT_PURCHASE: { label: 'Equipamentos Comprados', textColor: 'text-emerald-400' },
}

const ITEM_TYPE_ORDER = ['MONTHLY_SERVICE', 'ONETIME_SERVICE', 'EQUIPMENT_RENTAL', 'EQUIPMENT_PURCHASE']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props { params: Promise<{ id: string }> }

export default async function ProposalDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const proposal = await prisma.proposal.findFirst({
    where: { id, organization_id: session.user.orgId },
    include: {
      client: { select: { name: true, cnpj: true, email: true } },
      items:  { orderBy: { sort_order: 'asc' } },
    },
  })
  if (!proposal) notFound()

  const cfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.DRAFT
  const isEditable = proposal.status === 'DRAFT'

  const grouped = ITEM_TYPE_ORDER.map(type => ({
    type,
    cfg: ITEM_TYPE_CONFIG[type],
    items: proposal.items.filter(i => (i as any).item_type === type),
  })).filter(g => g.items.length > 0)

  const monthly = proposal.items
    .filter(i => (i as any).item_type === 'MONTHLY_SERVICE')
    .reduce((s, i) => s + Number(i.total), 0)
  const onetime = proposal.items
    .filter(i => (i as any).item_type !== 'MONTHLY_SERVICE')
    .reduce((s, i) => s + Number(i.total), 0)

  const freight  = Number((proposal as any).freight ?? 0)
  const discount = Number(proposal.discount)

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/comercial/proposals" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          ← Propostas
        </Link>
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-100">{proposal.title}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
          </div>
          {isEditable && (
            <Link href={`/comercial/proposals/${id}/edit`}
              className="rounded-md border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] transition-colors">
              Editar
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          #{String(proposal.number).padStart(4, '0')} · {proposal.client.name}
          {proposal.valid_until && <> · Válida até {new Date(proposal.valid_until).toLocaleDateString('pt-BR')}</>}
          {(proposal as any).payment_method && <> · {(proposal as any).payment_method}</>}
        </p>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {/* Email */}
        {(proposal.status === 'DRAFT' || proposal.status === 'SENT') && proposal.client.email && (
          <form action={async () => { 'use server'; await sendProposalEmailAction(id) }}>
            <button type="submit"
              className="rounded-md border border-blue-700/60 bg-blue-900/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-900/40 transition-colors">
              Enviar por e-mail
            </button>
          </form>
        )}

        {/* Draft → Sent (manual, sem email) */}
        {proposal.status === 'DRAFT' && (
          <form action={async () => { 'use server'; await updateProposalStatusAction(id, 'SENT') }}>
            <button type="submit"
              className="rounded-md border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.08] transition-colors">
              Marcar como Enviada
            </button>
          </form>
        )}

        {/* Accept → redirect to contract */}
        {(proposal.status === 'SENT' || proposal.status === 'VIEWED') && (
          <>
            <form action={async () => {
              'use server'
              await updateProposalStatusAction(id, 'ACCEPTED')
              redirect(`/comercial/contracts/new?proposal_id=${id}`)
            }}>
              <button type="submit"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                Proposta Aceita → Gerar Contrato
              </button>
            </form>
            <form action={async () => { 'use server'; await updateProposalStatusAction(id, 'REJECTED') }}>
              <button type="submit"
                className="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
                Recusar
              </button>
            </form>
          </>
        )}

        {/* Already accepted: go to contract */}
        {proposal.status === 'ACCEPTED' && (
          <Link href={`/comercial/contracts/new?proposal_id=${id}`}
            className="rounded-md bg-white/[0.06] border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors">
            Gerar contrato
          </Link>
        )}
      </div>

      {/* Items grouped by type */}
      <div className="space-y-4 mb-6">
        {grouped.map(group => (
          <div key={group.type} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
              <p className={`text-xs font-semibold uppercase tracking-wider ${group.cfg.textColor}`}>{group.cfg.label}</p>
            </div>
            <table className="w-full text-sm bg-transparent">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
                  <th className="px-4 py-2 font-medium">Descrição</th>
                  <th className="px-4 py-2 font-medium text-right">Qtd</th>
                  <th className="px-4 py-2 font-medium text-right">Preço unit.</th>
                  <th className="px-4 py-2 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map(item => (
                  <tr key={item.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-2.5 text-zinc-200">
                      {item.description}
                      <span className="ml-2 text-xs text-zinc-500">{item.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{Number(item.quantity)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{fmt(Number(item.unit_price))}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-100">{fmt(Number(item.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <dl className="space-y-1.5 text-sm w-72">
          {monthly > 0 && (
            <div className="flex justify-between">
              <dt className="text-indigo-400">Total Mensal (serviços)</dt>
              <dd className="font-mono text-indigo-300">{fmt(monthly)}</dd>
            </div>
          )}
          {onetime > 0 && (
            <div className="flex justify-between">
              <dt className="text-sky-400">Total Avulso + Equipamentos</dt>
              <dd className="font-mono text-sky-300">{fmt(onetime)}</dd>
            </div>
          )}
          {freight > 0 && (
            <div className="flex justify-between">
              <dt className="text-zinc-400">Frete</dt>
              <dd className="font-mono text-zinc-300">{fmt(freight)}</dd>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-zinc-400">Desconto</dt>
              <dd className="font-mono text-red-400">-{fmt(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-white/[0.08] pt-2">
            <dt className="font-semibold text-zinc-300">Total Geral</dt>
            <dd className="font-mono font-bold text-zinc-100">{fmt(Number(proposal.total))}</dd>
          </div>
        </dl>
      </div>

      {proposal.notes && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Observações</p>
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">{proposal.notes}</p>
        </div>
      )}
    </div>
  )
}
