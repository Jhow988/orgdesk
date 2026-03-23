import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  OPEN:           { label: 'Aberto',          className: 'bg-blue-900/50 text-blue-400' },
  IN_PROGRESS:    { label: 'Em andamento',    className: 'bg-yellow-900/50 text-yellow-400' },
  WAITING_CLIENT: { label: 'Aguardando você', className: 'bg-violet-900/50 text-violet-400' },
  RESOLVED:       { label: 'Resolvido',       className: 'bg-emerald-900/50 text-emerald-400' },
  CLOSED:         { label: 'Fechado',         className: 'bg-zinc-800 text-zinc-500' },
}

export default async function PortalTicketsPage() {
  const session = await auth()
  if (!session?.user?.clientId) redirect('/login')

  const tickets = await prisma.ticket.findMany({
    where: { client_id: session.user.clientId },
    orderBy: { created_at: 'desc' },
  })

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-white">Meus Chamados</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Nº</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Aberto em</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Nenhum chamado encontrado.</td></tr>
            ) : tickets.map(t => {
              const cfg = STATUS_LABELS[t.status] ?? STATUS_LABELS.OPEN
              return (
                <tr key={t.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-500 text-xs">#{t.number}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    <Link href={`/portal/tickets/${t.id}`} className="hover:text-zinc-300 transition-colors">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 capitalize text-xs">{t.priority.toLowerCase()}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
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
