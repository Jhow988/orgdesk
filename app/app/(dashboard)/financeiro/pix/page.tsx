import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Pendente',   className: 'bg-yellow-900/50 text-yellow-400' },
  PAID:      { label: 'Pago',       className: 'bg-emerald-900/50 text-emerald-400' },
  EXPIRED:   { label: 'Expirado',   className: 'bg-zinc-100 text-zinc-500' },
  CANCELLED: { label: 'Cancelado',  className: 'bg-red-900/50 text-red-400' },
}

export default async function PixPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const charges = await prisma.pixCharge.findMany({
    where: { organization_id: session.user.orgId },
    include: { client: { select: { name: true } } },
    orderBy: { created_at: 'desc' },
  })

  const totals = {
    pending: charges.filter(c => c.status === 'PENDING').reduce((s, c) => s + Number(c.amount), 0),
    paid: charges.filter(c => c.status === 'PAID').reduce((s, c) => s + Number(c.amount), 0),
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-700">Cobranças PIX</h1>
          <p className="mt-1 text-sm text-zinc-400">{charges.length} cobrança{charges.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/financeiro/pix/new"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors">
          + Nova cobrança
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">A receber</p>
          <p className="mt-2 text-2xl font-bold text-yellow-400">
            {totals.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-100/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recebido</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {totals.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-400">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expira em</th>
              <th className="px-4 py-3 font-medium">Pago em</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {charges.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-400">Nenhuma cobrança criada.</td></tr>
            ) : charges.map(c => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.PENDING
              return (
                <tr key={c.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-zinc-500">{c.client.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{c.description}</td>
                  <td className="px-4 py-3 font-mono text-zinc-900">
                    {Number(c.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/financeiro/pix/${c.id}`} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">Ver</Link>
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
