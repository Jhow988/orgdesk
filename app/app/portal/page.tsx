import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PortalHomePage() {
  const session = await auth()
  if (!session?.user?.clientId) redirect('/login')

  const clientId = session.user.clientId

  const [tickets, boletos, invoices, pix, contracts] = await Promise.all([
    prisma.ticket.count({ where: { client_id: clientId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] } } }),
    prisma.boleto.count({ where: { client_id: clientId, status: 'PENDING' } }),
    prisma.invoice.count({ where: { client_id: clientId, status: 'ISSUED' } }),
    prisma.pixCharge.count({ where: { client_id: clientId, status: 'PENDING' } }),
    prisma.contract.count({ where: { client_id: clientId, status: { in: ['SENT', 'VIEWED'] } } }),
  ])

  const cards = [
    { label: 'Chamados abertos', value: tickets, href: '/portal/tickets', color: 'text-blue-400' },
    { label: 'Boletos pendentes', value: boletos, href: '/portal/documents', color: 'text-yellow-400' },
    { label: 'Notas fiscais', value: invoices, href: '/portal/documents', color: 'text-zinc-300' },
    { label: 'Cobranças PIX', value: pix, href: '/portal/pix', color: 'text-emerald-400' },
    { label: 'Contratos p/ assinar', value: contracts, href: '/portal/contracts', color: 'text-violet-400' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Bem-vindo, {session.user.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Resumo da sua conta</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <Link key={card.label} href={card.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
