import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { updateProposalStatusAction } from '@/app/actions/proposals'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: 'Rascunho',    className: 'bg-zinc-800 text-zinc-400' },
  SENT:     { label: 'Enviada',     className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:   { label: 'Visualizada', className: 'bg-yellow-900/50 text-yellow-400' },
  ACCEPTED: { label: 'Aceita',      className: 'bg-emerald-900/50 text-emerald-400' },
  REJECTED: { label: 'Recusada',    className: 'bg-red-900/50 text-red-400' },
  EXPIRED:  { label: 'Expirada',    className: 'bg-zinc-800 text-zinc-500' },
}

interface Props { params: Promise<{ id: string }> }

export default async function ProposalDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const { id } = await params
  const proposal = await prisma.proposal.findFirst({
    where: { id, organization_id: session.user.orgId },
    include: {
      client: { select: { name: true, cnpj: true, email: true } },
      items: { orderBy: { sort_order: 'asc' } },
    },
  })
  if (!proposal) notFound()

  const cfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.DRAFT

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/comercial/proposals" className="text-xs text-zinc-500 hover:text-white transition-colors">
          ← Propostas
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">{proposal.title}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          #{String(proposal.number).padStart(4, '0')} · {proposal.client.name}
          {proposal.valid_until && <> · Válida até {new Date(proposal.valid_until).toLocaleDateString('pt-BR')}</>}
        </p>
      </div>

      {/* Ações de status */}
      <div className="mb-6 flex flex-wrap gap-2">
        {proposal.status === 'DRAFT' && (
          <form action={async () => { 'use server'; await updateProposalStatusAction(id, 'SENT') }}>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
              Marcar como Enviada
            </button>
          </form>
        )}
        {(proposal.status === 'SENT' || proposal.status === 'VIEWED') && (
          <>
            <form action={async () => { 'use server'; await updateProposalStatusAction(id, 'ACCEPTED') }}>
              <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                Marcar como Aceita
              </button>
            </form>
            <form action={async () => { 'use server'; await updateProposalStatusAction(id, 'REJECTED') }}>
              <button type="submit" className="rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
                Marcar como Recusada
              </button>
            </form>
          </>
        )}
        {proposal.status === 'ACCEPTED' && (
          <Link href={`/comercial/contracts/new?proposal_id=${proposal.id}`}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
            Gerar contrato
          </Link>
        )}
      </div>

      {/* Itens */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium text-right">Qtd</th>
              <th className="px-4 py-3 font-medium text-right">Preço unit.</th>
              <th className="px-4 py-3 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {proposal.items.map(item => (
              <tr key={item.id} className="border-b border-zinc-800 last:border-0">
                <td className="px-4 py-3 text-white">
                  {item.description}
                  <span className="ml-2 text-xs text-zinc-600">{item.unit}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-400">{Number(item.quantity)}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-400">
                  {Number(item.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {Number(item.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <dl className="space-y-1 text-sm w-64">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Subtotal</dt>
            <dd className="font-mono text-zinc-300">
              {(Number(proposal.total) + Number(proposal.discount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </dd>
          </div>
          {Number(proposal.discount) > 0 && (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Desconto</dt>
              <dd className="font-mono text-red-400">
                -{Number(proposal.discount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-800 pt-2">
            <dt className="font-semibold text-zinc-300">Total</dt>
            <dd className="font-mono font-bold text-white">
              {Number(proposal.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </dd>
          </div>
        </dl>
      </div>

      {proposal.notes && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Observações</p>
          <p className="text-sm text-zinc-400 whitespace-pre-wrap">{proposal.notes}</p>
        </div>
      )}
    </div>
  )
}
