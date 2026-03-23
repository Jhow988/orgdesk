import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:    { label: 'Rascunho',    className: 'bg-white/[0.08] text-zinc-400' },
  SENT:     { label: 'Enviada',     className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:   { label: 'Visualizada', className: 'bg-yellow-900/50 text-yellow-400' },
  ACCEPTED: { label: 'Aceita',      className: 'bg-emerald-900/50 text-emerald-400' },
  REJECTED: { label: 'Recusada',    className: 'bg-red-900/50 text-red-400' },
  EXPIRED:  { label: 'Expirada',    className: 'bg-white/[0.08] text-zinc-500' },
}

export default async function ProposalsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const proposals = await prisma.proposal.findMany({
    where: { organization_id: session.user.orgId },
    include: { client: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Propostas</h1>
          <p className="mt-1 text-sm text-zinc-500">{proposals.length} proposta{proposals.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/comercial/proposals/new"
          className="rounded-md bg-white/[0.06] border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 transition-colors">
          + Nova proposta
        </Link>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <table className="w-full text-sm bg-transparent">
          <thead>
            <tr className="border-b border-white/[0.08] text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Nº</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Validade</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Nenhuma proposta criada.</td></tr>
            ) : proposals.map(p => {
              const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT
              const expired = p.valid_until && new Date(p.valid_until) < new Date() && p.status === 'SENT'
              return (
                <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-500 text-xs">#{String(p.number).padStart(4, '0')}</td>
                  <td className="px-4 py-3 font-medium text-zinc-100">{p.title}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.client.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {Number(p.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className={`px-4 py-3 text-xs ${expired ? 'text-red-400' : 'text-zinc-500'}`}>
                    {p.valid_until ? new Date(p.valid_until).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/comercial/proposals/${p.id}`} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                      Ver
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
