import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Rascunho',    className: 'bg-zinc-100 text-zinc-600' },
  SENT:      { label: 'Enviado',     className: 'bg-blue-900/50 text-blue-400' },
  VIEWED:    { label: 'Visualizado', className: 'bg-yellow-900/50 text-yellow-400' },
  SIGNED:    { label: 'Assinado',    className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',    className: 'bg-zinc-100 text-zinc-500' },
  CANCELLED: { label: 'Cancelado',   className: 'bg-red-900/50 text-red-400' },
}

export default async function ContractsPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const contracts = await prisma.contract.findMany({
    where: { organization_id: session.user.orgId },
    include: { client: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-700">Contratos</h1>
          <p className="mt-1 text-sm text-zinc-400">{contracts.length} contrato{contracts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/comercial/contracts/new"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
          + Novo contrato
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Enviado em</th>
              <th className="px-4 py-3 font-medium">Assinado em</th>
              <th className="px-4 py-3 font-medium">Expira em</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-400">Nenhum contrato criado.</td></tr>
            ) : contracts.map(c => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.DRAFT
              const expiring = c.expires_at && new Date(c.expires_at) < new Date(Date.now() + 7 * 86400000) && c.status === 'SIGNED'
              return (
                <tr key={c.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{c.title}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.client.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {c.signed_at ? new Date(c.signed_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-xs ${expiring ? 'text-yellow-400' : 'text-zinc-400'}`}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/comercial/contracts/${c.id}`} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">
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
