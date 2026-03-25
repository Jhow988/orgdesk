import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Globe, Clock, MailOpen } from 'lucide-react'

function fmtDate(d: Date | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(d)
}

function fmt(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export default async function RastreamentoPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId = session.user.orgId
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Fetch all campaign sends with email tracking
  const sends = await prisma.campaignSend.findMany({
    where: {
      campaign: { organization_id: orgId },
      status: { in: ['SENT', 'SIMULATED'] },
    },
    orderBy: { sent_at: 'desc' },
    include: {
      campaign: { select: { id: true, label: true, month_year: true } },
    },
  })

  // Collect unique CNPJs to look up client portal access
  const cnpjs = [...new Set(sends.map(s => s.client_cnpj))]
  const clients = await prisma.client.findMany({
    where: { organization_id: orgId, cnpj: { in: cnpjs } },
    select: { cnpj: true, name: true, last_portal_access: true, portal_token: true } as any,
  })
  const clientMap = new Map((clients as any[]).map((c: any) => [c.cnpj.replace(/\D/g, ''), c]))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Rastreamento</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acompanhe abertura de e-mails e acessos ao portal do cliente.
        </p>
      </div>

      {sends.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-500">Nenhum envio registrado ainda.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Campanha
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="inline-flex items-center gap-1"><MailOpen size={11} /> E-mail</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> Abertura</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="inline-flex items-center gap-1"><Globe size={11} /> Último acesso portal</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Link portal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sends.map(send => {
                const cnpjDigits     = send.client_cnpj.replace(/\D/g, '')
                const client: any    = clientMap.get(cnpjDigits)
                const portalUrl  = client?.portal_token
                  ? `${baseUrl}/c/${client.portal_token}`
                  : null

                return (
                  <tr key={send.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-zinc-200 font-medium">{send.client_name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{fmt(send.client_cnpj)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-300">{send.campaign.label}</p>
                      <p className="text-xs text-zinc-600">{send.campaign.month_year}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {send.open_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <MailOpen size={10} />
                          {send.open_count}×
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {fmtDate(send.opened_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {client?.last_portal_access ? (
                        <span className="inline-flex items-center gap-1 text-indigo-400">
                          <Globe size={10} />
                          {fmtDate(client.last_portal_access)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {portalUrl ? (
                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                        >
                          Abrir portal
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
