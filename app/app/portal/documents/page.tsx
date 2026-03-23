import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function PortalDocumentsPage() {
  const session = await auth()
  if (!session?.user?.clientId) redirect('/login')

  const clientId = session.user.clientId

  const [boletos, invoices] = await Promise.all([
    prisma.boleto.findMany({
      where: { client_id: clientId },
      orderBy: { due_date: 'desc' },
    }),
    prisma.invoice.findMany({
      where: { client_id: clientId },
      orderBy: { issue_date: 'desc' },
    }),
  ])

  const BOLETO_STATUS: Record<string, { label: string; className: string }> = {
    PENDING:   { label: 'Pendente',  className: 'bg-yellow-900/50 text-yellow-400' },
    PAID:      { label: 'Pago',      className: 'bg-emerald-900/50 text-emerald-400' },
    OVERDUE:   { label: 'Vencido',   className: 'bg-red-900/50 text-red-400' },
    CANCELLED: { label: 'Cancelado', className: 'bg-zinc-800 text-zinc-500' },
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-semibold text-white">Documentos</h1>
      </div>

      {/* Boletos */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">Boletos</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {boletos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">Nenhum boleto.</td></tr>
              ) : boletos.map(b => {
                const cfg = BOLETO_STATUS[b.status] ?? BOLETO_STATUS.PENDING
                return (
                  <tr key={b.id} className="border-b border-zinc-800 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{b.description ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-white">
                      {Number(b.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(b.due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {b.pdf_key && (
                        <a href={`/api/download/boleto/${b.id}`} target="_blank"
                          className="text-xs text-zinc-400 hover:text-white transition-colors">
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notas Fiscais */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-600">Notas Fiscais</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Emissão</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">Nenhuma nota fiscal.</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="border-b border-zinc-800 last:border-0">
                  <td className="px-4 py-3 font-mono text-zinc-400 text-xs">{inv.number ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{inv.type}</td>
                  <td className="px-4 py-3 font-mono text-white">
                    {Number(inv.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(inv.issue_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {inv.pdf_key && (
                      <a href={`/api/download/invoice/${inv.id}`} target="_blank"
                        className="text-xs text-zinc-400 hover:text-white transition-colors">
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
