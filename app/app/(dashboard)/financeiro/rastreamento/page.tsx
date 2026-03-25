import { auth } from '@/auth'
import { adminPrisma as prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { RastreamentoTable } from './_components/RastreamentoTable'

function fmtDate(d: Date | null) {
  if (!d) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(d)
}

function fmt(cnpj: string) {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export default async function RastreamentoPage() {
  const session = await auth()
  if (!session?.user?.orgId) redirect('/dashboard')

  const orgId  = session.user.orgId
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // Fetch ALL sends (all statuses) for this org
  const sends = await prisma.campaignSend.findMany({
    where:   { campaign: { organization_id: orgId } },
    orderBy: { created_at: 'desc' },
    include: { campaign: { select: { id: true, label: true, month_year: true } } },
  })

  // Collect unique CNPJs to look up client portal tokens
  const cnpjs = [...new Set(sends.map(s => s.client_cnpj))]
  const clients = await prisma.client.findMany({
    where:  { organization_id: orgId, cnpj: { in: cnpjs } },
    select: { cnpj: true, name: true, last_portal_access: true, portal_token: true } as any,
  })
  const clientMap = new Map((clients as any[]).map((c: any) => [c.cnpj.replace(/\D/g, ''), c]))

  const rows = sends.map(s => {
    const cnpjDigits    = s.client_cnpj.replace(/\D/g, '')
    const client: any   = clientMap.get(cnpjDigits)
    const portalToken   = client?.portal_token as string | undefined
    const portalUrl     = portalToken ? `${baseUrl}/c/${portalToken}` : null
    const portalAccess  = client?.last_portal_access as Date | null | undefined

    return {
      id:             s.id,
      clientName:     s.client_name,
      clientCnpj:     fmt(s.client_cnpj),
      campaignLabel:  s.campaign.label,
      campaignMonth:  s.campaign.month_year,
      status:         s.status as string,
      sentAt:         s.sent_at ? fmtDate(s.sent_at) : null,
      openCount:      s.open_count,
      openedAt:       fmtDate(s.opened_at ?? null),
      portalAccess:   fmtDate(portalAccess ?? null),
      portalUrl,
    }
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Rastreamento</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acompanhe abertura de e-mails e acessos ao portal do cliente.
        </p>
      </div>

      <RastreamentoTable rows={rows} />
    </div>
  )
}
