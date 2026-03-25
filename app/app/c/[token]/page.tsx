import { notFound } from 'next/navigation'
import { adminPrisma } from '@/lib/prisma'
import { FileText, Download } from 'lucide-react'

function fmt(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminPrisma as any

  const client = await db.client.findUnique({
    where: { portal_token: token },
    select: { id: true, name: true, cnpj: true, organization_id: true },
  }) as { id: string; name: string; cnpj: string; organization_id: string } | null

  if (!client) return notFound()

  // Record access in background (fire-and-forget)
  db.client.update({
    where: { portal_token: token },
    data:  { last_portal_access: new Date() },
  }).catch(() => null)

  // Fetch all campaign sends for this client
  const sends = await adminPrisma.campaignSend.findMany({
    where: { client_cnpj: client.cnpj },
    orderBy: { created_at: 'desc' },
    include: {
      campaign: {
        select: { id: true, label: true, month_year: true },
      },
    },
  })

  // Only show sends that have at least one page
  const visibleSends = sends.filter(s => s.nf_pages.length > 0 || s.boleto_pages.length > 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">{client.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">CNPJ {fmt(client.cnpj)}</p>
      </div>

      {visibleSends.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-sm text-zinc-500">Nenhum documento disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSends.map(send => (
            <div
              key={send.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{send.campaign.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{send.campaign.month_year}</p>
                {send.sent_at && (
                  <p className="mt-0.5 text-xs text-zinc-600">
                    Enviado em {fmtDate(send.sent_at)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {send.nf_pages.length > 0 && (
                  <a
                    href={`/api/c/${token}/pdf?campaignId=${send.campaign.id}&type=nf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <FileText size={12} />
                    NFS ({send.nf_pages.length} pág.)
                    <Download size={11} className="ml-0.5 opacity-60" />
                  </a>
                )}
                {send.boleto_pages.length > 0 && (
                  <a
                    href={`/api/c/${token}/pdf?campaignId=${send.campaign.id}&type=boleto`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                  >
                    <FileText size={12} />
                    Boleto
                    <Download size={11} className="ml-0.5 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
